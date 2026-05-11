import { generateLinkCode } from '@/lib/api-models';
import type { AppStateCreator, PrincipalLinkSlice } from '@/lib/store/model';

export const createPrincipalLinkSlice: AppStateCreator<PrincipalLinkSlice> = (
  set,
  get,
) => ({
  linkedPrincipals: null,
  pendingLinkCodes: null,

  async loadLinkedPrincipals() {
    const { principalLinkApi, isAuthenticated } = get();
    if (!isAuthenticated) {
      return;
    }

    const principals = await principalLinkApi.listMyLinkedPrincipals();
    set({ linkedPrincipals: principals });
  },

  async loadPendingLinkCodes() {
    const { principalLinkApi, isAuthenticated } = get();
    if (!isAuthenticated) {
      return;
    }

    const codes = await principalLinkApi.listMyPendingLinkCodes();
    set({ pendingLinkCodes: codes });
  },

  clearLinkedPrincipals() {
    set({ linkedPrincipals: null, pendingLinkCodes: null });
  },

  async createLinkCode(targetPrincipal) {
    const { principalLinkApi } = get();
    const code = generateLinkCode();
    const { expiresAtNanos } = await principalLinkApi.registerLinkCode(
      code,
      targetPrincipal,
    );

    set(state => ({
      pendingLinkCodes: [
        ...(state.pendingLinkCodes ?? []),
        { code, expiresAtNanos, targetPrincipal },
      ],
    }));

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
        state.linkedPrincipals?.filter(p => p !== principal) ?? null,
    }));
  },

  async revokeLinkCode(code) {
    const { principalLinkApi } = get();
    await principalLinkApi.revokeLinkCode(code);

    set(state => ({
      pendingLinkCodes:
        state.pendingLinkCodes?.filter(c => c.code !== code) ?? null,
    }));
  },
});
