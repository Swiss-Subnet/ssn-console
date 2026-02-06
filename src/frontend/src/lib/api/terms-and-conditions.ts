import {
  mapCreateTermsAndConditionsRequest,
  mapGetLatestTermsAndConditionForUserResponse,
  mapUpsertTermsAndConditionsResponseRequest,
  type CreateTermsAndConditionsRequest,
  type GetLatestTermsAndConditionsResponse,
  type UpsertTermsAndConditionsResponseRequest,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class TermsAndConditionsApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async getLatestTermsAndConditions(): Promise<GetLatestTermsAndConditionsResponse> {
    const res = await this.actor.get_latest_terms_and_conditions();

    return mapGetLatestTermsAndConditionForUserResponse(res);
  }

  public async upsertTermsAndConditionsResponse(
    req: UpsertTermsAndConditionsResponseRequest,
  ): Promise<void> {
    const apiReq = mapUpsertTermsAndConditionsResponseRequest(req);

    await this.actor.upsert_terms_and_conditions_response(apiReq);
  }

  public async createTermsAndConditions(
    req: CreateTermsAndConditionsRequest,
  ): Promise<void> {
    const apiReq = mapCreateTermsAndConditionsRequest(req);

    await this.actor.create_terms_and_conditions(apiReq);
  }
}
