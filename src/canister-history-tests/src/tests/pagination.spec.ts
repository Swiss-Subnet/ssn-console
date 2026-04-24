import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestDriver } from '../support';
import type { Principal } from '@icp-sdk/core/principal';
import {
  controllerIdentity,
  extractOkResponse,
  minutesToMilliseconds,
} from '@ssn/test-utils';

describe('Pagination', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('list_canister_changes', () => {
    let canisterId: Principal;

    beforeEach(async () => {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      await driver.setSubnetCanisterRanges();

      canisterId = await driver.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });
      await driver.createControllerChanges(canisterId, 5);

      await driver.pic.advanceTime(minutesToMilliseconds(5));
      await driver.pic.tick(3);
    });

    it('should return 1 item per page', async () => {
      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [1n],
        page: [0n],
        reverse: [],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.changes).toHaveLength(1);
      expect(okRes.meta.limit).toBe(1n);
      expect(okRes.meta.page).toBe(1n);
      expect(okRes.meta.total_items).toBe(6n);
      expect(okRes.meta.total_pages).toBe(6n);
    });

    it('should return multiple items per page', async () => {
      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [2n],
        page: [1n],
        reverse: [],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.changes).toHaveLength(2);
      expect(okRes.meta.limit).toBe(2n);
      expect(okRes.meta.page).toBe(1n);
      expect(okRes.meta.total_items).toBe(6n);
      expect(okRes.meta.total_pages).toBe(3n);
    });

    it('should return all items on a single page', async () => {
      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [10n],
        page: [0n],
        reverse: [],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.changes).toHaveLength(6);
      expect(okRes.meta.limit).toBe(10n);
      expect(okRes.meta.page).toBe(1n);
      expect(okRes.meta.total_items).toBe(6n);
      expect(okRes.meta.total_pages).toBe(1n);
    });

    it('should set a minimum page', async () => {
      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [1n],
        page: [0n],
        reverse: [],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.page).toBe(1n);
    });

    it('should set a maximum page', async () => {
      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [1n],
        page: [10_000n],
        reverse: [],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.page).toBe(6n);
    });

    it('should set a minimum limit', async () => {
      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [0n],
        page: [1n],
        reverse: [],
      });
      const resOk = extractOkResponse(res);
      expect(resOk.meta.limit).toBe(1n);
    });

    it('should set a maximum limit', async () => {
      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [10_000n],
        page: [1n],
        reverse: [],
      });
      const resOk = extractOkResponse(res);
      expect(resOk.meta.limit).toBe(50n);
    });

    it('should handle pagination with reverse ordering', async () => {
      const defaultRes =
        await driver.canisterHistoryActor.list_canister_changes({
          canister_id: canisterId,
          limit: [],
          page: [],
          reverse: [false],
        });
      const defaultOkRes = extractOkResponse(defaultRes);

      const normalRes = await driver.canisterHistoryActor.list_canister_changes(
        {
          canister_id: canisterId,
          limit: [],
          page: [],
          reverse: [false],
        },
      );
      const normalOkRes = extractOkResponse(normalRes);

      const reverseRes =
        await driver.canisterHistoryActor.list_canister_changes({
          canister_id: canisterId,
          limit: [],
          page: [],
          reverse: [true],
        });
      const reverseOkRes = extractOkResponse(reverseRes);

      expect(defaultOkRes.changes).toHaveLength(6);
      expect(normalOkRes.changes).toHaveLength(6);
      expect(reverseOkRes.changes).toHaveLength(6);

      expect(defaultOkRes.changes).toEqual(normalOkRes.changes);
      expect(normalOkRes.changes).toEqual(reverseOkRes.changes.reverse());
    });
  });
});
