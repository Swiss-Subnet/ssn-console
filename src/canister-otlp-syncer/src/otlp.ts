import { JsonMetricsSerializer } from '@opentelemetry/otlp-transformer';
import type { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { env } from './env';

export async function pushMetrics(metrics: ResourceMetrics): Promise<void> {
  const body = JsonMetricsSerializer.serializeRequest(metrics);

  const response = await fetch(env.METRICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Alloy rejected payload: ${response.status} - ${errBody}`);
  }
}

export function toHrTime(nanosBigInt: bigint): [number, number] {
  const SECONDS_IN_NANOS = 1_000_000_000n;
  const seconds = Number(nanosBigInt / SECONDS_IN_NANOS);
  const nanos = Number(nanosBigInt % SECONDS_IN_NANOS);
  return [seconds, nanos];
}
