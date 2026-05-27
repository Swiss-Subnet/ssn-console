import { mapOkResponse } from '@/lib/api-models/error';
import type {
  GetOrgBillingPlanRequest as ApiGetOrgBillingPlanRequest,
  GetOrgBillingPlanResponse as ApiGetOrgBillingPlanResponse,
  ListMyOrgBillingPlansResponse as ApiListMyOrgBillingPlansResponse,
  MyOrgBillingPlan as ApiMyOrgBillingPlan,
  SetOrgBillingPlanRequest as ApiSetOrgBillingPlanRequest,
  SetOrgBillingPlanResponse as ApiSetOrgBillingPlanResponse,
  PlanTier as ApiPlanTier,
} from '@ssn/backend-api';

export enum PlanTier {
  Free = 'Free',
  Pro = 'Pro',
  Enterprise = 'Enterprise',
}

export function mapPlanTier(tier: ApiPlanTier): PlanTier {
  if ('Free' in tier) return PlanTier.Free;
  if ('Pro' in tier) return PlanTier.Pro;
  return PlanTier.Enterprise;
}

function mapPlanTierRequest(tier: PlanTier): ApiPlanTier {
  switch (tier) {
    case PlanTier.Free:
      return { Free: null };
    case PlanTier.Pro:
      return { Pro: null };
    case PlanTier.Enterprise:
      return { Enterprise: null };
  }
}

export type GetOrgBillingPlanRequest = {
  orgId: string;
};

export function mapGetOrgBillingPlanRequest(
  req: GetOrgBillingPlanRequest,
): ApiGetOrgBillingPlanRequest {
  return { org_id: req.orgId };
}

export type OrgBillingPlan = {
  tier: PlanTier;
  maxCanisters: number;
  canistersUsed: number;
  maxStorageBytes: bigint | null;
};

export function mapGetOrgBillingPlanResponse(
  res: ApiGetOrgBillingPlanResponse,
): OrgBillingPlan {
  const ok = mapOkResponse(res);
  return {
    tier: mapPlanTier(ok.tier),
    maxCanisters: ok.max_canisters,
    canistersUsed: ok.canisters_used,
    maxStorageBytes: ok.max_storage_bytes[0] ?? null,
  };
}

export type SetOrgBillingPlanRequest = {
  orgId: string;
  tier: PlanTier;
};

export function mapSetOrgBillingPlanRequest(
  req: SetOrgBillingPlanRequest,
): ApiSetOrgBillingPlanRequest {
  return {
    org_id: req.orgId,
    tier: mapPlanTierRequest(req.tier),
  };
}

export function mapSetOrgBillingPlanResponse(
  res: ApiSetOrgBillingPlanResponse,
): void {
  mapOkResponse(res);
}

export type MyOrgBillingPlan = {
  orgId: string;
  tier: PlanTier;
  maxCanisters: number;
  canistersUsed: number;
  maxStorageBytes: bigint | null;
};

function mapMyOrgBillingPlan(api: ApiMyOrgBillingPlan): MyOrgBillingPlan {
  return {
    orgId: api.org_id,
    tier: mapPlanTier(api.tier),
    maxCanisters: api.max_canisters,
    canistersUsed: api.canisters_used,
    maxStorageBytes: api.max_storage_bytes[0] ?? null,
  };
}

export function mapListMyOrgBillingPlansResponse(
  res: ApiListMyOrgBillingPlansResponse,
): MyOrgBillingPlan[] {
  return mapOkResponse(res).map(mapMyOrgBillingPlan);
}
