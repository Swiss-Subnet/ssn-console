import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
  TestDriver,
  unauthenticatedError,
  unauthorizedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';
import type { Identity } from '@icp-sdk/core/agent';
import type { Canister, UserProfile } from '@ssn/backend-api';

describe('list_all_canisters', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('without canisters', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [10n],
        page: [1n],
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [10n],
        page: [1n],
      });

      expect(res).toEqual(unauthorizedError);
    });

    it('should return an empty array when there are no canisters', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [10n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);

      expect(okRes.canisters).toHaveLength(0);
      expect(okRes.meta).toEqual({
        limit: 10n,
        page: 1n,
        total_items: 0n,
        total_pages: 1n,
      });
    });
  });

  describe('with canisters', () => {
    let aliceIdentity: Identity;
    let bobIdentity: Identity;

    let aliceProfile: UserProfile;
    let bobProfile: UserProfile;

    let aliceCanisters: Canister[];
    let bobCanisters: Canister[];

    const aliceEmail = 'alice@gmail.com';
    const bobEmail = 'bob@gmail.com';

    beforeEach(async () => {
      const numAliceProjects = 5;
      const numBobProjects = 3;

      [aliceIdentity, aliceProfile] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.update_my_user_profile({ email: [aliceEmail] });
      const aliceProject = await driver.getDefaultProject();
      for (let i = 0; i < numAliceProjects; i++) {
        await driver.proposals.createCanister(aliceIdentity, aliceProject.id);
      }
      const aliceCanistersRes = await driver.actor.list_my_canisters({
        project_id: aliceProject.id,
      });
      aliceCanisters = extractOkResponse(aliceCanistersRes);

      [bobIdentity, bobProfile] = await driver.users.createUser();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.update_my_user_profile({ email: [bobEmail] });
      const bobProject = await driver.getDefaultProject();
      for (let i = 0; i < numBobProjects; i++) {
        await driver.proposals.createCanister(bobIdentity, bobProject.id);
      }
      const bobCanistersRes = await driver.actor.list_my_canisters({
        project_id: bobProject.id,
      });
      bobCanisters = extractOkResponse(bobCanistersRes);
    });

    it('should return one item per page', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [1n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);

      expect(okRes.canisters).toHaveLength(1);
      expect(okRes.meta.limit).toBe(1n);
      expect(okRes.meta.page).toBe(1n);
      expect(okRes.meta.total_items).toBe(8n);
      expect(okRes.meta.total_pages).toBe(8n);
    });

    it('should return multiple items per page', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [3n],
        page: [2n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.canisters).toHaveLength(3);
      expect(okRes.meta.limit).toBe(3n);
      expect(okRes.meta.page).toBe(2n);
      expect(okRes.meta.total_items).toBe(8n);
      expect(okRes.meta.total_pages).toBe(3n);
    });

    it('return all items on a single page', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [10n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.canisters).toHaveLength(8);
      expect(okRes.meta.limit).toBe(10n);
      expect(okRes.meta.page).toBe(1n);
      expect(okRes.meta.total_items).toBe(8n);
      expect(okRes.meta.total_pages).toBe(1n);

      for (const canister of aliceCanisters) {
        expect(okRes.canisters).toContainEqual({
          id: canister.id,
          user_id: aliceProfile.id,
          email: [aliceEmail],
          principal_id: canister.principal_id,
        });
      }

      for (const canister of bobCanisters) {
        expect(okRes.canisters).toContainEqual({
          id: canister.id,
          user_id: bobProfile.id,
          email: [bobEmail],
          principal_id: canister.principal_id,
        });
      }
    });

    it('should set a minimum page', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [1n],
        page: [0n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.page).toBe(1n);
    });

    it('should set a maximum page', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [1n],
        page: [10_000n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.page).toBe(8n);
    });

    it('should set a minimum limit', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [0n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.limit).toBe(1n);
    });

    it('should set a maximum limit', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.list_all_canisters({
        limit: [10_000n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.limit).toBe(50n);
    });
  });
});
