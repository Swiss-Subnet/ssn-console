import { isNotNil } from '@/lib/nil';
import { fromCandidOpt } from '@/lib/utils';
import type { Canister as ApiCanister } from '@ssn/backend-api';

export type ListMyCanistersResponse = Canister[];

export type Canister = {
  id: string;
  principal: string;
  info?: CanisterInfo;
};

export type CanisterInfo = {
  status: CanisterStatus;
  readyForMigration: boolean;
  version: bigint;
  settings: {
    controllers: string[];
    computeAllocation: bigint;
    memoryAllocation: bigint;
    freezingThreshold: bigint;
    reservedCyclesLimit: bigint;
    logVisibility: 'controllers' | 'public' | string[];
    wasmMemoryLimit: bigint;
    wasmMemoryThreshold: bigint;
    environmentVariables: { name: string; value: string }[];
  };
  moduleHash: Uint8Array | null;
  memorySize: bigint;
  memoryMetrics: {
    wasmMemorySize: bigint;
    stableMemorySize: bigint;
    globalMemorySize: bigint;
    wasmBinarySize: bigint;
    customSectionsSize: bigint;
    canisterHistorySize: bigint;
    wasmChunkStoreSize: bigint;
    snapshotsSize: bigint;
  };
  cycles: bigint;
  reservedCycles: bigint;
  queryStats: {
    numCallsTotal: bigint;
    numInstructionsTotal: bigint;
    requestPayloadBytesTotal: bigint;
    responsePayloadBytesTotal: bigint;
  };
};

export enum CanisterStatus {
  Running = 'running',
  Stopping = 'stopping',
  Stopped = 'stopped',
}

export function mapListMyCanistersResponse(
  res: ApiCanister[],
): ListMyCanistersResponse {
  return res.map(mapCanisterResponse);
}

export function mapCanisterResponse(res: ApiCanister): Canister {
  const canister: Canister = {
    id: res.id,
    principal: res.principal_id,
  };

  const [canisterInfo] = res.info;
  if (isNotNil(canisterInfo)) {
    canister.info = {
      status:
        'running' in canisterInfo.status
          ? CanisterStatus.Running
          : 'stopping' in canisterInfo.status
            ? CanisterStatus.Stopping
            : CanisterStatus.Stopped,
      readyForMigration: canisterInfo.ready_for_migration,
      version: canisterInfo.version,
      settings: {
        controllers: canisterInfo.settings.controllers.map(c => c.toText()),
        computeAllocation: canisterInfo.settings.compute_allocation,
        memoryAllocation: canisterInfo.settings.memory_allocation,
        freezingThreshold: canisterInfo.settings.freezing_threshold,
        reservedCyclesLimit: canisterInfo.settings.reserved_cycles_limit,
        logVisibility:
          'Controllers' in canisterInfo.settings.log_visibility
            ? 'controllers'
            : 'Public' in canisterInfo.settings.log_visibility
              ? 'public'
              : canisterInfo.settings.log_visibility.AllowedViewers.map(p =>
                  p.toText(),
                ),
        wasmMemoryLimit: canisterInfo.settings.wasm_memory_limit,
        wasmMemoryThreshold: canisterInfo.settings.wasm_memory_threshold,
        environmentVariables: canisterInfo.settings.environment_variables.map(
          env => ({
            name: env.name,
            value: env.value,
          }),
        ),
      },
      moduleHash: fromCandidOpt(canisterInfo.module_hash),
      memorySize: canisterInfo.memory_size,
      memoryMetrics: {
        wasmMemorySize: canisterInfo.memory_metrics.wasm_memory_size,
        stableMemorySize: canisterInfo.memory_metrics.stable_memory_size,
        globalMemorySize: canisterInfo.memory_metrics.global_memory_size,
        wasmBinarySize: canisterInfo.memory_metrics.wasm_binary_size,
        customSectionsSize: canisterInfo.memory_metrics.custom_sections_size,
        canisterHistorySize: canisterInfo.memory_metrics.canister_history_size,
        wasmChunkStoreSize: canisterInfo.memory_metrics.wasm_chunk_store_size,
        snapshotsSize: canisterInfo.memory_metrics.snapshots_size,
      },
      cycles: canisterInfo.cycles,
      reservedCycles: canisterInfo.reserved_cycles,
      queryStats: {
        numCallsTotal: canisterInfo.query_stats.num_calls_total,
        numInstructionsTotal: canisterInfo.query_stats.num_instructions_total,
        requestPayloadBytesTotal:
          canisterInfo.query_stats.request_payload_bytes_total,
        responsePayloadBytesTotal:
          canisterInfo.query_stats.response_payload_bytes_total,
      },
    };
  }

  return canister;
}
