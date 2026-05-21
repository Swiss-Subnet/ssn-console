// Package payrexx is a thin client for the Payrexx REST API.
//
// Payrexx auth is unusual: every request carries an ApiSignature computed
// as base64(HMAC_SHA256(payload, api_secret)). For POST/PUT, payload is the
// url-encoded form body; for GET/DELETE with no body, payload is the empty
// string. The signature is appended as a form field (POST/PUT) or query
// param (GET/DELETE) named ApiSignature. See:
// https://developers.payrexx.com/reference/authentication
package payrexx

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL      string
	instanceName string
	apiSecret    string
	httpClient   *http.Client
}

func NewClient(baseURL, instanceName, apiSecret string) *Client {
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		instanceName: instanceName,
		apiSecret:    apiSecret,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

// Do issues a signed request to {baseURL}/{path} with the given form body.
// path must start with a slash, e.g. "/SignatureCheck/". Body may be nil
// for requests with no payload.
func (c *Client) Do(ctx context.Context, method, path string, body url.Values) ([]byte, int, error) {
	if body == nil {
		body = url.Values{}
	}
	// A caller-supplied ApiSignature would be signed-into the POST payload
	// or land twice in the GET query.
	body.Del("ApiSignature")

	endpoint, err := url.Parse(c.baseURL + path)
	if err != nil {
		return nil, 0, fmt.Errorf("payrexx: invalid url: %w", err)
	}

	q := endpoint.Query()
	q.Set("instance", c.instanceName)
	endpoint.RawQuery = q.Encode()

	var (
		req     *http.Request
		payload string
	)
	switch method {
	case http.MethodGet, http.MethodDelete:
		// Sign the empty string, then append ApiSignature as a query param.
		// Form values, if any, are also sent as query params.
		sig := sign("", c.apiSecret)
		mq := endpoint.Query()
		for k, vs := range body {
			for _, v := range vs {
				mq.Add(k, v)
			}
		}
		mq.Set("ApiSignature", sig)
		endpoint.RawQuery = mq.Encode()

		req, err = http.NewRequestWithContext(ctx, method, endpoint.String(), nil)
		if err != nil {
			return nil, 0, fmt.Errorf("payrexx: build request: %w", err)
		}
	default:
		payload = body.Encode()
		sig := sign(payload, c.apiSecret)
		signed := payload
		if signed != "" {
			signed += "&"
		}
		signed += "ApiSignature=" + url.QueryEscape(sig)

		req, err = http.NewRequestWithContext(ctx, method, endpoint.String(), strings.NewReader(signed))
		if err != nil {
			return nil, 0, fmt.Errorf("payrexx: build request: %w", err)
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("payrexx: http: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("payrexx: read body: %w", err)
	}
	return respBody, resp.StatusCode, nil
}

// SignatureCheck calls GET /SignatureCheck/ which returns 200 if the
// signature is valid. Useful as a smoke test for instance + secret config.
func (c *Client) SignatureCheck(ctx context.Context) (int, error) {
	_, status, err := c.Do(ctx, http.MethodGet, "/SignatureCheck/", nil)
	return status, err
}

func sign(payload, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}
