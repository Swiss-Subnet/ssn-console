import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
  noProfileError,
  noTermsAndConditionsError,
  TestDriver,
  unauthenticatedError,
  unauthorizedError,
} from '../support';
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

      const res = await driver.actor.get_latest_terms_and_conditions();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error when user does not have a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.get_latest_terms_and_conditions();
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should not return anything when there are no terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const resultRes = await driver.actor.get_latest_terms_and_conditions();
      const [result] = extractOkResponse(resultRes);

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
      const resultRes = await driver.actor.get_latest_terms_and_conditions();
      const [result] = extractOkResponse(resultRes);
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
      const updatedResultRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [updatedResult] = extractOkResponse(updatedResultRes);
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

  describe('upsert_terms_and_conditions_decision', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: '73157c8d-20ae-400f-815a-64a03246ab67',
        decision_type: { Accept: null },
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error when the user does not have a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: '73157c8d-20ae-400f-815a-64a03246ab67',
        decision_type: { Accept: null },
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should return an error if the terms and conditions do not exist', async () => {
      const id = '73157c8d-20ae-400f-815a-64a03246ab67';
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const res = await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: id,
        decision_type: { Accept: null },
      });
      expect(res).toEqual(noTermsAndConditionsError(id));
    });

    it('should return an error if the caller is a controller', async () => {
      const id = '73157c8d-20ae-400f-815a-64a03246ab67';
      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();

      const res = await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: id,
        decision_type: { Accept: null },
      });
      expect(res).toEqual({
        Err: {
          code: [{ Unauthorized: {} }],
          message: `Controllers do not need to accept terms and conditions.`,
        },
      });
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
      const termsAndConditionsRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditions] = extractOkResponse(termsAndConditionsRes);
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Accept: null },
      });

      const termsAndConditionsAfterAcceptingRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditionsAfterAccepting] = extractOkResponse(
        termsAndConditionsAfterAcceptingRes,
      );
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
      const termsAndConditionsRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditions] = extractOkResponse(termsAndConditionsRes);
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Reject: null },
      });

      const termsAndConditionsAfterRejectingRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditionsAfterRejecting] = extractOkResponse(
        termsAndConditionsAfterRejectingRes,
      );
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

      const res = await driver.actor.create_terms_and_conditions({
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_terms_and_conditions({
        content: termsAndConditionsContent,
        comment: termsAndConditionsComment,
      });
      expect(res).toEqual(unauthorizedError);
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
      const resultRes = await driver.actor.get_latest_terms_and_conditions();
      const [result] = extractOkResponse(resultRes);
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
