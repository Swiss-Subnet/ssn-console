package otlp

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"

	"google.golang.org/protobuf/encoding/protojson"

	collectorpb "go.opentelemetry.io/proto/otlp/collector/metrics/v1"
	mpb "go.opentelemetry.io/proto/otlp/metrics/v1"
)

type Pusher struct {
	endpoint string
	client   *http.Client
}

func NewPusher(endpoint string, client *http.Client) *Pusher {
	if client == nil {
		client = http.DefaultClient
	}
	return &Pusher{endpoint: endpoint, client: client}
}

func (p *Pusher) Push(ctx context.Context, rm *mpb.ResourceMetrics) error {
	req := &collectorpb.ExportMetricsServiceRequest{
		ResourceMetrics: []*mpb.ResourceMetrics{rm},
	}
	body, err := protojson.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal otlp request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("post metrics: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("alloy rejected payload: %d - %s", resp.StatusCode, b)
	}
	return nil
}
