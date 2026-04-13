import { fromCandidOpt } from '@/lib/utils';
import type {
  CanisterChange as ApiCanisterChange,
  ListCanisterChangesResponse as ApiListCanisterChangesResponse,
} from '@ssn/canister-history-api';

export type CanisterChangeOrigin =
  | { type: 'user'; userId: string }
  | { type: 'canister'; canisterId: string; canisterVersion: bigint | null };

export type CanisterChangeDetails =
  | { type: 'creation'; controllers: string[] }
  | { type: 'codeUninstall' }
  | {
      type: 'codeDeployment';
      mode: 'install' | 'reinstall' | 'upgrade' | null;
      moduleHash: string;
    }
  | { type: 'controllersChange'; controllers: string[] }
  | { type: 'loadSnapshot' };

export type CanisterChange = {
  id: string;
  canisterId: string;
  timestampNanos: bigint;
  canisterVersion: bigint;
  origin: CanisterChangeOrigin | null;
  details: CanisterChangeDetails | null;
};

export type ListCanisterChangesResponse = {
  changes: CanisterChange[];
  totalPages: bigint;
};

function mapOrigin(
  raw: ApiCanisterChange['origin'],
): CanisterChangeOrigin | null {
  const origin = fromCandidOpt(raw);
  if (origin === null) return null;
  if ('FromUser' in origin) {
    return { type: 'user', userId: origin.FromUser.user_id.toText() };
  }
  return {
    type: 'canister',
    canisterId: origin.FromCanister.canister_id.toText(),
    canisterVersion: fromCandidOpt(origin.FromCanister.canister_version),
  };
}

function mapDetails(
  raw: ApiCanisterChange['details'],
): CanisterChangeDetails | null {
  const details = fromCandidOpt(raw);
  if (details === null) return null;
  if ('Creation' in details) {
    return {
      type: 'creation',
      controllers: details.Creation.controllers.map(p => p.toText()),
    };
  }
  if ('CodeUninstall' in details) {
    return { type: 'codeUninstall' };
  }
  if ('CodeDeployment' in details) {
    const modeOpt = fromCandidOpt(details.CodeDeployment.mode);
    let mode: 'install' | 'reinstall' | 'upgrade' | null = null;
    if (modeOpt !== null) {
      if ('Install' in modeOpt) mode = 'install';
      else if ('Reinstall' in modeOpt) mode = 'reinstall';
      else mode = 'upgrade';
    }
    return {
      type: 'codeDeployment',
      mode,
      moduleHash: Array.from(details.CodeDeployment.module_hash)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
    };
  }
  if ('ControllersChange' in details) {
    return {
      type: 'controllersChange',
      controllers: details.ControllersChange.controllers.map(p => p.toText()),
    };
  }
  return { type: 'loadSnapshot' };
}

function mapCanisterChange(raw: ApiCanisterChange): CanisterChange {
  return {
    id: raw.id,
    canisterId: raw.canister_id.toText(),
    timestampNanos: raw.timestamp_nanos,
    canisterVersion: raw.canister_version,
    origin: mapOrigin(raw.origin),
    details: mapDetails(raw.details),
  };
}

export function mapListCanisterChangesResponse(
  res: ApiListCanisterChangesResponse,
): ListCanisterChangesResponse {
  if ('Err' in res) {
    throw new Error(res.Err.message);
  }
  return {
    changes: res.Ok.changes.map(mapCanisterChange),
    totalPages: res.Ok.meta.total_pages,
  };
}
