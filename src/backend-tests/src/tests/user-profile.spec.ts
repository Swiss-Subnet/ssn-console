import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { anonymousIdentity, controllerIdentity, TestDriver } from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

describe('User Profile', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('list_user_profiles', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.list_user_profiles()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(driver.actor.list_user_profiles()).rejects.toThrowError(
        /Only controllers can perform this action/,
      );
    });

    it('should return an empty array when there are no users', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const profiles = await driver.actor.list_user_profiles();
      expect(profiles).toEqual([]);
    });

    it('should return all user profiles', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });
      const [aliceProfile] = await driver.actor.get_my_user_profile();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: ['bob@subnet.ch'] });
      const [bobProfile] = await driver.actor.get_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      const profiles = await driver.actor.list_user_profiles();

      expect(profiles.length).toBe(2);
      expect(profiles).toContainEqual({
        email: aliceProfile?.email,
        id: aliceProfile?.id,
        status: aliceProfile?.status,
      });
      expect(profiles).toContainEqual({
        email: bobProfile?.email,
        id: bobProfile?.id,
        status: bobProfile?.status,
      });
    });
  });

  describe('update_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProfile = await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(anonymousIdentity);
      await expect(
        driver.actor.update_user_profile({
          user_id: aliceProfile.id,
          status: [{ Active: null }],
        }),
      ).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProfile = await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(aliceIdentity);
      await expect(
        driver.actor.update_user_profile({
          user_id: aliceProfile.id,
          status: [{ Active: null }],
        }),
      ).rejects.toThrowError(/Only controllers can perform this action/);
    });

    it('should return an error if the user does not exist', async () => {
      const userId = '2d3ee223-c6d2-49d8-928f-d42597bfed65';
      driver.actor.setIdentity(controllerIdentity);

      await expect(
        driver.actor.update_user_profile({
          user_id: userId,
          status: [{ Active: null }],
        }),
      ).rejects.toThrowError(
        new RegExp(`User profile for user with id ${userId} does not exist`),
      );
    });

    it('should update the user status', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const aliceProfile = await driver.actor.create_my_user_profile();
      expect(aliceProfile.status).toEqual({ Inactive: null });

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.update_user_profile({
        user_id: aliceProfile.id,
        status: [{ Active: null }],
      });

      driver.actor.setIdentity(aliceIdentity);
      const [updatedAliceProfile] = await driver.actor.get_my_user_profile();
      expect(updatedAliceProfile!.status).toEqual({ Active: null });

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.update_user_profile({
        user_id: aliceProfile.id,
        status: [{ Inactive: null }],
      });

      driver.actor.setIdentity(aliceIdentity);
      const [finalUpdatedAliceProfile] =
        await driver.actor.get_my_user_profile();
      expect(finalUpdatedAliceProfile!.status).toEqual({ Inactive: null });
    });
  });

  describe('get_my_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.get_my_user_profile()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should not return a user profile if none exists', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const [aliceProfile] = await driver.actor.get_my_user_profile();
      expect(aliceProfile).toBeUndefined();
    });

    it('should return a user profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      const aliceEmail = 'alice@subnet.ch';

      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: [aliceEmail] });

      const [aliceProfile] = await driver.actor.get_my_user_profile();
      expect(aliceProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [aliceEmail],
        is_admin: false,
      });
    });

    it('should return an admin user profile', async () => {
      const adminEmail = 'admin@subnet.ch';

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: [adminEmail] });

      const [adminProfile] = await driver.actor.get_my_user_profile();
      expect(adminProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [adminEmail],
        is_admin: true,
      });
    });
  });

  describe('create_my_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.get_my_user_profile()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should create a user profile', async () => {
      const aliceIdentity = generateRandomIdentity();

      driver.actor.setIdentity(aliceIdentity);
      const aliceProfile = await driver.actor.create_my_user_profile();

      expect(aliceProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [],
        is_admin: false,
      });

      const [fetchedProfile] = await driver.actor.get_my_user_profile();
      expect(fetchedProfile).toEqual(aliceProfile);
    });

    it('should create an admin user profile', async () => {
      driver.actor.setIdentity(controllerIdentity);
      const adminProfile = await driver.actor.create_my_user_profile();

      expect(adminProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [],
        is_admin: true,
      });

      const [fetchedProfile] = await driver.actor.get_my_user_profile();
      expect(fetchedProfile).toEqual(adminProfile);
    });

    it('should return an error if the user profile already exists', async () => {
      const aliceIdentity = generateRandomIdentity();

      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      await expect(driver.actor.create_my_user_profile()).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} already exists`,
        ),
      );
    });
  });

  describe('update_my_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.get_my_user_profile()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error if the user profile does not exist', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(
        driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] }),
      ).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} does not exist`,
        ),
      );
    });

    it('should update the user email', async () => {
      const aliceIdentity = generateRandomIdentity();
      const aliceInitialEmail = 'chalice@subnet.ch';
      const aliceFinalEmail = 'alice@subnet.ch';

      driver.actor.setIdentity(aliceIdentity);
      const aliceProfile = await driver.actor.create_my_user_profile();

      await driver.actor.update_my_user_profile({
        email: [aliceInitialEmail],
      });
      const [updatedProfile] = await driver.actor.get_my_user_profile();

      await driver.actor.update_my_user_profile({
        email: [aliceFinalEmail],
      });
      const [finalUpdatedProfile] = await driver.actor.get_my_user_profile();

      expect(aliceProfile.email).toEqual([]);
      expect(updatedProfile!.email).toEqual([aliceInitialEmail]);
      expect(finalUpdatedProfile!.email).toEqual([aliceFinalEmail]);
    });
  });
});
