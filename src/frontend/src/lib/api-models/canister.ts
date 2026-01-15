import type { Canister as ApiCanister } from '@ssn/backend-api';

export type ListCanistersResponse = Canister[];

export type ListMyCanistersResponse = Canister[];

export type CreateCanisterResponse = Canister;

export type Canister = {
  id: string;
  principal: string;
};

export function mapListCanistersResponse(
  res: ApiCanister[],
): ListCanistersResponse {
  return res.map(mapCanisterResponse);
}

export function mapListMyCanistersResponse(
  res: ApiCanister[],
): ListMyCanistersResponse {
  return res.map(mapCanisterResponse);
}

export function mapCreateCanisterResponse(
  res: ApiCanister,
): CreateCanisterResponse {
  return mapCanisterResponse(res);
}

export function mapCanisterResponse(res: ApiCanister): Canister {
  return {
    id: res.id,
    principal: res.principal_id,
  };
}
