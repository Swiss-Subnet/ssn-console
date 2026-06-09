package grafana

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHTTPClient_QueryRange_ParsesMatrix(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/query_range" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if u, p, ok := r.BasicAuth(); !ok || u != "user" || p != "pass" {
			t.Fatalf("missing or wrong basic auth: u=%q p=%q ok=%v", u, p, ok)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"status":"success",
			"data":{"resultType":"matrix","result":[{"metric":{},"values":[[1700000000,"42"],[1700000060,"43.5"]]}]}
		}`))
	}))
	defer srv.Close()

	c := NewHTTPClient(srv.URL, "user", "pass")
	got, err := c.QueryRange(context.Background(), QueryRangeRequest{
		Query: `ic_canister_memory_bytes{canister_id="aaaaa-aa"}`,
		Start: time.Unix(1700000000, 0),
		End:   time.Unix(1700000060, 0),
		Step:  time.Minute,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 points, got %d", len(got))
	}
	if got[0].Value != 42 || got[1].Value != 43.5 {
		t.Fatalf("unexpected values: %+v", got)
	}
}

func TestHTTPClient_QueryRange_ErrorStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()
	c := NewHTTPClient(srv.URL, "u", "p")
	_, err := c.QueryRange(context.Background(), QueryRangeRequest{
		Query: `x`,
		Start: time.Now().Add(-time.Hour),
		End:   time.Now(),
		Step:  time.Minute,
	})
	if err == nil {
		t.Fatal("expected error for 500 response")
	}
}

func TestFake_QueryRange_ProducesPoints(t *testing.T) {
	f := NewFake()
	pts, err := f.QueryRange(context.Background(), QueryRangeRequest{
		Query: "foo",
		Start: time.Unix(0, 0),
		End:   time.Unix(600, 0),
		Step:  time.Minute,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// 0..600s inclusive at 60s step -> 11 points.
	if len(pts) != 11 {
		t.Fatalf("want 11 points, got %d", len(pts))
	}
}
