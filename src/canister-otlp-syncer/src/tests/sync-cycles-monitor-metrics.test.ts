import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  setSystemTime,
} from 'bun:test';
import { HttpAgent } from '@icp-sdk/core/agent';

const mockPushMetrics = mock().mockResolvedValue(undefined);
mock.module('../otlp', () => ({
  pushMetrics: mockPushMetrics,
  toHrTime: (n: bigint) => [0, Number(n)],
}));

const mockListMetricsAfter = mock();
const mockCreateActor = mock().mockReturnValue({
  list_metrics_after: mockListMetricsAfter,
});

mock.module('@icp-sdk/core/agent', () => {
  return {
    Actor: {
      createActor: mockCreateActor,
    },
    HttpAgent: class HttpAgent {},
  };
});

import { Principal } from '@icp-sdk/core/principal';
import { syncCyclesMonitorMetrics } from '../sync-cycles-monitor-metrics';

describe('sync-cycles-monitor-metrics', () => {
  beforeEach(() => {
    setSystemTime(new Date('2024-01-01T12:00:00Z'));
    mockPushMetrics.mockClear();
    mockPushMetrics.mockResolvedValue(undefined);
    mockListMetricsAfter.mockClear();
  });

  afterEach(() => {
    mockPushMetrics.mockRestore();
    mockListMetricsAfter.mockRestore();
  });

  it('syncs metrics properly when snapshots are returned', async () => {
    const time1 = 1_000_000_000_000n; // 1000 seconds
    const time2 = 1_005_000_000_000n; // 1005 seconds, delta = 5 seconds

    mockListMetricsAfter
      .mockResolvedValueOnce({
        Ok: {
          snapshots: [
            {
              timestamp_ns: time1,
              canister_id: 'aaaaa-aa',
              memory: 0n,
              compute_allocation: 0n,
              ingress_induction: 0n,
              instructions: 0n,
              request_and_response_transmission: 0n,
              uninstall: 0n,
              http_outcalls: 0n,
              burned_cycles: 0n,
            },
          ],
          next_cursor: [{ timestamp_ns: time1, canister_id: 'aaaaa-aa' }],
        },
      })
      .mockResolvedValueOnce({
        Ok: {
          snapshots: [
            {
              timestamp_ns: time2,
              canister_id: 'aaaaa-aa',
              // delta: 1,270,000 cycles / (5s * 127k) = 2 GB
              memory: 1_270_000n,
              // delta: 2.5B cycles / (5s * 10M) = 50%
              compute_allocation: 2_500_000_000n,
              // total: 10M / 2000 = 5000 bytes
              ingress_induction: 10_000_000n,
              instructions: 0n,
              // total: 10M / 1000 = 10000 bytes
              request_and_response_transmission: 10_000_000n,
              // total: 50M / 5M = 10 uninstalls
              uninstall: 50_000_000n,
              // total: 10.4M / 10400 = 1000 bytes
              http_outcalls: 10_400_000n,
              // total: 1T / 1T * 1.35 = 1.35 USD
              burned_cycles: 1_000_000_000_000n,
            },
          ],
          next_cursor: [],
        },
      });

    const mockAgent = {} as HttpAgent;
    await syncCyclesMonitorMetrics(mockAgent);

    expect(mockListMetricsAfter).toHaveBeenCalledTimes(2);

    // Check initial cursor
    const expectedOneHourAgoNs =
      BigInt(new Date('2024-01-01T11:00:00Z').getTime()) * 1_000_000n;
    expect(mockListMetricsAfter).toHaveBeenNthCalledWith(1, {
      cursor: [
        [expectedOneHourAgoNs, Principal.fromUint8Array(new Uint8Array(29))],
      ],
    });

    // Check pagination cursor
    expect(mockListMetricsAfter).toHaveBeenNthCalledWith(2, {
      cursor: [{ timestamp_ns: time1, canister_id: 'aaaaa-aa' }],
    });

    expect(mockPushMetrics).toHaveBeenCalledTimes(2);

    // Payload 1 (only base metrics and counters, no gauges since delta relies on prev point)
    const payload1 = mockPushMetrics.mock.calls[0]?.[0];
    expect(payload1).toBeDefined();
    expect(payload1.scopeMetrics?.[0]?.metrics?.length).toBe(13); // 8 base + 5 derived definitions (some have empty dataPoints)

    // Payload 2 (has previous point, so derives gauges as well)
    const payload2 = mockPushMetrics.mock.calls[1]?.[0];
    expect(payload2).toBeDefined();
    const metrics2 = payload2.scopeMetrics?.[0]?.metrics;
    expect(metrics2).toBeDefined();

    // We expect 8 base + 5 derived = 13 metrics
    expect(metrics2?.length).toBe(13);

    const getMetricValue = (name: string) => {
      const metric = metrics2?.find((m: any) => m.descriptor.name === name);
      return metric?.dataPoints[0]?.value;
    };

    // Assert specific derived values
    expect(getMetricValue('ic_canister_memory_bytes')).toBe(
      2 * 1024 * 1024 * 1024,
    );
    expect(getMetricValue('ic_canister_compute_allocation_percent')).toBe(50);
    expect(getMetricValue('ic_canister_ingress_induction_bytes_total')).toBe(
      5000,
    );
    expect(getMetricValue('ic_canister_transmission_bytes_total')).toBe(10000);
    expect(getMetricValue('ic_canister_uninstalls_total')).toBe(10);
  });

  it('does nothing when no new metrics are returned', async () => {
    mockListMetricsAfter.mockResolvedValue({
      Ok: {
        snapshots: [],
        next_cursor: [],
      },
    });

    const mockAgent = {} as HttpAgent;
    await syncCyclesMonitorMetrics(mockAgent);

    const expectedOneHourAgoNs =
      BigInt(new Date('2024-01-01T11:00:00Z').getTime()) * 1_000_000n;
    expect(mockListMetricsAfter).toHaveBeenCalledWith({
      cursor: [
        [expectedOneHourAgoNs, Principal.fromUint8Array(new Uint8Array(29))],
      ],
    });

    expect(mockPushMetrics).not.toHaveBeenCalled();
  });

  it('throws an error if list_metrics_after returns an Err', async () => {
    mockListMetricsAfter.mockResolvedValue({
      Err: {
        message: 'Something went wrong',
      },
    });

    const mockAgent = {} as HttpAgent;

    expect(syncCyclesMonitorMetrics(mockAgent)).rejects.toThrow(
      'Something went wrong',
    );
    expect(mockPushMetrics).not.toHaveBeenCalled();
  });
});
