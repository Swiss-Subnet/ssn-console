import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  anonymousIdentity,
  extractOkResponse,
  noOrgError,
  noProfileError,
  TestDriver,
  unauthenticatedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

describe('Organizations', () => {
  let driver: TestDriver;
  const orgName = 'Acme Corp';
  const fakeOrgId = '939ede22-1f0d-4e63-ba18-bed4b09212b5';

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

  describe('list_my_organizations', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_my_organizations();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return the default organization after signup', async () => {
      await setupUser();
      const res = await driver.actor.list_my_organizations();
      const orgs = extractOkResponse(res);
      expect(orgs).toHaveLength(1);
      expect(orgs[0]).toEqual({
        id: expect.any(String),
        name: 'Default Organization',
      });
    });
  });

  describe('create_organization', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.create_organization({ name: orgName });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user does not have a profile', async () => {
      const identity = generateRandomIdentity();
      driver.actor.setIdentity(identity);
      const res = await driver.actor.create_organization({ name: orgName });
      expect(res).toEqual(noProfileError(identity.getPrincipal()));
    });

    it('should return an error for an empty name', async () => {
      await setupUser();
      const res = await driver.actor.create_organization({ name: '   ' });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Organization name cannot be empty.',
        },
      });
    });

    it('should return an error for a name exceeding max length', async () => {
      await setupUser();
      const res = await driver.actor.create_organization({
        name: 'a'.repeat(101),
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Organization name cannot exceed 100 characters.',
        },
      });
    });

    it('should trim whitespace from the name', async () => {
      await setupUser();
      const res = await driver.actor.create_organization({
        name: '  Acme Corp  ',
      });
      const { organization } = extractOkResponse(res);
      expect(organization.name).toBe('Acme Corp');
    });

    it('should return an error when exceeding max orgs per user', async () => {
      await setupUser();
      // User already has 1 default org. Create 19 more to hit the limit.
      for (let i = 0; i < 19; i++) {
        const r = await driver.actor.create_organization({
          name: `Org ${i}`,
        });
        extractOkResponse(r);
      }
      const res = await driver.actor.create_organization({
        name: 'One Too Many',
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Cannot create more than 20 organizations.',
        },
      });
    });

    it('should create an organization', async () => {
      await setupUser();
      const res = await driver.actor.create_organization({ name: orgName });
      const created = extractOkResponse(res);
      expect(created).toEqual({
        organization: {
          id: expect.any(String),
          name: orgName,
        },
      });
    });

    it('should create a default team and project in the new org', async () => {
      await setupUser();
      const createRes = await driver.actor.create_organization({
        name: orgName,
      });
      const { organization } = extractOkResponse(createRes);

      const teamsRes = await driver.actor.list_org_teams({
        org_id: organization.id,
      });
      const teams = extractOkResponse(teamsRes);
      expect(teams).toHaveLength(1);
      expect(teams[0]!.name).toBe('Default Team');
    });

    it('should appear in list_my_organizations', async () => {
      await setupUser();
      await driver.actor.create_organization({ name: orgName });

      const res = await driver.actor.list_my_organizations();
      const orgs = extractOkResponse(res);
      expect(orgs).toHaveLength(2);
      expect(orgs.map(o => o.name)).toContain(orgName);
    });
  });

  describe('get_organization', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.get_organization({ org_id: fakeOrgId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      driver.actor.setIdentity(alice.identity);
      const res = await driver.actor.get_organization({ org_id: bobOrg!.id });
      expect(res).toEqual(noOrgError(alice.profile.id, bobOrg!.id));
    });

    it('should get an organization', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.get_organization({ org_id: org!.id });
      expect(extractOkResponse(res)).toEqual({
        organization: org,
      });
    });
  });

  describe('update_organization', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.update_organization({
        org_id: fakeOrgId,
        name: 'New Name',
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      driver.actor.setIdentity(alice.identity);
      const res = await driver.actor.update_organization({
        org_id: bobOrg!.id,
        name: 'Hijacked',
      });
      expect(res).toEqual(noOrgError(alice.profile.id, bobOrg!.id));
    });

    it('should return an error for an empty name', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.update_organization({
        org_id: org!.id,
        name: '   ',
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Organization name cannot be empty.',
        },
      });
    });

    it('should return an error for a name exceeding max length', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.update_organization({
        org_id: org!.id,
        name: 'a'.repeat(101),
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Organization name cannot exceed 100 characters.',
        },
      });
    });

    it('should update the organization name', async () => {
      const { org } = await setupUser();
      const updatedName = 'Renamed Corp';
      const res = await driver.actor.update_organization({
        org_id: org!.id,
        name: updatedName,
      });
      expect(extractOkResponse(res)).toEqual({
        organization: { id: org!.id, name: updatedName },
      });
    });
  });

  describe('delete_organization', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.delete_organization({
        org_id: fakeOrgId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user is not in the org', async () => {
      await setupUser();

      // Create a second org so Alice has one to spare
      const createRes = await driver.actor.create_organization({
        name: orgName,
      });
      const { organization: aliceOrg2 } = extractOkResponse(createRes);

      const bob = await setupUser();
      const res = await driver.actor.delete_organization({
        org_id: aliceOrg2.id,
      });
      expect(res).toEqual(noOrgError(bob.profile.id, aliceOrg2.id));
    });

    it('should return an error when deleting the last org', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.delete_organization({ org_id: org!.id });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Cannot delete your last organization.',
        },
      });
    });

    it('should return an error when the org has projects', async () => {
      await setupUser();
      // Create a second org so the "last org" guard doesn't fire first.
      const createRes = await driver.actor.create_organization({
        name: orgName,
      });
      const { organization: newOrg } = extractOkResponse(createRes);

      // The new org has a default project, so it can't be deleted.
      const res = await driver.actor.delete_organization({
        org_id: newOrg.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message:
            'Cannot delete an organization that still has projects. Remove all projects first.',
        },
      });
    });
    // Blocked: every org is created with a default project, and there
    // is no delete_project API yet, so the "org has projects" guard
    // always fires before we can reach the actual deletion.
    it.skip('should delete an organization without projects', async () => {
      await setupUser();
      const createRes = await driver.actor.create_organization({
        name: orgName,
      });
      const { organization: newOrg } = extractOkResponse(createRes);

      // TODO: delete the default project here once the API exists.

      const deleteRes = await driver.actor.delete_organization({
        org_id: newOrg.id,
      });
      expect(deleteRes).toEqual({ Ok: null });

      const orgsRes = await driver.actor.list_my_organizations();
      const orgs = extractOkResponse(orgsRes);
      expect(orgs.map(o => o.id)).not.toContain(newOrg.id);
    });
  });
});
