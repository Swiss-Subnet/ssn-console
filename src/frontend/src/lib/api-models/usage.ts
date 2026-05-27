import { mapOkResponse } from '@/lib/api-models/error';
import { toCandidOpt } from '@/lib/utils';
import type {
  GetUsageRequest as ApiGetUsageRequest,
  GetUsageResponse as ApiGetUsageResponse,
  ProjectUsage as ApiProjectUsage,
  CanisterUsage as ApiCanisterUsage,
} from '@ssn/backend-api';

export type GetUsageRequest = {
  projectId: string;
  billingMonth?: string | null;
};

export function mapGetUsageRequest(req: GetUsageRequest): ApiGetUsageRequest {
  return {
    project_id: req.projectId,
    billing_month: toCandidOpt(req.billingMonth),
  };
}

export type ProjectUsage = {
  memory: bigint;
  memoryBytes: bigint;
  computeAllocation: bigint;
  computeAllocationPercent: bigint;
  ingressInduction: bigint;
  ingressInductionBytesTotal: bigint;
  instructions: bigint;
  computeTimeSecondsTotal: bigint;
  requestAndResponseTransmission: bigint;
  transmissionBytesTotal: bigint;
  uninstall: bigint;
  uninstallsTotal: bigint;
  httpOutcalls: bigint;
  burnedCycles: bigint;
};

function mapProjectUsage(api: ApiProjectUsage): ProjectUsage {
  return {
    memory: api.memory,
    memoryBytes: api.memory_bytes,
    computeAllocation: api.compute_allocation,
    computeAllocationPercent: api.compute_allocation_percent,
    ingressInduction: api.ingress_induction,
    ingressInductionBytesTotal: api.ingress_induction_bytes_total,
    instructions: api.instructions,
    computeTimeSecondsTotal: api.compute_time_seconds_total,
    requestAndResponseTransmission: api.request_and_response_transmission,
    transmissionBytesTotal: api.transmission_bytes_total,
    uninstall: api.uninstall,
    uninstallsTotal: api.uninstalls_total,
    httpOutcalls: api.http_outcalls,
    burnedCycles: api.burned_cycles,
  };
}

export type CanisterUsage = {
  canisterId: string;
  memory: bigint;
  memoryBytes: bigint;
  computeAllocation: bigint;
  computeAllocationPercent: bigint;
  ingressInduction: bigint;
  ingressInductionBytesTotal: bigint;
  instructions: bigint;
  computeTimeSecondsTotal: bigint;
  requestAndResponseTransmission: bigint;
  transmissionBytesTotal: bigint;
  uninstall: bigint;
  uninstallsTotal: bigint;
  httpOutcalls: bigint;
  burnedCycles: bigint;
};

function mapCanisterUsage(api: ApiCanisterUsage): CanisterUsage {
  return {
    canisterId: api.canister_id.toText(),
    memory: api.memory,
    memoryBytes: api.memory_bytes,
    computeAllocation: api.compute_allocation,
    computeAllocationPercent: api.compute_allocation_percent,
    ingressInduction: api.ingress_induction,
    ingressInductionBytesTotal: api.ingress_induction_bytes_total,
    instructions: api.instructions,
    computeTimeSecondsTotal: api.compute_time_seconds_total,
    requestAndResponseTransmission: api.request_and_response_transmission,
    transmissionBytesTotal: api.transmission_bytes_total,
    uninstall: api.uninstall,
    uninstallsTotal: api.uninstalls_total,
    httpOutcalls: api.http_outcalls,
    burnedCycles: api.burned_cycles,
  };
}

export type GetUsageResponse = {
  project: ProjectUsage;
  canisters: CanisterUsage[];
};

export function mapGetUsageResponse(
  res: ApiGetUsageResponse,
): GetUsageResponse {
  const ok = mapOkResponse(res);
  return {
    project: mapProjectUsage(ok.project),
    canisters: ok.canisters.map(mapCanisterUsage),
  };
}
