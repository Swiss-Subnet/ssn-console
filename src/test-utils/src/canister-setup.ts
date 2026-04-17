import type {
  ActorInterface,
  CanisterFixture,
  EnvironmentVariable,
  PocketIc,
} from '@dfinity/pic';
import path from 'node:path';
import type { IDL } from '@icp-sdk/core/candid';
import {
  idlFactory as backendIdlFactory,
  type _SERVICE as BackendService,
} from '@ssn/backend-api';
import {
  idlFactory as canisterHistoryIdlFactory,
  type _SERVICE as CanisterHistoryService,
} from '@ssn/canister-history-api';
import {
  idlFactory as cyclesMonitorIdlFactory,
  type _SERVICE as CyclesMonitorService,
} from '@ssn/cycles-monitor-api';
import { controllerIdentity } from './identity';

export async function setupBackendCanister(
  pic: PocketIc,
  environmentVariables: EnvironmentVariable[] = [],
): Promise<CanisterFixture<BackendService>> {
  return setupCanister<BackendService>(
    pic,
    backendIdlFactory,
    BACKEND_WASM_PATH,
    environmentVariables,
  );
}

export async function setupCanisterHistoryCanister(
  pic: PocketIc,
  environmentVariables: EnvironmentVariable[] = [],
): Promise<CanisterFixture<CanisterHistoryService>> {
  return setupCanister<CanisterHistoryService>(
    pic,
    canisterHistoryIdlFactory,
    CANISTER_HISTORY_WASM_PATH,
    environmentVariables,
  );
}

export async function setupCyclesMonitorCanister(
  pic: PocketIc,
  environmentVariables: EnvironmentVariable[] = [],
): Promise<CanisterFixture<CyclesMonitorService>> {
  return setupCanister<CyclesMonitorService>(
    pic,
    cyclesMonitorIdlFactory,
    CYCLES_MONITOR_WASM_PATH,
    environmentVariables,
  );
}

export const BACKEND_WASM_PATH = resolveCanisterWasmPath('backend');
export const CANISTER_HISTORY_WASM_PATH =
  resolveCanisterWasmPath('canister-history');
export const CYCLES_MONITOR_WASM_PATH =
  resolveCanisterWasmPath('cycles-monitor');

function resolveCanisterWasmPath(canisterName: string): string {
  return path.join(
    __dirname,
    '..',
    '..',
    '..',
    '.dfx',
    'local',
    'canisters',
    canisterName,
    `${canisterName}.wasm.gz`,
  );
}

async function setupCanister<T extends ActorInterface<T> = ActorInterface>(
  pic: PocketIc,
  idlFactory: IDL.InterfaceFactory,
  wasmPath: string,
  environmentVariables: EnvironmentVariable[] = [],
): Promise<CanisterFixture<T>> {
  return await pic.setupCanister<T>({
    idlFactory,
    wasm: wasmPath,
    sender: controllerIdentity.getPrincipal(),
    environmentVariables,
  });
}
