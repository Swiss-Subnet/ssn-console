import { generateLinkCode } from '@/lib/api-models';
import type { AppStateCreator, PrincipalLinkSlice } from '@/lib/store/model';

export const createPrincipalLinkSlice: AppStateCreator<PrincipalLinkSlice> = (
  set,
  get,
) => ({
  linkedPrincipals: null,
  pendingLinkCode: null,

  async loadLinkedPrincipals() {
    const { principalLinkApi, isAuthenticated } = get();
    if (!isAuthenticated) {
      return;
    }

    const principals = await principalLinkApi.listMyLinkedPrincipals();
    set({ linkedPrincipals: principals });
  },

  async loadPendingLinkCode() {
    const { principalLinkApi, isAuthenticated } = get();
    if (!isAuthenticated) {
      return;
    }

    const pending = await principalLinkApi.getMyPendingLinkCode();
    set({ pendingLinkCode: pending });
  },

  clearLinkedPrincipals() {
    set({ linkedPrincipals: null, pendingLinkCode: null });
  },

  async createLinkCode(targetPrincipal) {
    const { principalLinkApi } = get();
    const code = generateLinkCode();
    const { expiresAtNanos } = await principalLinkApi.registerLinkCode(
      code,
      targetPrincipal,
    );

    set({ pendingLinkCode: { code, expiresAtNanos, targetPrincipal } });

    return { code, expiresAtNanos };
  },

  async linkMyPrincipal(code) {
    const { principalLinkApi } = get();
    await principalLinkApi.linkMyPrincipal(code);
    // Caller may not be in our cached list (they linked from a different
    // identity); next loadLinkedPrincipals from any of the user's
    // principals will see the update.
  },

  async unlinkMyPrincipal(principal) {
    const { principalLinkApi } = get();
    await principalLinkApi.unlinkMyPrincipal(principal);

    set(state => ({
      linkedPrincipals:
        state.linkedPrincipals?.filter(p => p.principal !== principal) ?? null,
    }));
  },

  async revokeMyLinkCode() {
    const { principalLinkApi } = get();
    await principalLinkApi.revokeMyLinkCode();
    set({ pendingLinkCode: null });
  },

  async setMyPrincipalName(principal, name) {
    const { principalLinkApi } = get();
    await principalLinkApi.setMyPrincipalName(principal, name);

    set(state => ({
      linkedPrincipals:
        state.linkedPrincipals?.map(p =>
          p.principal === principal ? { ...p, name } : p,
        ) ?? null,
    }));
  },
});
