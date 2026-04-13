import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  anonymousIdentity,
  createTestJwt,
  extractOkResponse,
  noOrgError,
  noProfileError,
  PRIVATE_KEY,
  TestDriver,
  unauthenticatedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

describe('Org Invites', () => {
  let driver: TestDriver;
  const fakeOrgId = '939ede22-1f0d-4e63-ba18-bed4b09212b5';
  const fakeInviteId = '839ede22-1f0d-4e63-ba18-bed4b09212b5';
  const fakeUserId = '11111111-1111-1111-1111-111111111111';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const TTL_MS = 7 * DAY_MS;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  async function setupUser() {
    const identity = generateRandomIdentity();
    driver.actor.setIdentity(identity);
    const profileRes = await driver.actor.create_my_user_profile();
    const profile = extractOkResponse(profileRes);
    const orgsRes = await driver.actor.list_my_organizations();
    const [org] = extractOkResponse(orgsRes);
    return { identity, profile, org };
  }

  async function setVerifiedEmail(email: string): Promise<void> {
    await driver.actor.update_my_user_profile({ email: [email] });
    const token = await createTestJwt(email, PRIVATE_KEY);
    const res = await driver.actor.verify_my_email({ token });
    extractOkResponse(res);
  }

  describe('create_org_invite', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.create_org_invite({
        org_id: fakeOrgId,
        target: { Email: 'bob@example.com' },
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user has no profile', async () => {
      const identity = generateRandomIdentity();
      driver.actor.setIdentity(identity);
      const res = await driver.actor.create_org_invite({
        org_id: fakeOrgId,
        target: { Email: 'bob@example.com' },
      });
      expect(res).toEqual(noProfileError(identity.getPrincipal()));
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();

      const bob = await setupUser();
      const res = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { Email: 'carol@example.com' },
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should return an error for an invalid email', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Email: 'not-an-email' },
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: "Email must contain an '@' symbol.",
        },
      });
    });

    it('should create an invite targeting an email', async () => {
      const { org, profile } = await setupUser();
      const res = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Email: 'bob@example.com' },
      });
      const { invite } = extractOkResponse(res);
      expect(invite.org_id).toBe(org.id);
      expect(invite.org_name).toBe(org.name);
      expect(invite.created_by).toBe(profile.id);
      expect(invite.target).toEqual({ Email: 'bob@example.com' });
      expect(invite.status).toEqual({ Pending: null });
      expect(invite.expires_at_ns).toBeGreaterThan(invite.created_at_ns);
    });

    it('should create an invite targeting a user id', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { UserId: fakeUserId },
      });
      const { invite } = extractOkResponse(res);
      expect(invite.target).toEqual({ UserId: fakeUserId });
    });

    it('should create an invite targeting a principal', async () => {
      const { org } = await setupUser();
      const target = generateRandomIdentity().getPrincipal();
      const res = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Principal: target },
      });
      const { invite } = extractOkResponse(res);
      expect(invite.target).toEqual({ Principal: target });
    });

    it('should reject the 11th pending invite in an org', async () => {
      const { org } = await setupUser();
      for (let i = 0; i < 10; i++) {
        const r = await driver.actor.create_org_invite({
          org_id: org.id,
          target: { Email: `invitee${i}@example.com` },
        });
        extractOkResponse(r);
      }
      const res = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Email: 'one-too-many@example.com' },
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Cannot have more than 10 pending invites per organization.',
        },
      });
    });

    it('should sweep expired invites before enforcing the pending cap', async () => {
      const { org } = await setupUser();
      for (let i = 0; i < 10; i++) {
        const r = await driver.actor.create_org_invite({
          org_id: org.id,
          target: { Email: `invitee${i}@example.com` },
        });
        extractOkResponse(r);
      }

      await driver.pic.advanceTime(TTL_MS + 1000);
      await driver.pic.tick();

      // Previous 10 are expired; the sweep on create should let an 11th through.
      const res = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Email: 'fresh@example.com' },
      });
      extractOkResponse(res);
    });
  });

  describe('list_org_invites', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_org_invites({ org_id: fakeOrgId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const bob = await setupUser();
      const res = await driver.actor.list_org_invites({ org_id: alice.org.id });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should not show invites created by other org members', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      // Bob joins alice's org.
      driver.actor.setIdentity(alice.identity);
      const joinRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite: joinInvite } = extractOkResponse(joinRes);
      driver.actor.setIdentity(bob.identity);
      extractOkResponse(
        await driver.actor.accept_org_invite({ invite_id: joinInvite.id }),
      );

      // Alice invites carol; bob (same org, not the creator) must not see it.
      driver.actor.setIdentity(alice.identity);
      await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { Email: 'carol@example.com' },
      });

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.list_org_invites({ org_id: alice.org.id });
      expect(extractOkResponse(res)).toEqual([]);
    });

    it('should list pending invites and omit expired ones', async () => {
      const { org } = await setupUser();
      await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Email: 'bob@example.com' },
      });
      const beforeRes = await driver.actor.list_org_invites({ org_id: org.id });
      expect(extractOkResponse(beforeRes)).toHaveLength(1);

      await driver.pic.advanceTime(TTL_MS + 1000);
      await driver.pic.tick();

      const afterRes = await driver.actor.list_org_invites({ org_id: org.id });
      expect(extractOkResponse(afterRes)).toHaveLength(0);
    });
  });

  describe('revoke_org_invite', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.revoke_org_invite({
        invite_id: fakeInviteId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent invite', async () => {
      await setupUser();
      const res = await driver.actor.revoke_org_invite({
        invite_id: fakeInviteId,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Invite with id ${fakeInviteId} does not exist.`,
        },
      });
    });

    it('should return an error if the caller is not in the inviting org', async () => {
      const alice = await setupUser();
      driver.actor.setIdentity(alice.identity);
      const createRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { Email: 'bob@example.com' },
      });
      const { invite } = extractOkResponse(createRes);

      const bob = await setupUser();
      const res = await driver.actor.revoke_org_invite({
        invite_id: invite.id,
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should mark the invite as Revoked', async () => {
      const { org } = await setupUser();
      const createRes = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Email: 'bob@example.com' },
      });
      const { invite } = extractOkResponse(createRes);

      const revokeRes = await driver.actor.revoke_org_invite({
        invite_id: invite.id,
      });
      expect(revokeRes).toEqual({ Ok: {} });

      const listRes = await driver.actor.list_org_invites({ org_id: org.id });
      const invites = extractOkResponse(listRes);
      expect(invites).toHaveLength(1);
      expect(invites[0].status).toEqual({ Revoked: null });
    });

    it('should reject revocation by an org member who did not create the invite', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      // Bob joins alice's org via an invite he accepts.
      driver.actor.setIdentity(alice.identity);
      const joinRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite: joinInvite } = extractOkResponse(joinRes);
      driver.actor.setIdentity(bob.identity);
      extractOkResponse(
        await driver.actor.accept_org_invite({ invite_id: joinInvite.id }),
      );

      // Alice creates an invite for carol; bob (same org) must not revoke it.
      driver.actor.setIdentity(alice.identity);
      const createRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { Email: 'carol@example.com' },
      });
      const { invite } = extractOkResponse(createRes);

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.revoke_org_invite({
        invite_id: invite.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ Unauthorized: {} }],
          message: 'Only the inviter can revoke this invite.',
        },
      });
    });

    it('should error when revoking a non-pending invite', async () => {
      const { org } = await setupUser();
      const createRes = await driver.actor.create_org_invite({
        org_id: org.id,
        target: { Email: 'bob@example.com' },
      });
      const { invite } = extractOkResponse(createRes);
      await driver.actor.revoke_org_invite({ invite_id: invite.id });

      const res = await driver.actor.revoke_org_invite({
        invite_id: invite.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Only pending invites can be revoked.',
        },
      });
    });
  });

  describe('list_my_invites', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_my_invites();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an empty list when no invites exist', async () => {
      await setupUser();
      const res = await driver.actor.list_my_invites();
      expect(extractOkResponse(res)).toEqual([]);
    });

    it('should match an invite targeted at the user id', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(alice.identity);
      await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.list_my_invites();
      const invites = extractOkResponse(res);
      expect(invites).toHaveLength(1);
      expect(invites[0].org_id).toBe(alice.org.id);
    });

    it('should match an invite targeted at a principal the user owns', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(alice.identity);
      await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { Principal: bob.identity.getPrincipal() },
      });

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.list_my_invites();
      expect(extractOkResponse(res)).toHaveLength(1);
    });

    it('should NOT match an email invite when the email is unverified', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(bob.identity);
      await driver.actor.update_my_user_profile({
        email: ['bob@example.com'],
      });

      driver.actor.setIdentity(alice.identity);
      await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { Email: 'bob@example.com' },
      });

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.list_my_invites();
      expect(extractOkResponse(res)).toEqual([]);
    });

    it('should match an email invite once the email is verified', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(bob.identity);
      await setVerifiedEmail('bob@example.com');

      driver.actor.setIdentity(alice.identity);
      await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { Email: 'bob@example.com' },
      });

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.list_my_invites();
      expect(extractOkResponse(res)).toHaveLength(1);
    });

    it('should omit expired invites', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(alice.identity);
      await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });

      await driver.pic.advanceTime(TTL_MS + 1000);
      await driver.pic.tick();

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.list_my_invites();
      expect(extractOkResponse(res)).toEqual([]);
    });
  });

  describe('accept_org_invite', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.accept_org_invite({
        invite_id: fakeInviteId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent invite', async () => {
      await setupUser();
      const res = await driver.actor.accept_org_invite({
        invite_id: fakeInviteId,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Invite with id ${fakeInviteId} does not exist.`,
        },
      });
    });

    it('should reject acceptance by a non-target user', async () => {
      const alice = await setupUser();
      const bob = await setupUser();
      const carol = await setupUser();

      driver.actor.setIdentity(alice.identity);
      const createRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite } = extractOkResponse(createRes);

      driver.actor.setIdentity(carol.identity);
      const res = await driver.actor.accept_org_invite({
        invite_id: invite.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ Unauthorized: {} }],
          message: 'Invite is not addressed to the caller.',
        },
      });
    });

    it('should reject acceptance of an expired invite', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(alice.identity);
      const createRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite } = extractOkResponse(createRes);

      await driver.pic.advanceTime(TTL_MS + 1000);
      await driver.pic.tick();

      driver.actor.setIdentity(bob.identity);
      const res = await driver.actor.accept_org_invite({
        invite_id: invite.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Invite has expired.',
        },
      });
    });

    it('should add the user to the org on accept and mark the invite Accepted', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(alice.identity);
      const createRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite } = extractOkResponse(createRes);

      driver.actor.setIdentity(bob.identity);
      const acceptRes = await driver.actor.accept_org_invite({
        invite_id: invite.id,
      });
      expect(acceptRes).toEqual({ Ok: {} });

      const orgsRes = await driver.actor.list_my_organizations();
      const orgs = extractOkResponse(orgsRes);
      expect(orgs.map(o => o.id)).toContain(alice.org.id);

      driver.actor.setIdentity(alice.identity);
      const listRes = await driver.actor.list_org_invites({
        org_id: alice.org.id,
      });
      const invites = extractOkResponse(listRes);
      expect(invites[0].status).toEqual({ Accepted: null });
    });

    it('should reject a second acceptance of the same invite', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(alice.identity);
      const createRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite } = extractOkResponse(createRes);

      driver.actor.setIdentity(bob.identity);
      await driver.actor.accept_org_invite({ invite_id: invite.id });

      const res = await driver.actor.accept_org_invite({
        invite_id: invite.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Invite is no longer pending.',
        },
      });
    });
  });

  describe('decline_org_invite', () => {
    it('should mark the invite Declined without adding the user to the org', async () => {
      const alice = await setupUser();
      const bob = await setupUser();

      driver.actor.setIdentity(alice.identity);
      const createRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite } = extractOkResponse(createRes);

      driver.actor.setIdentity(bob.identity);
      const declineRes = await driver.actor.decline_org_invite({
        invite_id: invite.id,
      });
      expect(declineRes).toEqual({ Ok: {} });

      const orgsRes = await driver.actor.list_my_organizations();
      const orgs = extractOkResponse(orgsRes);
      expect(orgs.map(o => o.id)).not.toContain(alice.org.id);

      driver.actor.setIdentity(alice.identity);
      const listRes = await driver.actor.list_org_invites({
        org_id: alice.org.id,
      });
      const invites = extractOkResponse(listRes);
      expect(invites[0].status).toEqual({ Declined: null });
    });
  });
});
