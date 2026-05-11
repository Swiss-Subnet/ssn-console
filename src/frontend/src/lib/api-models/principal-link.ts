import { mapOkResponse } from '@/lib/api-models/error';
import { Principal } from '@icp-sdk/core/principal';
import type {
  AdminLinkPrincipalRequest as ApiAdminLinkPrincipalRequest,
  AdminLinkPrincipalResponse as ApiAdminLinkPrincipalResponse,
  AdminListLinkedPrincipalsRequest as ApiAdminListLinkedPrincipalsRequest,
  AdminListLinkedPrincipalsResponse as ApiAdminListLinkedPrincipalsResponse,
  AdminUnlinkPrincipalRequest as ApiAdminUnlinkPrincipalRequest,
  AdminUnlinkPrincipalResponse as ApiAdminUnlinkPrincipalResponse,
  GetMyPendingLinkCodeResponse as ApiGetMyPendingLinkCodeResponse,
  LinkMyPrincipalRequest as ApiLinkMyPrincipalRequest,
  LinkMyPrincipalResponse as ApiLinkMyPrincipalResponse,
  ListMyLinkedPrincipalsResponse as ApiListMyLinkedPrincipalsResponse,
  RegisterLinkCodeRequest as ApiRegisterLinkCodeRequest,
  RegisterLinkCodeResponse as ApiRegisterLinkCodeResponse,
  RevokeMyLinkCodeResponse as ApiRevokeMyLinkCodeResponse,
  SetMyPrincipalNameRequest as ApiSetMyPrincipalNameRequest,
  SetMyPrincipalNameResponse as ApiSetMyPrincipalNameResponse,
  UnlinkMyPrincipalRequest as ApiUnlinkMyPrincipalRequest,
  UnlinkMyPrincipalResponse as ApiUnlinkMyPrincipalResponse,
} from '@ssn/backend-api';

export type PendingLinkCode = {
  code: string;
  expiresAtNanos: bigint;
  targetPrincipal: string;
};

export type LinkedPrincipal = {
  principal: string;
  name: string | null;
};

const LINK_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LINK_CODE_LEN = 8;

export function generateLinkCode(): string {
  const bytes = new Uint8Array(LINK_CODE_LEN);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) {
    out += LINK_CODE_ALPHABET[byte % LINK_CODE_ALPHABET.length];
  }
  return out;
}

export function mapRegisterLinkCodeRequest(
  code: string,
  targetPrincipal: string,
): ApiRegisterLinkCodeRequest {
  return { code, target_principal: Principal.fromText(targetPrincipal) };
}

export function mapRegisterLinkCodeResponse(res: ApiRegisterLinkCodeResponse): {
  expiresAtNanos: bigint;
} {
  const ok = mapOkResponse(res);
  return { expiresAtNanos: ok.expires_at_nanos };
}

export function mapLinkMyPrincipalRequest(
  code: string,
): ApiLinkMyPrincipalRequest {
  return { code };
}

export function mapLinkMyPrincipalResponse(
  res: ApiLinkMyPrincipalResponse,
): void {
  mapOkResponse(res);
}

export function mapUnlinkMyPrincipalRequest(
  principal: string,
): ApiUnlinkMyPrincipalRequest {
  return { principal: Principal.fromText(principal) };
}

export function mapUnlinkMyPrincipalResponse(
  res: ApiUnlinkMyPrincipalResponse,
): void {
  mapOkResponse(res);
}

export function mapListMyLinkedPrincipalsResponse(
  res: ApiListMyLinkedPrincipalsResponse,
): LinkedPrincipal[] {
  const ok = mapOkResponse(res);
  return ok.principals.map(p => ({
    principal: p.principal.toText(),
    name: p.name[0] ?? null,
  }));
}

export function mapSetMyPrincipalNameRequest(
  principal: string,
  name: string | null,
): ApiSetMyPrincipalNameRequest {
  return {
    principal: Principal.fromText(principal),
    name: name === null ? [] : [name],
  };
}

export function mapSetMyPrincipalNameResponse(
  res: ApiSetMyPrincipalNameResponse,
): void {
  mapOkResponse(res);
}

export function mapGetMyPendingLinkCodeResponse(
  res: ApiGetMyPendingLinkCodeResponse,
): PendingLinkCode | null {
  const ok = mapOkResponse(res);
  const [entry] = ok.code;
  if (entry === undefined) return null;
  return {
    code: entry.code,
    expiresAtNanos: entry.expires_at_nanos,
    targetPrincipal: entry.target_principal.toText(),
  };
}

export function mapRevokeMyLinkCodeResponse(
  res: ApiRevokeMyLinkCodeResponse,
): void {
  mapOkResponse(res);
}

export function mapAdminLinkPrincipalRequest(
  userId: string,
  principal: string,
): ApiAdminLinkPrincipalRequest {
  return { user_id: userId, principal: Principal.fromText(principal) };
}

export function mapAdminLinkPrincipalResponse(
  res: ApiAdminLinkPrincipalResponse,
): void {
  mapOkResponse(res);
}

export function mapAdminUnlinkPrincipalRequest(
  userId: string,
  principal: string,
): ApiAdminUnlinkPrincipalRequest {
  return { user_id: userId, principal: Principal.fromText(principal) };
}

export function mapAdminUnlinkPrincipalResponse(
  res: ApiAdminUnlinkPrincipalResponse,
): void {
  mapOkResponse(res);
}

export function mapAdminListLinkedPrincipalsRequest(
  userId: string,
): ApiAdminListLinkedPrincipalsRequest {
  return { user_id: userId };
}

export function mapAdminListLinkedPrincipalsResponse(
  res: ApiAdminListLinkedPrincipalsResponse,
): string[] {
  const ok = mapOkResponse(res);
  return ok.principals.map(p => p.toText());
}
