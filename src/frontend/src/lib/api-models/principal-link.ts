import { mapOkResponse } from '@/lib/api-models/error';
import { Principal } from '@icp-sdk/core/principal';
import type {
  LinkMyPrincipalRequest as ApiLinkMyPrincipalRequest,
  LinkMyPrincipalResponse as ApiLinkMyPrincipalResponse,
  ListMyLinkedPrincipalsResponse as ApiListMyLinkedPrincipalsResponse,
  ListMyPendingLinkCodesResponse as ApiListMyPendingLinkCodesResponse,
  RegisterLinkCodeRequest as ApiRegisterLinkCodeRequest,
  RegisterLinkCodeResponse as ApiRegisterLinkCodeResponse,
  RevokeLinkCodeRequest as ApiRevokeLinkCodeRequest,
  RevokeLinkCodeResponse as ApiRevokeLinkCodeResponse,
  UnlinkMyPrincipalRequest as ApiUnlinkMyPrincipalRequest,
  UnlinkMyPrincipalResponse as ApiUnlinkMyPrincipalResponse,
} from '@ssn/backend-api';

export type PendingLinkCode = {
  code: string;
  expiresAtNanos: bigint;
  targetPrincipal: string;
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
): string[] {
  const ok = mapOkResponse(res);
  return ok.principals.map(p => p.toText());
}

export function mapListMyPendingLinkCodesResponse(
  res: ApiListMyPendingLinkCodesResponse,
): PendingLinkCode[] {
  const ok = mapOkResponse(res);
  return ok.codes.map(c => ({
    code: c.code,
    expiresAtNanos: c.expires_at_nanos,
    targetPrincipal: c.target_principal.toText(),
  }));
}

export function mapRevokeLinkCodeRequest(
  code: string,
): ApiRevokeLinkCodeRequest {
  return { code };
}

export function mapRevokeLinkCodeResponse(
  res: ApiRevokeLinkCodeResponse,
): void {
  mapOkResponse(res);
}
