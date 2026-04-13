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

describe('Projects', () => {
  let driver: TestDriver;
  const projectName = 'RWA - Production';
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

  describe('list_org_projects', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_org_projects({ org_id: fakeOrgId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user does not have a profile', async () => {
      const identity = generateRandomIdentity();
      driver.actor.setIdentity(identity);
      const res = await driver.actor.list_org_projects({ org_id: fakeOrgId });
      expect(res).toEqual(noProfileError(identity.getPrincipal()));
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      driver.actor.setIdentity(alice.identity);
      const res = await driver.actor.list_org_projects({ org_id: bobOrg.id });
      expect(res).toEqual(noOrgError(alice.profile.id, bobOrg.id));
    });

    it('should list the default project after signup', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.list_org_projects({ org_id: org.id });
      const projects = extractOkResponse(res);
      expect(projects).toEqual({
        projects: [
          {
            id: expect.any(String),
            org_id: org.id,
            name: 'Default Project',
          },
        ],
      });
    });

    it('should list created projects in the org', async () => {
      const { org } = await setupUser();

      await driver.actor.create_project({ org_id: org.id, name: projectName });
      await driver.actor.create_project({
        org_id: org.id,
        name: 'Second Project',
      });

      const res = await driver.actor.list_org_projects({ org_id: org.id });
      const { projects } = extractOkResponse(res);
      expect(projects).toHaveLength(3);
      const names = projects.map((p: { name: string }) => p.name).sort();
      expect(names).toEqual(['Default Project', 'Second Project', projectName].sort());
    });

    it('should not list projects from other orgs', async () => {
      const alice = await setupUser();
      await driver.actor.create_project({
        org_id: alice.org.id,
        name: projectName,
      });

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      const res = await driver.actor.list_org_projects({ org_id: bobOrg.id });
      const { projects } = extractOkResponse(res);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Default Project');
    });
  });

  describe('create_project', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.create_project({
        name: projectName,
        org_id: fakeOrgId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the organization does not exist', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);

      const res = await driver.actor.create_project({
        name: projectName,
        org_id: fakeOrgId,
      });
      expect(res).toEqual(noOrgError(aliceProfile.id, fakeOrgId));
    });

    it('should return an error if the user does not have a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_project({
        name: projectName,
        org_id: fakeOrgId,
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should return an error if the user is not in the organization', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();

      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.create_project({
        name: projectName,
        org_id: bobOrg!.id,
      });
      expect(res).toEqual(noOrgError(aliceProfile.id, bobOrg!.id));
    });

    it('should create a project', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const aliceOrgsRes = await driver.actor.list_my_organizations();
      const [aliceOrg] = extractOkResponse(aliceOrgsRes);

      const projectRes = await driver.actor.create_project({
        name: projectName,
        org_id: aliceOrg!.id,
      });
      const project = extractOkResponse(projectRes);

      expect(project).toEqual({
        project: {
          id: expect.any(String),
          org_id: aliceOrg!.id,
          name: projectName,
        },
      });
    });
  });
});
