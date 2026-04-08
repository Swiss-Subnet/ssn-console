import type { Actor, PocketIc } from '@dfinity/pic';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';
import { idlFactory, type _SERVICE, type Canister } from '@ssn/backend-api';
import { extractOkResponse } from './error';

export class CanisterDriver {
  private readonly actor: Actor<_SERVICE>;
  private readonly defaultIdentity = new AnonymousIdentity();

  constructor(pic: PocketIc, canisterId: Principal) {
    this.actor = pic.createActor<_SERVICE>(idlFactory, canisterId);
  }

  public async getAllProjectCanisters(
    identity: Identity,
    projectId: string,
  ): Promise<Canister[]> {
    try {
      this.actor.setIdentity(identity);

      const canisters: Canister[] = [];
      let page = 1n;
      while (true) {
        const res = await this.actor.list_project_canisters({
          project_id: projectId,
          limit: [50n],
          page: [page],
        });
        const okRes = extractOkResponse(res);
        canisters.push(...okRes.canisters);

        if (page >= okRes.meta.total_pages) break;
        page = page + 1n;
      }

      return canisters;
    } finally {
      this.actor.setIdentity(this.defaultIdentity);
    }
  }
}
