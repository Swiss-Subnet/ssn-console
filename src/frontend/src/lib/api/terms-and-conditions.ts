import {
  mapCreateTermsAndConditionsRequest,
  mapGetLatestTermsAndConditionForUserResponse,
  mapOkResponse,
  mapUpsertTermsAndConditionsDecisionRequest,
  type CreateTermsAndConditionsRequest,
  type GetLatestTermsAndConditionsResponse,
  type UpsertTermsAndConditionsDecisionRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class TermsAndConditionsApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async getLatestTermsAndConditions(): Promise<GetLatestTermsAndConditionsResponse> {
    const res = await this.actor.get_latest_terms_and_conditions();

    return mapGetLatestTermsAndConditionForUserResponse(res);
  }

  public async upsertTermsAndConditionsDecision(
    req: UpsertTermsAndConditionsDecisionRequest,
  ): Promise<void> {
    const apiReq = mapUpsertTermsAndConditionsDecisionRequest(req);

    const res = await this.actor.upsert_terms_and_conditions_decision(apiReq);
    mapOkResponse(res);
  }

  public async createTermsAndConditions(
    req: CreateTermsAndConditionsRequest,
  ): Promise<void> {
    const apiReq = mapCreateTermsAndConditionsRequest(req);

    const res = await this.actor.create_terms_and_conditions(apiReq);
    mapOkResponse(res);
  }
}
