import { generateRandomIdentity } from '@dfinity/pic';
import { anonymousIdentity, controllerIdentity, TestDriver } from '../support';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';

describe('Canisters', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('list_canisters', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.list_canisters()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(driver.actor.list_canisters()).rejects.toThrowError(
        /Only controllers can perform this action/,
      );
    });

    it('should return an empty array when there are no canisters', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const canisters = await driver.actor.list_canisters();
      expect(canisters).toEqual([]);
    });

    it('should return all canisters', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      const aliceCanisterOne = await driver.actor.create_my_canister();
      const aliceCanisterTwo = await driver.actor.create_my_canister();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobCanisterOne = await driver.actor.create_my_canister();
      const bobCanisterTwo = await driver.actor.create_my_canister();
      const bobCanisterThree = await driver.actor.create_my_canister();

      driver.actor.setIdentity(controllerIdentity);
      const canisters = await driver.actor.list_canisters();

      expect(canisters.length).toBe(5);
      expect(canisters).toContainEqual(aliceCanisterOne);
      expect(canisters).toContainEqual(aliceCanisterTwo);
      expect(canisters).toContainEqual(bobCanisterOne);
      expect(canisters).toContainEqual(bobCanisterTwo);
      expect(canisters).toContainEqual(bobCanisterThree);
    });
  });

  describe('list_my_canisters', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.list_my_canisters()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(driver.actor.list_my_canisters()).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} does not exist`,
        ),
      );
    });

    it('should return an empty array when the user has no canisters', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const canisters = await driver.actor.list_my_canisters();
      expect(canisters).toEqual([]);
    });

    it('should return all canisters owned by the user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      const aliceCanisterOne = await driver.actor.create_my_canister();
      const aliceCanisterTwo = await driver.actor.create_my_canister();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobCanisterOne = await driver.actor.create_my_canister();
      const bobCanisterTwo = await driver.actor.create_my_canister();
      const bobCanisterThree = await driver.actor.create_my_canister();

      driver.actor.setIdentity(aliceIdentity);
      const canisters = await driver.actor.list_my_canisters();

      expect(canisters.length).toBe(2);
      expect(canisters).toContainEqual(aliceCanisterOne);
      expect(canisters).toContainEqual(aliceCanisterTwo);

      driver.actor.setIdentity(bobIdentity);
      const bobCanisters = await driver.actor.list_my_canisters();

      expect(bobCanisters.length).toBe(3);
      expect(bobCanisters).toContainEqual(bobCanisterOne);
      expect(bobCanisters).toContainEqual(bobCanisterTwo);
      expect(bobCanisters).toContainEqual(bobCanisterThree);
    });
  });

  describe('create_my_canister', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.create_my_canister()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(driver.actor.create_my_canister()).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} does not exist`,
        ),
      );
    });

    it('should create a canister for a valid user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const canister = await driver.actor.create_my_canister();
      const controllers = await driver.pic.getControllers(
        Principal.fromText(canister.principal_id),
      );

      expect(canister).toEqual({
        id: expect.any(String),
        principal_id: expect.any(String),
      });
      expect(
        controllers.some(
          c => c.compareTo(aliceIdentity.getPrincipal()) === 'eq',
        ),
      ).toBe(true);
    });

    it('should return an error for a user who has not accepted the latest terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      await expect(driver.actor.create_my_canister()).rejects.toThrowError(
        /The latest terms and conditions must be accepted to perform this action/,
      );
    });

    it('should return an error for a user who has explicitly rejected the latest terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const [termsAndConditions] =
        await driver.actor.get_latest_terms_and_conditions();
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Reject: null },
      });

      await expect(driver.actor.create_my_canister()).rejects.toThrowError(
        /The latest terms and conditions must be accepted to perform this action/,
      );
    });

    it('should create a canister for a controller without accepting terms and conditions', async () => {
      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });
      const canister = await driver.actor.create_my_canister();
      const controllers = await driver.pic.getControllers(
        Principal.fromText(canister.principal_id),
      );

      expect(canister).toEqual({
        id: expect.any(String),
        principal_id: expect.any(String),
      });
      expect(
        controllers.some(
          c => c.compareTo(controllerIdentity.getPrincipal()) === 'eq',
        ),
      ).toBe(true);
    });

    it('should create a canister for a user who has accepted the latest terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const [termsAndConditions] =
        await driver.actor.get_latest_terms_and_conditions();
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Accept: null },
      });

      const canister = await driver.actor.create_my_canister();
      const controllers = await driver.pic.getControllers(
        Principal.fromText(canister.principal_id),
      );

      expect(canister).toEqual({
        id: expect.any(String),
        principal_id: expect.any(String),
      });
      expect(
        controllers.some(
          c => c.compareTo(aliceIdentity.getPrincipal()) === 'eq',
        ),
      ).toBe(true);
    });
  });
});
