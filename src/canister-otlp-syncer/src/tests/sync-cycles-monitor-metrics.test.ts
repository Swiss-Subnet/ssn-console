import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  setSystemTime,
  spyOn,
} from 'bun:test';
import { HttpAgent } from '@icp-sdk/core/agent';

spyOn(Bun, 'write').mockImplementation(async () => 0);
spyOn(Bun, 'file').mockImplementation(() => {
  return {
    text: async () => {
      throw new Error('File not found');
    },
  } as any;
});

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
          next_cursor: [[time1, Principal.fromText('aaaaa-aa')]],
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
              // total: 30B cycles / 2B = 15s
              instructions: 30_000_000_000n,
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

    const expectedOneHourAgoNs =
      BigInt(new Date('2024-01-01T11:00:00Z').getTime()) * 1_000_000n;
    expect(mockListMetricsAfter).toHaveBeenNthCalledWith(1, {
      cursor: [
        [expectedOneHourAgoNs, Principal.fromUint8Array(new Uint8Array(29))],
      ],
    });

    expect(mockListMetricsAfter).toHaveBeenNthCalledWith(2, {
      cursor: [[time1, Principal.fromText('aaaaa-aa')]],
    });

    expect(mockPushMetrics).toHaveBeenCalledTimes(2);

    const payload1 = mockPushMetrics.mock.calls[0]?.[0];
    expect(payload1).toMatchSnapshot();

    const payload2 = mockPushMetrics.mock.calls[1]?.[0];
    expect(payload2).toMatchSnapshot();
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
