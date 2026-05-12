import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { HttpAgent } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

const mockUpsertUsage = mock();
const mockCreateActor = mock().mockReturnValue({
  upsert_usage: mockUpsertUsage,
});

mock.module('@icp-sdk/core/agent', () => {
  return {
    Actor: {
      createActor: mockCreateActor,
    },
    HttpAgent: class HttpAgent {},
  };
});

import { syncCanisterUsage } from '../sync-canister-usage';
import type { ExtractedCanisterMetrics } from '../sync-cycles-monitor-metrics';

describe('sync-canister-usage', () => {
  beforeEach(() => {
    mockUpsertUsage.mockClear();
  });

  afterEach(() => {
    mockUpsertUsage.mockRestore();
  });

  it('does nothing when the usages list is empty', async () => {
    const mockAgent = {} as HttpAgent;
    await syncCanisterUsage(mockAgent, []);

    expect(mockCreateActor).not.toHaveBeenCalled();
    expect(mockUpsertUsage).not.toHaveBeenCalled();
  });

  it('syncs usages to backend properly', async () => {
    mockUpsertUsage.mockResolvedValue({ Ok: null });

    const mockUsages: ExtractedCanisterMetrics[] = [
      {
        timestamp_ns: 1000n,
        canister_id: Principal.fromText('aaaaa-aa'),
        ic_canister_memory_cycles_total: 100n,
        ic_canister_memory_bytes: 101n,
        ic_canister_compute_allocation_cycles_total: 102n,
        ic_canister_compute_allocation_percent: 103n,
        ic_canister_ingress_induction_cycles_total: 104n,
        ic_canister_ingress_induction_bytes_total: 105n,
        ic_canister_instructions_cycles_total: 106n,
        ic_canister_compute_time_seconds_total: 107n,
        ic_canister_request_response_transmission_cycles_total: 108n,
        ic_canister_transmission_bytes_total: 109n,
        ic_canister_uninstall_cycles_total: 110n,
        ic_canister_uninstalls_total: 111n,
        ic_canister_http_outcalls_cycles_total: 112n,
        ic_canister_burned_cycles_total: 113n,
      },
    ];

    const mockAgent = {} as HttpAgent;
    await syncCanisterUsage(mockAgent, mockUsages);

    expect(mockUpsertUsage).toHaveBeenCalledTimes(1);
    expect(mockUpsertUsage).toHaveBeenCalledWith({
      usages: [
        {
          canister_id: Principal.fromText('aaaaa-aa'),
          memory: 100n,
          memory_bytes: 101n,
          compute_allocation: 102n,
          compute_allocation_percent: 103n,
          ingress_induction: 104n,
          ingress_induction_bytes_total: 105n,
          instructions: 106n,
          compute_time_seconds_total: 107n,
          request_and_response_transmission: 108n,
          transmission_bytes_total: 109n,
          uninstall: 110n,
          uninstalls_total: 111n,
          http_outcalls: 112n,
          burned_cycles: 113n,
        },
      ],
    });
  });

  it('throws an error if upsert_usage returns an Err', async () => {
    mockUpsertUsage.mockResolvedValue({
      Err: {
        message: 'Backend error',
      },
    });

    const mockUsages: ExtractedCanisterMetrics[] = [
      {
        timestamp_ns: 1000n,
        canister_id: Principal.fromText('aaaaa-aa'),
        ic_canister_memory_cycles_total: 100n,
        ic_canister_memory_bytes: 101n,
        ic_canister_compute_allocation_cycles_total: 102n,
        ic_canister_compute_allocation_percent: 103n,
        ic_canister_ingress_induction_cycles_total: 104n,
        ic_canister_ingress_induction_bytes_total: 105n,
        ic_canister_instructions_cycles_total: 106n,
        ic_canister_compute_time_seconds_total: 107n,
        ic_canister_request_response_transmission_cycles_total: 108n,
        ic_canister_transmission_bytes_total: 109n,
        ic_canister_uninstall_cycles_total: 110n,
        ic_canister_uninstalls_total: 111n,
        ic_canister_http_outcalls_cycles_total: 112n,
        ic_canister_burned_cycles_total: 113n,
      },
    ];

    const mockAgent = {} as HttpAgent;

    expect(syncCanisterUsage(mockAgent, mockUsages)).rejects.toThrow(
      'Failed to upsert usage: Backend error',
    );
  });
});
