import type {
  ActorInterface,
  CanisterFixture,
  PocketIc,
  SetupCanisterOptions as PicSetupCanisterOptions,
} from '@dfinity/pic';
import path from 'node:path';
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

type SetupCanisterOptions = Omit<
  InnerSetupCanisterOptions,
  'idlFactory' | 'wasm'
>;

export async function setupBackendCanister(
  pic: PocketIc,
  options: SetupCanisterOptions = {},
): Promise<CanisterFixture<BackendService>> {
  return setupCanister<BackendService>(pic, {
    idlFactory: backendIdlFactory,
    wasm: BACKEND_WASM_PATH,
    ...options,
  });
}

export async function setupCanisterHistoryCanister(
  pic: PocketIc,
  options: SetupCanisterOptions = {},
): Promise<CanisterFixture<CanisterHistoryService>> {
  return setupCanister<CanisterHistoryService>(pic, {
    idlFactory: canisterHistoryIdlFactory,
    wasm: CANISTER_HISTORY_WASM_PATH,
    ...options,
  });
}

export async function setupCyclesMonitorCanister(
  pic: PocketIc,
  options: SetupCanisterOptions = {},
): Promise<CanisterFixture<CyclesMonitorService>> {
  return setupCanister<CyclesMonitorService>(pic, {
    idlFactory: cyclesMonitorIdlFactory,
    wasm: CYCLES_MONITOR_WASM_PATH,
    ...options,
  });
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

type InnerSetupCanisterOptions = Omit<PicSetupCanisterOptions, 'sender'>;
async function setupCanister<T extends ActorInterface<T> = ActorInterface>(
  pic: PocketIc,
  options: InnerSetupCanisterOptions,
): Promise<CanisterFixture<T>> {
  return await pic.setupCanister<T>({
    ...options,
    sender: controllerIdentity.getPrincipal(),
  });
}
