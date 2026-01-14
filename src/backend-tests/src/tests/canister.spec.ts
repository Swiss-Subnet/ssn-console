import { generateRandomIdentity } from '@dfinity/pic';
import { anonymousIdentity, controllerIdentity, TestDriver } from '../support';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
      const aliceCanisterOne = await driver.actor.create_canister();
      const aliceCanisterTwo = await driver.actor.create_canister();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobCanisterOne = await driver.actor.create_canister();
      const bobCanisterTwo = await driver.actor.create_canister();
      const bobCanisterThree = await driver.actor.create_canister();

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
      const aliceCanisterOne = await driver.actor.create_canister();
      const aliceCanisterTwo = await driver.actor.create_canister();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobCanisterOne = await driver.actor.create_canister();
      const bobCanisterTwo = await driver.actor.create_canister();
      const bobCanisterThree = await driver.actor.create_canister();

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

  describe('create_canister', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.create_canister()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(driver.actor.create_canister()).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} does not exist`,
        ),
      );
    });

    it('should create a canister for a valid user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const canister = await driver.actor.create_canister();

      expect(canister).toEqual({
        id: expect.any(String),
        principal_id: expect.any(String),
      });
    });
  });
});
