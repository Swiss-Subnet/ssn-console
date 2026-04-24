import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestDriver } from '../support';
import { Principal } from '@icp-sdk/core/principal';
import {
  type _SERVICE as ManagementCanisterService,
  idlFactory as managementCanisterIdlFactory,
} from '@ssn/management-canister';
import { generateRandomIdentity, type Actor } from '@dfinity/pic';
import {
  BACKEND_WASM_PATH,
  CANISTER_HISTORY_WASM_PATH,
  controllerIdentity,
  extractErrResponse,
  extractOkResponse,
  millisecondsToNanoseconds,
  minutesToMilliseconds,
} from '@ssn/test-utils';

describe('Canister History', () => {
  let driver: TestDriver;
  let managementCanister: Actor<ManagementCanisterService>;

  async function deleteCanisterOnChain(canisterId: Principal): Promise<void> {
    await managementCanister.stop_canister({ canister_id: canisterId });
    await managementCanister.delete_canister({ canister_id: canisterId });
  }

  async function waitForSync(): Promise<void> {
    await driver.pic.advanceTime(minutesToMilliseconds(5));
    await driver.pic.tick(3);
  }

  beforeEach(async () => {
    driver = await TestDriver.create();
    managementCanister = driver.pic.createActor<ManagementCanisterService>(
      managementCanisterIdlFactory,
      Principal.managementCanister(),
    );
    managementCanister.setIdentity(controllerIdentity);
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('subnet canister ranges', () => {
    it('should set and get subnet canister ranges', async () => {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      const canisterRanges = await driver.setSubnetCanisterRanges();

      const subnetCanisterRangesRes =
        await driver.canisterHistoryActor.list_subnet_canister_ranges({});
      const subnetCanisterRanges = extractOkResponse(subnetCanisterRangesRes);

      expect(subnetCanisterRanges.canister_ranges).toEqual(canisterRanges);

      await waitForSync();

      const subnetCanisterIdsRes =
        await driver.canisterHistoryActor.list_subnet_canister_ids({});
      const subnetCanisterIds = extractOkResponse(subnetCanisterIdsRes);
      expect(subnetCanisterIds.canister_id_ranges).toHaveLength(1);
    });

    it('should set and get an empty canister range', async () => {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      await waitForSync();

      const canisterIds =
        await driver.canisterHistoryActor.list_subnet_canister_ids({});
      const result = extractOkResponse(canisterIds);
      expect(result.canister_id_ranges).toHaveLength(0);
    });

    it('should throw an error when subnet range with too short principal is sent', async () => {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      const res =
        await driver.canisterHistoryActor.update_subnet_canister_ranges({
          canister_ranges: [
            [
              Principal.fromUint8Array(
                new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
              ),
              Principal.fromUint8Array(
                new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
              ),
            ],
            [
              Principal.fromUint8Array(
                new Uint8Array([1, 1, 1, 1, 1, 1, 1, 2, 1]), // one byte too few
              ),
              Principal.fromUint8Array(
                new Uint8Array([2, 2, 2, 2, 2, 2, 2, 2, 2, 1]),
              ),
            ],
          ],
        });
      const errRes = extractErrResponse(res);
      expect(errRes.message).toEqual(
        'The start principal of the 1th provided subnet range is invalid: Principal must have length 10 to be a valid canister id, but it has length: 9',
      );
    });

    it('should throw an error when subnet range with too long principal is sent', async () => {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);
      const res =
        await driver.canisterHistoryActor.update_subnet_canister_ranges({
          canister_ranges: [
            [
              Principal.fromUint8Array(
                new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
              ),
              Principal.fromUint8Array(
                new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]), // one byte too many
              ),
            ],
            [
              Principal.fromUint8Array(
                new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
              ),
              Principal.fromUint8Array(
                new Uint8Array([2, 2, 2, 2, 2, 2, 2, 2, 2, 1]),
              ),
            ],
          ],
        });
      const errRes = extractErrResponse(res);
      expect(errRes.message).toEqual(
        'The end principal of the 0th provided subnet range is invalid: Principal must have length 10 to be a valid canister id, but it has length: 11',
      );
    });

    it('should create holes for canisters deleted', async () => {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      await driver.setSubnetCanisterRanges();

      const canisters = await driver.createCanisters(5);

      await waitForSync();
      await deleteCanisterOnChain(canisters[2]!);
      await waitForSync();

      const subnetCanisterIdsRes =
        await driver.canisterHistoryActor.list_subnet_canister_ids({});
      const subnetCanisterIds = extractOkResponse(subnetCanisterIdsRes);

      expect(subnetCanisterIds.canister_id_ranges).toHaveLength(2);
    });
  });

  describe('canister changes', async () => {
    it('should handle all types of changes', async () => {
      const otherController = generateRandomIdentity();
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      await driver.setSubnetCanisterRanges();

      // creation
      const creationTimestamp = Date.now();
      await driver.pic.setTime(creationTimestamp);
      const canisterId = await driver.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });

      // code deployment
      const deploymentTimestamp = creationTimestamp + 1_000;
      await driver.pic.setTime(deploymentTimestamp);
      await driver.pic.installCode({
        canisterId,
        wasm: CANISTER_HISTORY_WASM_PATH,
        sender: controllerIdentity.getPrincipal(),
      });

      // controllers change
      const controllerChangeTimestamp = deploymentTimestamp + 1_000;
      await driver.pic.setTime(controllerChangeTimestamp);
      await driver.pic.updateCanisterSettings({
        canisterId,
        sender: controllerIdentity.getPrincipal(),
        controllers: [
          controllerIdentity.getPrincipal(),
          otherController.getPrincipal(),
        ],
      });

      // load snapshot
      const takeSnapshotTimestamp = controllerChangeTimestamp + 1_000;
      await driver.pic.setTime(takeSnapshotTimestamp);
      let snapshot = await managementCanister.take_canister_snapshot({
        canister_id: canisterId,
        replace_snapshot: [],
        sender_canister_version: [],
        uninstall_code: [],
      });

      const loadSnapshotTimestamp = takeSnapshotTimestamp + 1_000;
      await driver.pic.setTime(loadSnapshotTimestamp);
      await managementCanister.load_canister_snapshot({
        canister_id: canisterId,
        snapshot_id: snapshot.id,
        sender_canister_version: [],
      });

      // code uninstall
      const uninstallCodeTimestamp = loadSnapshotTimestamp + 1_000;
      await driver.pic.setTime(uninstallCodeTimestamp);
      await managementCanister.uninstall_code({
        canister_id: canisterId,
        sender_canister_version: [],
      });

      await waitForSync();

      const subnetCanisterIdsRes =
        await driver.canisterHistoryActor.list_subnet_canister_ids({});
      const subnetCanisterIds = extractOkResponse(subnetCanisterIdsRes);
      expect(subnetCanisterIds.canister_id_ranges).toHaveLength(1);

      const canisterChangesRes =
        await driver.canisterHistoryActor.list_canister_changes({
          canister_id: canisterId,
          limit: [],
          page: [],
          reverse: [],
        });
      const canisterChanges = extractOkResponse(canisterChangesRes);
      expect(canisterChanges.changes).toHaveLength(5);

      // creation
      expect(canisterChanges.changes[0]).toEqual({
        id: expect.any(String),
        timestamp_nanos: millisecondsToNanoseconds(creationTimestamp),
        canister_version: 0n,
        canister_id: canisterId,
        origin: [{ FromUser: { user_id: controllerIdentity.getPrincipal() } }],
        details: [
          {
            Creation: {
              controllers: [controllerIdentity.getPrincipal()],
              environment_variables_hash: [],
            },
          },
        ],
      });

      // code deployment
      expect(canisterChanges.changes[1]).toEqual({
        id: expect.any(String),
        timestamp_nanos: millisecondsToNanoseconds(deploymentTimestamp),
        canister_version: 1n,
        canister_id: canisterId,
        origin: [{ FromUser: { user_id: controllerIdentity.getPrincipal() } }],
        details: [
          {
            CodeDeployment: {
              mode: [{ Install: {} }],
              module_hash: expect.any(Uint8Array),
            },
          },
        ],
      });

      // controllers change
      expect(canisterChanges.changes[2]).toEqual({
        id: expect.any(String),
        timestamp_nanos: millisecondsToNanoseconds(controllerChangeTimestamp),
        canister_version: 5n,
        canister_id: canisterId,
        origin: [{ FromUser: { user_id: controllerIdentity.getPrincipal() } }],
        details: [
          {
            ControllersChange: {
              controllers: expect.arrayContaining([
                controllerIdentity.getPrincipal(),
                otherController.getPrincipal(),
              ]),
            },
          },
        ],
      });

      // load snapshot
      expect(canisterChanges.changes[3]).toEqual({
        id: expect.any(String),
        timestamp_nanos: millisecondsToNanoseconds(loadSnapshotTimestamp),
        canister_version: 6n,
        canister_id: canisterId,
        origin: [{ FromUser: { user_id: controllerIdentity.getPrincipal() } }],
        details: [
          {
            LoadSnapshot: {
              canister_version: 5n,
              source: [{ TakenFromCanister: {} }],
              from_canister_id: [],
              taken_at_timestamp: millisecondsToNanoseconds(
                takeSnapshotTimestamp,
              ),
              snapshot_id: snapshot.id,
            },
          },
        ],
      });

      // code uninstall
      expect(canisterChanges.changes[4]).toEqual({
        id: expect.any(String),
        timestamp_nanos: millisecondsToNanoseconds(uninstallCodeTimestamp),
        canister_version: 7n,
        canister_id: canisterId,
        origin: [{ FromUser: { user_id: controllerIdentity.getPrincipal() } }],
        details: [{ CodeUninstall: {} }],
      });
    });
  });

  describe('deleted canisters', () => {
    async function createAndSyncCanister(): Promise<Principal> {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      const canisterId = await driver.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });

      await driver.setSubnetCanisterRanges();
      await waitForSync();

      return canisterId;
    }

    it('should mark a canister as deleted after sync', async () => {
      const canisterId = await createAndSyncCanister();

      // Verify is_deleted is false before deletion
      const beforeRes = await driver.canisterHistoryActor.list_canister_changes(
        {
          canister_id: canisterId,
          limit: [],
          page: [],
          reverse: [],
        },
      );
      const before = extractOkResponse(beforeRes);
      expect(before.is_deleted).toBe(false);
      expect(before.changes).toHaveLength(1);

      // Delete the canister on-chain, then re-sync
      await deleteCanisterOnChain(canisterId);
      await waitForSync();

      // Verify is_deleted is now true
      const afterRes = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [],
        page: [],
        reverse: [],
      });
      const after = extractOkResponse(afterRes);
      expect(after.is_deleted).toBe(true);
      expect(after.changes).toHaveLength(1);
    });

    it('should not mark unknown canisters as deleted', async () => {
      driver.canisterHistoryActor.setIdentity(controllerIdentity);

      // Create and immediately delete a canister without syncing first
      const canisterId = await driver.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });

      await driver.setSubnetCanisterRanges();
      await deleteCanisterOnChain(canisterId);
      await waitForSync();

      const res = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [],
        page: [],
        reverse: [],
      });
      const result = extractOkResponse(res);
      expect(result.is_deleted).toBe(false);
      expect(result.changes).toHaveLength(0);
    });

    it('should skip already-deleted canisters on subsequent syncs', async () => {
      const canisterId = await createAndSyncCanister();

      await deleteCanisterOnChain(canisterId);

      // First sync marks as deleted
      await waitForSync();

      const firstRes = await driver.canisterHistoryActor.list_canister_changes({
        canister_id: canisterId,
        limit: [],
        page: [],
        reverse: [],
      });
      expect(extractOkResponse(firstRes).is_deleted).toBe(true);

      // Second sync should succeed without errors (skips deleted)
      await waitForSync();

      const secondRes = await driver.canisterHistoryActor.list_canister_changes(
        {
          canister_id: canisterId,
          limit: [],
          page: [],
          reverse: [],
        },
      );
      expect(extractOkResponse(secondRes).is_deleted).toBe(true);
    });
  });
});
