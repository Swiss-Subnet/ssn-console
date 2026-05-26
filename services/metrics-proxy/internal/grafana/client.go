package grafana

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// Point is a single (timestamp, value) sample from a Prometheus query_range
// response. TS is unix milliseconds (what the frontend's Date constructor
// expects); values are kept as float64, matching Prometheus native -- the
// syncer's bigint counters are downcast on emit, so anything we read back
// is already a float.
type Point struct {
	TS    int64   `json:"ts"`
	Value float64 `json:"value"`
}

type QueryRangeRequest struct {
	// Query is passed through unparsed: the caller must build it safely.
	Query string
	Start time.Time
	End   time.Time
	Step  time.Duration
}

// Querier is the seam between the HTTP handler and Grafana Cloud. The
// production implementation is HTTPClient; tests use the in-memory Fake.
type Querier interface {
	QueryRange(ctx context.Context, req QueryRangeRequest) ([]Point, error)
}

type HTTPClient struct {
	BaseURL  string
	Username string
	Password string
	HTTP     *http.Client
}

func NewHTTPClient(baseURL, username, password string) *HTTPClient {
	return &HTTPClient{
		BaseURL:  baseURL,
		Username: username,
		Password: password,
		HTTP:     &http.Client{Timeout: 15 * time.Second},
	}
}

// promQueryRangeResponse is the subset of the Prometheus query_range
// response we care about. Only "matrix" result types are expected here.
type promQueryRangeResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			// Values is an array of [unix_seconds, string_value] pairs.
			Values [][2]json.RawMessage `json:"values"`
		} `json:"result"`
	} `json:"data"`
	ErrorType string `json:"errorType,omitempty"`
	Error     string `json:"error,omitempty"`
}

func (c *HTTPClient) QueryRange(ctx context.Context, req QueryRangeRequest) ([]Point, error) {
	if c.BaseURL == "" {
		return nil, fmt.Errorf("grafana: base URL not configured")
	}
	q := url.Values{}
	q.Set("query", req.Query)
	q.Set("start", strconv.FormatInt(req.Start.Unix(), 10))
	q.Set("end", strconv.FormatInt(req.End.Unix(), 10))
	q.Set("step", strconv.FormatInt(int64(req.Step.Seconds()), 10)+"s")

	fullURL := c.BaseURL + "/api/v1/query_range?" + q.Encode()
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("grafana: build request: %w", err)
	}
	httpReq.SetBasicAuth(c.Username, c.Password)
	httpReq.Header.Set("Accept", "application/json")

	resp, err := c.HTTP.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("grafana: do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("grafana: upstream status %d", resp.StatusCode)
	}

	var decoded promQueryRangeResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, fmt.Errorf("grafana: decode response: %w", err)
	}
	if decoded.Status != "success" {
		return nil, fmt.Errorf("grafana: query failed: %s: %s", decoded.ErrorType, decoded.Error)
	}
	if decoded.Data.ResultType != "matrix" {
		return nil, fmt.Errorf("grafana: unexpected result type %q", decoded.Data.ResultType)
	}
	// The proxy issues queries that produce at most one series (the label
	// selector pins canister_id). Flatten whatever we get.
	var points []Point
	for _, series := range decoded.Data.Result {
		for _, pair := range series.Values {
			var ts float64
			var val string
			if err := json.Unmarshal(pair[0], &ts); err != nil {
				return nil, fmt.Errorf("grafana: decode timestamp: %w", err)
			}
			if err := json.Unmarshal(pair[1], &val); err != nil {
				return nil, fmt.Errorf("grafana: decode value: %w", err)
			}
			parsed, err := strconv.ParseFloat(val, 64)
			if err != nil {
				return nil, fmt.Errorf("grafana: parse value %q: %w", val, err)
			}
			points = append(points, Point{
				TS:    int64(ts * 1000),
				Value: parsed,
			})
		}
	}
	return points, nil
}
