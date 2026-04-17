import type { Principal } from '@icp-sdk/core/principal';
import { mapOkResponse } from '@/lib/api-models/error';
import type {
  CreateOrgInviteRequest as ApiCreateOrgInviteRequest,
  CreateOrgInviteResponse as ApiCreateOrgInviteResponse,
  ListOrgInvitesRequest as ApiListOrgInvitesRequest,
  ListOrgInvitesResponse as ApiListOrgInvitesResponse,
  ListMyInvitesResponse as ApiListMyInvitesResponse,
  RevokeOrgInviteRequest as ApiRevokeOrgInviteRequest,
  RevokeOrgInviteResponse as ApiRevokeOrgInviteResponse,
  AcceptOrgInviteRequest as ApiAcceptOrgInviteRequest,
  AcceptOrgInviteResponse as ApiAcceptOrgInviteResponse,
  DeclineOrgInviteRequest as ApiDeclineOrgInviteRequest,
  DeclineOrgInviteResponse as ApiDeclineOrgInviteResponse,
  OrgInvite as ApiOrgInvite,
  InviteTarget as ApiInviteTarget,
  InviteStatus as ApiInviteStatus,
} from '@ssn/backend-api';

export type InviteTargetKind = 'email' | 'userId' | 'principal';

export type InviteTarget =
  | { kind: 'email'; email: string }
  | { kind: 'userId'; userId: string }
  | { kind: 'principal'; principal: Principal };

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export type OrgInvite = {
  id: string;
  orgId: string;
  orgName: string;
  createdBy: string;
  createdAtNs: bigint;
  expiresAtNs: bigint;
  target: InviteTarget;
  status: InviteStatus;
};

export type CreateOrgInviteRequest = {
  orgId: string;
  target: InviteTarget;
};

export type ListOrgInvitesRequest = {
  orgId: string;
};

export type RevokeOrgInviteRequest = {
  inviteId: string;
};

export type AcceptOrgInviteRequest = {
  inviteId: string;
};

export type DeclineOrgInviteRequest = {
  inviteId: string;
};

function mapInviteTargetRequest(target: InviteTarget): ApiInviteTarget {
  switch (target.kind) {
    case 'email':
      return { Email: target.email };
    case 'userId':
      return { UserId: target.userId };
    case 'principal':
      return { Principal: target.principal };
  }
}

function mapInviteTargetResponse(target: ApiInviteTarget): InviteTarget {
  if ('Email' in target) {
    return { kind: 'email', email: target.Email };
  }
  if ('UserId' in target) {
    return { kind: 'userId', userId: target.UserId };
  }
  return { kind: 'principal', principal: target.Principal };
}

function mapInviteStatus(status: ApiInviteStatus): InviteStatus {
  if ('Pending' in status) return 'pending';
  if ('Accepted' in status) return 'accepted';
  if ('Declined' in status) return 'declined';
  return 'revoked';
}

function mapInvite(inv: ApiOrgInvite): OrgInvite {
  return {
    id: inv.id,
    orgId: inv.org_id,
    orgName: inv.org_name,
    createdBy: inv.created_by,
    createdAtNs: inv.created_at_ns,
    expiresAtNs: inv.expires_at_ns,
    target: mapInviteTargetResponse(inv.target),
    status: mapInviteStatus(inv.status),
  };
}

export function mapCreateOrgInviteRequest(
  req: CreateOrgInviteRequest,
): ApiCreateOrgInviteRequest {
  return {
    org_id: req.orgId,
    target: mapInviteTargetRequest(req.target),
  };
}

export function mapCreateOrgInviteResponse(
  res: ApiCreateOrgInviteResponse,
): OrgInvite {
  const okRes = mapOkResponse(res);
  return mapInvite(okRes.invite);
}

export function mapListOrgInvitesRequest(
  req: ListOrgInvitesRequest,
): ApiListOrgInvitesRequest {
  return { org_id: req.orgId };
}

export function mapListOrgInvitesResponse(
  res: ApiListOrgInvitesResponse,
): OrgInvite[] {
  return mapOkResponse(res).map(mapInvite);
}

export function mapListMyInvitesResponse(
  res: ApiListMyInvitesResponse,
): OrgInvite[] {
  return mapOkResponse(res).map(mapInvite);
}

export function mapRevokeOrgInviteRequest(
  req: RevokeOrgInviteRequest,
): ApiRevokeOrgInviteRequest {
  return { invite_id: req.inviteId };
}

export function mapRevokeOrgInviteResponse(
  res: ApiRevokeOrgInviteResponse,
): void {
  mapOkResponse(res);
}

export function mapAcceptOrgInviteRequest(
  req: AcceptOrgInviteRequest,
): ApiAcceptOrgInviteRequest {
  return { invite_id: req.inviteId };
}

export function mapAcceptOrgInviteResponse(
  res: ApiAcceptOrgInviteResponse,
): void {
  mapOkResponse(res);
}

export function mapDeclineOrgInviteRequest(
  req: DeclineOrgInviteRequest,
): ApiDeclineOrgInviteRequest {
  return { invite_id: req.inviteId };
}

export function mapDeclineOrgInviteResponse(
  res: ApiDeclineOrgInviteResponse,
): void {
  mapOkResponse(res);
}
