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
    mockListMetricsAfter
      .mockResolvedValueOnce({
        Ok: {
          snapshots: [
            {
              timestamp_ns: 1000n,
              canister_id: 'aaaaa-aa',
              memory: 100n,
              compute_allocation: 101n,
              ingress_induction: 102n,
              instructions: 103n,
              request_and_response_transmission: 104n,
              uninstall: 105n,
              http_outcalls: 106n,
              burned_cycles: 107n,
            },
          ],
          next_cursor: [{ timestamp_ns: 1000n, canister_id: 'aaaaa-aa' }],
        },
      })
      .mockResolvedValueOnce({
        Ok: {
          snapshots: [
            {
              timestamp_ns: 1001n,
              canister_id: 'aaaaa-aa',
              memory: 200n,
              compute_allocation: 201n,
              ingress_induction: 202n,
              instructions: 203n,
              request_and_response_transmission: 204n,
              uninstall: 205n,
              http_outcalls: 206n,
              burned_cycles: 207n,
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
      cursor: [{ timestamp_ns: 1000n, canister_id: 'aaaaa-aa' }],
    });

    expect(mockPushMetrics).toHaveBeenCalledTimes(2);

    const passedPayload = mockPushMetrics.mock.calls[0]?.[0];
    expect(passedPayload).toBeDefined();
    if (!passedPayload) return;

    // Check some structure of the OTLP payload
    expect(passedPayload.resource).toBeDefined();
    expect(passedPayload.scopeMetrics).toBeDefined();
    expect(passedPayload.scopeMetrics?.length).toBe(1);
    expect(passedPayload.scopeMetrics?.[0]?.metrics?.length).toBe(8); // 8 metrics buckets
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
