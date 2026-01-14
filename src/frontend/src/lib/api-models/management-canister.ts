import { fromCandidOpt, toCandidOpt } from '@/lib/utils';
import { Principal } from '@icp-sdk/core/principal';
import type {
  canister_status_result as ApiCanisterStatusResponse,
  update_settings_args as ApiUpdateSettingsRequest,
} from '@ssn/management-canister';

export interface ApiCanisterStatusRequest {
  canister_id: Principal;
}

export interface CanisterStatusRequest {
  canisterId: string;
}

export function mapCanisterStatusRequest(
  req: CanisterStatusRequest,
): ApiCanisterStatusRequest {
  return {
    canister_id: Principal.fromText(req.canisterId),
  };
}

export interface CanisterStatusResponse {
  status: CanisterStatus;
  version: bigint;
  readyForMigration: boolean;
  settings: {
    controllers: string[];
    controller: string;
    computeAllocation: bigint;
    memoryAllocation: bigint;
    freezingThreshold: bigint;
    reservedCyclesLimit: bigint;
    logVisibility: 'controllers' | 'public' | string[];
    logMemoryLimit: bigint;
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
  controller: string;
  freezingThreshold: bigint;
  balance: { blob: Uint8Array; nat: bigint }[];
  cycles: bigint;
  reservedCycles: bigint;
}

export enum CanisterStatus {
  Running = 'running',
  Stopping = 'stopping',
  Stopped = 'stopped',
}

export function mapCanisterStatusResponse(
  res: ApiCanisterStatusResponse,
): CanisterStatusResponse {
  return {
    status:
      'running' in res.status
        ? CanisterStatus.Running
        : 'stopping' in res.status
          ? CanisterStatus.Stopping
          : CanisterStatus.Stopped,
    version: res.version,
    readyForMigration: res.ready_for_migration,
    settings: {
      controllers: res.settings.controllers.map(c => c.toText()),
      controller: res.settings.controller.toText(),
      computeAllocation: res.settings.compute_allocation,
      memoryAllocation: res.settings.memory_allocation,
      freezingThreshold: res.settings.freezing_threshold,
      reservedCyclesLimit: res.settings.reserved_cycles_limit,
      logVisibility:
        'controllers' in res.settings.log_visibility
          ? 'controllers'
          : 'public' in res.settings.log_visibility
            ? 'public'
            : res.settings.log_visibility.allowed_viewers.map(p => p.toText()),
      logMemoryLimit: res.settings.log_memory_limit,
      wasmMemoryLimit: res.settings.wasm_memory_limit,
      wasmMemoryThreshold: res.settings.wasm_memory_threshold,
      environmentVariables: res.settings.environment_variables.map(env => ({
        name: env.name,
        value: env.value,
      })),
    },
    moduleHash: fromCandidOpt(res.module_hash),
    memorySize: res.memory_size,
    memoryMetrics: {
      wasmMemorySize: res.memory_metrics.wasm_memory_size,
      stableMemorySize: res.memory_metrics.stable_memory_size,
      globalMemorySize: res.memory_metrics.global_memory_size,
      wasmBinarySize: res.memory_metrics.wasm_binary_size,
      customSectionsSize: res.memory_metrics.custom_sections_size,
      canisterHistorySize: res.memory_metrics.canister_history_size,
      wasmChunkStoreSize: res.memory_metrics.wasm_chunk_store_size,
      snapshotsSize: res.memory_metrics.snapshots_size,
    },
    controller: res.controller.toText(),
    freezingThreshold: res.freezing_threshold,
    balance: res.balance.map(([blob, nat]) => ({ blob, nat })),
    cycles: res.cycles,
    reservedCycles: res.reserved_cycles,
  };
}

export interface UpdateSettingsRequest {
  canisterId: string;
  settings: {
    controllers?: string[];
    controller?: string;
    computeAllocation?: bigint;
    memoryAllocation?: bigint;
    freezingThreshold?: bigint;
    reservedCyclesLimit?: bigint;
    logVisibility?: 'controllers' | 'public' | string[];
    logMemoryLimit?: bigint;
    wasmMemoryLimit?: bigint;
    wasmMemoryThreshold?: bigint;
    environmentVariables?: { name: string; value: string }[];
  };
  senderCanisterVersion?: bigint;
}

export function mapUpdateSettingsRequest(
  req: UpdateSettingsRequest,
): ApiUpdateSettingsRequest {
  return {
    canister_id: Principal.fromText(req.canisterId),
    settings: {
      controllers: req.settings.controllers
        ? [req.settings.controllers.map(c => Principal.fromText(c))]
        : [],
      compute_allocation: toCandidOpt(req.settings.computeAllocation),
      memory_allocation: toCandidOpt(req.settings.memoryAllocation),
      freezing_threshold: toCandidOpt(req.settings.freezingThreshold),
      reserved_cycles_limit: toCandidOpt(req.settings.reservedCyclesLimit),
      log_visibility: req.settings.logVisibility
        ? [
            req.settings.logVisibility === 'controllers'
              ? { controllers: null }
              : req.settings.logVisibility === 'public'
                ? { public: null }
                : {
                    allowed_viewers: req.settings.logVisibility.map(v =>
                      Principal.fromText(v),
                    ),
                  },
          ]
        : [],
      log_memory_limit: toCandidOpt(req.settings.logMemoryLimit),
      wasm_memory_limit: toCandidOpt(req.settings.wasmMemoryLimit),
      wasm_memory_threshold: toCandidOpt(req.settings.wasmMemoryThreshold),
      environment_variables: toCandidOpt(req.settings.environmentVariables),
    },
    sender_canister_version: toCandidOpt(req.senderCanisterVersion),
  };
}
