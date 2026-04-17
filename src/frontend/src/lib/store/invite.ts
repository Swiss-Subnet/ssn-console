import type { CreateOrgInviteRequest, OrgInvite } from '@/lib/api-models';
import type { AppStateCreator, InvitesSlice } from '@/lib/store/model';

export const createInvitesSlice: AppStateCreator<InvitesSlice> = (
  set,
  get,
) => ({
  isMyInvitesInitialized: false,
  myInvites: [],

  async initializeMyInvites() {
    const { inviteApi, isAuthenticated } = get();
    if (!isAuthenticated) {
      set({ isMyInvitesInitialized: true });
      return;
    }

    try {
      const invites = await inviteApi.listMyInvites();
      set({ myInvites: invites });
    } finally {
      set({ isMyInvitesInitialized: true });
    }
  },

  clearMyInvites() {
    set({ myInvites: [], isMyInvitesInitialized: false });
  },

  async refreshMyInvites() {
    const invites = await get().inviteApi.listMyInvites();
    set({ myInvites: invites });
  },

  async createOrgInvite(req: CreateOrgInviteRequest): Promise<OrgInvite> {
    return get().inviteApi.createOrgInvite(req);
  },

  async listOrgInvites(orgId: string): Promise<OrgInvite[]> {
    return get().inviteApi.listOrgInvites({ orgId });
  },

  async revokeOrgInvite(inviteId: string): Promise<void> {
    await get().inviteApi.revokeOrgInvite({ inviteId });
  },

  async acceptOrgInvite(inviteId: string): Promise<void> {
    await get().inviteApi.acceptOrgInvite({ inviteId });
    set(state => ({
      myInvites: state.myInvites.filter(i => i.id !== inviteId),
    }));
    await get().initializeOrganizations();
  },

  async declineOrgInvite(inviteId: string): Promise<void> {
    await get().inviteApi.declineOrgInvite({ inviteId });
    set(state => ({
      myInvites: state.myInvites.filter(i => i.id !== inviteId),
    }));
  },
});
