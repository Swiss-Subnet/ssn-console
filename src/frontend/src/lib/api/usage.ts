import {
  mapGetUsageRequest,
  mapGetUsageResponse,
  type GetUsageRequest,
  type GetUsageResponse,
} from '@/lib/api-models';
import type { _SERVICE as BACKEND_API_SERVICE } from '@ssn/backend-api';
import type { ActorSubclass } from '@icp-sdk/core/agent';

export class UsageApi {
  constructor(private readonly actor: ActorSubclass<BACKEND_API_SERVICE>) {}

  async getUsage(req: GetUsageRequest): Promise<GetUsageResponse> {
    const res = await this.actor.get_usage(mapGetUsageRequest(req));
    return mapGetUsageResponse(res);
  }
}
