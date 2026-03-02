import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  anonymousIdentity,
  type ApiErrorResponse,
  TestDriver,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

describe('Access control', () => {
  let driver: TestDriver;

  const unauthenticatedError: ApiErrorResponse = {
    Err: {
      code: [{ Unauthenticated: {} }],
      message: 'Anonymous principals are not allowed to perform this action.',
    },
  };
  const unauthorizedError: ApiErrorResponse = {
    Err: {
      code: [{ Unauthorized: {} }],
      message: 'Only controllers are allowed to perform this action.',
    },
  };

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('update_subnet_canister_ranges', () => {
    it('should throw an error for anonymous principals', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const updateResult = await driver.actor.update_subnet_canister_ranges({
        canister_ranges: [],
      });

      expect(updateResult).toEqual(unauthenticatedError);
    });

    it('should throw an error for non-controller principals', async () => {
      const identity = generateRandomIdentity();
      driver.actor.setIdentity(identity);

      const updateResult = await driver.actor.update_subnet_canister_ranges({
        canister_ranges: [],
      });

      expect(updateResult).toEqual(unauthorizedError);
    });
  });
});
