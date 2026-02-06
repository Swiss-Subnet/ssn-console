import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { anonymousIdentity, controllerIdentity, TestDriver } from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

describe('Terms and Conditions', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  const termsAndConditionsContent = 'These are the terms and conditions.';
  const termsAndConditionsComment =
    'This is a comment about the terms and conditions.';

  describe('get_latest_terms_and_conditions', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(
        driver.actor.get_latest_terms_and_conditions(),
      ).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error when user does not have a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(
        driver.actor.get_latest_terms_and_conditions(),
      ).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} does not exist`,
        ),
      );
    });

    it('should not return anything when there are no terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const [result] = await driver.actor.get_latest_terms_and_conditions();

      expect(result).toBeNullable();
    });

    it('should return the latest terms and conditions', async () => {
      const initialTermsAndConditionsTime = Date.now();
      await driver.pic.setCertifiedTime(initialTermsAndConditionsTime);

      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
      });

      driver.actor.setIdentity(aliceIdentity);
      const [result] = await driver.actor.get_latest_terms_and_conditions();
      if (!result) {
        throw new Error('Expected to get latest terms and conditions');
      }

      expect(result).toEqual({
        id: expect.any(String),
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
        created_at: expect.any(BigInt),
        has_accepted: false,
      });
      expect(result.created_at / 1_000_000n).toEqual(
        BigInt(initialTermsAndConditionsTime),
      );

      const updatedTermsAndConditionsTime = Date.now();
      await driver.pic.setCertifiedTime(updatedTermsAndConditionsTime);

      const updatedTermsAndConditionsContent = 'Updated terms and conditions';
      const updatedTermsAndConditionsComment = 'Updated comment';

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_terms_and_conditions({
        content: updatedTermsAndConditionsContent,
        comment: updatedTermsAndConditionsComment,
      });

      driver.actor.setIdentity(aliceIdentity);
      const [updatedResult] =
        await driver.actor.get_latest_terms_and_conditions();
      if (!updatedResult) {
        throw new Error('Expected to get latest terms and conditions');
      }

      expect(updatedResult).toEqual({
        id: expect.any(String),
        content: updatedTermsAndConditionsContent,
        comment: updatedTermsAndConditionsComment,
        created_at: expect.any(BigInt),
        has_accepted: false,
      });
      expect(updatedResult.created_at / 1_000_000n).toEqual(
        BigInt(updatedTermsAndConditionsTime),
      );
    });
  });

  describe('upsert_terms_and_conditions_response', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(
        driver.actor.upsert_terms_and_conditions_response({
          terms_and_conditions_id: '73157c8d-20ae-400f-815a-64a03246ab67',
          response_type: { Accept: null },
        }),
      ).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error when the user does not have a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(
        driver.actor.upsert_terms_and_conditions_response({
          terms_and_conditions_id: '73157c8d-20ae-400f-815a-64a03246ab67',
          response_type: { Accept: null },
        }),
      ).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} does not exist`,
        ),
      );
    });

    it('should return an error if the terms and conditions do not exist', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      await expect(
        driver.actor.upsert_terms_and_conditions_response({
          terms_and_conditions_id: '73157c8d-20ae-400f-815a-64a03246ab67',
          response_type: { Accept: null },
        }),
      ).rejects.toThrowError(
        new RegExp(
          `Terms and conditions with id 73157c8d-20ae-400f-815a-64a03246ab67 does not exist`,
        ),
      );
    });

    it('should return an error if the caller is a controller', async () => {
      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();

      await expect(
        driver.actor.upsert_terms_and_conditions_response({
          terms_and_conditions_id: '73157c8d-20ae-400f-815a-64a03246ab67',
          response_type: { Accept: null },
        }),
      ).rejects.toThrowError(
        new RegExp(`Controllers do not need to accept terms and conditions`),
      );
    });

    it('should allow accepting terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
      });

      driver.actor.setIdentity(aliceIdentity);
      const [termsAndConditions] =
        await driver.actor.get_latest_terms_and_conditions();
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_response({
        terms_and_conditions_id: termsAndConditions.id,
        response_type: { Accept: null },
      });

      const [termsAndConditionsAfterAccepting] =
        await driver.actor.get_latest_terms_and_conditions();
      expect(termsAndConditionsAfterAccepting).toEqual({
        id: expect.any(String),
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
        created_at: expect.any(BigInt),
        has_accepted: true,
      });
    });

    it('should allow rejecting terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
      });

      driver.actor.setIdentity(aliceIdentity);
      const [termsAndConditions] =
        await driver.actor.get_latest_terms_and_conditions();
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_response({
        terms_and_conditions_id: termsAndConditions.id,
        response_type: { Reject: null },
      });

      const [termsAndConditionsAfterRejecting] =
        await driver.actor.get_latest_terms_and_conditions();
      expect(termsAndConditionsAfterRejecting).toEqual({
        id: expect.any(String),
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
        created_at: expect.any(BigInt),
        has_accepted: false,
      });
    });
  });

  describe('create_terms_and_conditions', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(
        driver.actor.create_terms_and_conditions({
          content: termsAndConditionsContent,
          comment: termsAndConditionsComment,
        }),
      ).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(
        driver.actor.create_terms_and_conditions({
          content: termsAndConditionsContent,
          comment: termsAndConditionsComment,
        }),
      ).rejects.toThrowError(/Only controllers can perform this action/);
    });

    it('should create terms and conditions', async () => {
      const now = Date.now();
      await driver.pic.setCertifiedTime(now);

      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
      });

      driver.actor.setIdentity(aliceIdentity);
      const [result] = await driver.actor.get_latest_terms_and_conditions();
      if (!result) {
        throw new Error('Expected to get latest terms and conditions');
      }

      expect(result).toEqual({
        id: expect.any(String),
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
        created_at: expect.any(BigInt),
        has_accepted: false,
      });
      expect(result.created_at / 1_000_000n).toEqual(BigInt(now));
    });
  });
});
