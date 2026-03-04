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
        org_id: bobOrg.id,
      });
      expect(res).toEqual(noOrgError(aliceProfile.id, bobOrg.id));
    });

    it('should create a project', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const aliceOrgsRes = await driver.actor.list_my_organizations();
      const [aliceOrg] = extractOkResponse(aliceOrgsRes);

      const projectRes = await driver.actor.create_project({
        name: projectName,
        org_id: aliceOrg.id,
      });
      const project = extractOkResponse(projectRes);

      expect(project).toEqual({
        project: {
          id: expect.any(String),
          org_id: aliceOrg.id,
          name: projectName,
        },
      });
    });
  });
});
