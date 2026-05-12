import { Actor, type HttpAgent } from '@icp-sdk/core/agent';
import {
  idlFactory,
  type _SERVICE,
  type CanisterUsage,
} from '@ssn/backend-api';
import { env } from './env';

import type { ExtractedCanisterMetrics } from './sync-cycles-monitor-metrics';

export async function syncCanisterUsage(
  agent: HttpAgent,
  rawUsages: ExtractedCanisterMetrics[],
) {
  if (rawUsages.length === 0) {
    console.log('😵 No canister usage to sync.');
    return;
  }

  const usages: CanisterUsage[] = rawUsages.map(raw => ({
    canister_id: raw.canister_id,
    memory: raw.ic_canister_memory_cycles_total,
    memory_bytes: raw.ic_canister_memory_bytes,
    compute_allocation: raw.ic_canister_compute_allocation_cycles_total,
    compute_allocation_percent: raw.ic_canister_compute_allocation_percent,
    ingress_induction: raw.ic_canister_ingress_induction_cycles_total,
    ingress_induction_bytes_total:
      raw.ic_canister_ingress_induction_bytes_total,
    instructions: raw.ic_canister_instructions_cycles_total,
    compute_time_seconds_total: raw.ic_canister_compute_time_seconds_total,
    request_and_response_transmission:
      raw.ic_canister_request_response_transmission_cycles_total,
    transmission_bytes_total: raw.ic_canister_transmission_bytes_total,
    uninstall: raw.ic_canister_uninstall_cycles_total,
    uninstalls_total: raw.ic_canister_uninstalls_total,
    http_outcalls: raw.ic_canister_http_outcalls_cycles_total,
    burned_cycles: raw.ic_canister_burned_cycles_total,
  }));

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: env.CANISTER_ID_BACKEND,
  });

  console.log(`🚀 Syncing ${usages.length} canister usages to backend...`);

  const res = await actor.upsert_usage({ usages });
  if ('Err' in res) {
    throw new Error(`Failed to upsert usage: ${res.Err.message}`);
  }

  console.log('✅ Successfully synced canister usages to backend.');
}
