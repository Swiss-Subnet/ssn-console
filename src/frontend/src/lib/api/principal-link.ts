import {
  mapLinkMyPrincipalRequest,
  mapLinkMyPrincipalResponse,
  mapListMyLinkedPrincipalsResponse,
  mapListMyPendingLinkCodesResponse,
  mapRegisterLinkCodeRequest,
  mapRegisterLinkCodeResponse,
  mapRevokeLinkCodeRequest,
  mapRevokeLinkCodeResponse,
  mapUnlinkMyPrincipalRequest,
  mapUnlinkMyPrincipalResponse,
  type PendingLinkCode,
} from '@/lib/api-models';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class PrincipalLinkApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async registerLinkCode(
    code: string,
  ): Promise<{ expiresAtNanos: bigint }> {
    const res = await this.actor.register_link_code(
      mapRegisterLinkCodeRequest(code),
    );
    return mapRegisterLinkCodeResponse(res);
  }

  public async linkMyPrincipal(code: string): Promise<void> {
    const res = await this.actor.link_my_principal(
      mapLinkMyPrincipalRequest(code),
    );
    mapLinkMyPrincipalResponse(res);
  }

  public async unlinkMyPrincipal(principal: string): Promise<void> {
    const res = await this.actor.unlink_my_principal(
      mapUnlinkMyPrincipalRequest(principal),
    );
    mapUnlinkMyPrincipalResponse(res);
  }

  public async listMyLinkedPrincipals(): Promise<string[]> {
    const res = await this.actor.list_my_linked_principals({});
    return mapListMyLinkedPrincipalsResponse(res);
  }

  public async listMyPendingLinkCodes(): Promise<PendingLinkCode[]> {
    const res = await this.actor.list_my_pending_link_codes({});
    return mapListMyPendingLinkCodesResponse(res);
  }

  public async revokeLinkCode(code: string): Promise<void> {
    const res = await this.actor.revoke_link_code(
      mapRevokeLinkCodeRequest(code),
    );
    mapRevokeLinkCodeResponse(res);
  }
}
