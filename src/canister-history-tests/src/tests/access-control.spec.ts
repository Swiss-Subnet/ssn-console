import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestDriver } from '../support';
import { generateRandomIdentity } from '@dfinity/pic';
import { anonymousIdentity, type ApiErrorResponse } from '@ssn/test-utils';

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
      driver.canisterHistoryActor.setIdentity(anonymousIdentity);

      const updateResult =
        await driver.canisterHistoryActor.update_subnet_canister_ranges({
          canister_ranges: [],
        });

      expect(updateResult).toEqual(unauthenticatedError);
    });

    it('should throw an error for non-controller principals', async () => {
      const identity = generateRandomIdentity();
      driver.canisterHistoryActor.setIdentity(identity);

      const updateResult =
        await driver.canisterHistoryActor.update_subnet_canister_ranges({
          canister_ranges: [],
        });

      expect(updateResult).toEqual(unauthorizedError);
    });
  });
});
