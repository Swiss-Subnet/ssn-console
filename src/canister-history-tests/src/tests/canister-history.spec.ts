import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BACKEND_WASM_PATH,
  controllerIdentity,
  extractErrResponse,
  extractOkResponse,
  millisecondsToNanoseconds,
  minutesToMilliseconds,
  TestDriver,
} from '../support';
import { Principal } from '@icp-sdk/core/principal';
import { IDL } from '@icp-sdk/core/candid';
import {
  type _SERVICE as ManagementCanisterService,
  idlFactory as managementCanisterIdlFactory,
} from '@ssn/management-canister';
import { generateRandomIdentity } from '@dfinity/pic';

describe('Canister History', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('subnet canister ranges', () => {
    it('should set and get subnet canister ranges', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const subnet = await driver.getSubnet();
      const canisterRanges = subnet.canisterRanges.map<[Principal, Principal]>(
        ({ start, end }) => [start, end],
      );
      await driver.actor.update_subnet_canister_ranges({
        canister_ranges: canisterRanges,
      });

      const subnetCanisterRangesRes =
        await driver.actor.list_subnet_canister_ranges({});
      const subnetCanisterRanges = extractOkResponse(subnetCanisterRangesRes);

      expect(subnetCanisterRanges.canister_ranges).toEqual(canisterRanges);

      await driver.pic.advanceCertifiedTime(minutesToMilliseconds(5));
      await driver.pic.tick(3);

      const subnetCanisterIdsRes = await driver.actor.list_subnet_canister_ids({
        limit: [],
        page: [],
      });
      const subnetCanisterIds = extractOkResponse(subnetCanisterIdsRes);
      expect(subnetCanisterIds.canister_ids).toHaveLength(1);
    });

    it('should set and get an empty canister range', async () => {
      driver.actor.setIdentity(controllerIdentity);

      await driver.pic.advanceTime(minutesToMilliseconds(5));
      await driver.pic.tick(3);

      const canisterIds = await driver.actor.list_subnet_canister_ids({
        limit: [],
        page: [],
      });
      const result = extractOkResponse(canisterIds);
      expect(result.canister_ids).toHaveLength(0);
    });

    it('should throw an error when subnet range with too short principal is sent', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.update_subnet_canister_ranges({
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
      driver.actor.setIdentity(controllerIdentity);
      const res = await driver.actor.update_subnet_canister_ranges({
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
  });

  describe('canister changes', async () => {
    it('should handle all types of changes', async () => {
      const otherController = generateRandomIdentity();
      const managementCanister =
        driver.pic.createActor<ManagementCanisterService>(
          managementCanisterIdlFactory,
          Principal.managementCanister(),
        );
      managementCanister.setIdentity(controllerIdentity);
      driver.actor.setIdentity(controllerIdentity);

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
        wasm: BACKEND_WASM_PATH,
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

      await driver.pic.advanceTime(minutesToMilliseconds(5));
      await driver.pic.tick(3);

      const subnetCanisterIdsRes = await driver.actor.list_subnet_canister_ids({
        limit: [],
        page: [],
      });
      const subnetCanisterIds = extractOkResponse(subnetCanisterIdsRes);
      expect(subnetCanisterIds.canister_ids).toHaveLength(2);

      const canisterChangesRes = await driver.actor.list_canister_changes({
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
    async function triggerSyncAndWait(): Promise<void> {
      driver.actor.setIdentity(controllerIdentity);

      // Wait for any in-progress sync to finish, then trigger a new one
      for (let i = 0; i < 20; i++) {
        const res = await driver.actor.trigger_sync_canister_histories({});
        const ok = extractOkResponse(res);
        if (ok.message.includes('triggered successfully')) {
          await driver.pic.tick(10);
          return;
        }
        await driver.pic.tick(5);
      }

      throw new Error('Could not trigger a sync — previous one never finished');
    }

    async function createAndSyncCanister(): Promise<Principal> {
      driver.actor.setIdentity(controllerIdentity);

      const canisterId = await driver.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });

      // Set a narrow range covering only the canister-history canister
      // and the newly created canister to keep sync fast.
      await driver.actor.update_subnet_canister_ranges({
        canister_ranges: [[driver.canisterId, canisterId]],
      });

      // The init timer fires a sync at t=0. Advance time so it triggers,
      // then wait for it to fully complete before proceeding.
      await driver.pic.advanceTime(minutesToMilliseconds(5));
      await driver.pic.tick(10);

      return canisterId;
    }

    async function deleteCanisterOnChain(canisterId: Principal): Promise<void> {
      await driver.pic.stopCanister({
        canisterId,
        sender: controllerIdentity.getPrincipal(),
      });

      const DeleteCanisterArgs = IDL.Record({ canister_id: IDL.Principal });
      await driver.pic.updateCall({
        canisterId: Principal.managementCanister(),
        method: 'delete_canister',
        arg: new Uint8Array(
          IDL.encode([DeleteCanisterArgs], [{ canister_id: canisterId }]),
        ),
        sender: controllerIdentity.getPrincipal(),
      });
    }

    it('should mark a canister as deleted after sync', async () => {
      const canisterId = await createAndSyncCanister();

      // Verify is_deleted is false before deletion
      const beforeRes = await driver.actor.list_canister_changes({
        canister_id: canisterId,
        limit: [],
        page: [],
        reverse: [],
      });
      const before = extractOkResponse(beforeRes);
      expect(before.is_deleted).toBe(false);
      expect(before.changes).toHaveLength(1);

      // Delete the canister on-chain, then re-sync
      await deleteCanisterOnChain(canisterId);
      await triggerSyncAndWait();

      // Verify is_deleted is now true
      const afterRes = await driver.actor.list_canister_changes({
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
      driver.actor.setIdentity(controllerIdentity);

      // Create and immediately delete a canister without syncing first
      const canisterId = await driver.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });

      await deleteCanisterOnChain(canisterId);

      // Set range covering this canister so the sync encounters it
      // as an unknown deleted canister (no prior record).
      await driver.actor.update_subnet_canister_ranges({
        canister_ranges: [[driver.canisterId, canisterId]],
      });

      await driver.pic.advanceTime(minutesToMilliseconds(5));
      await driver.pic.tick(10);
      await triggerSyncAndWait();

      const res = await driver.actor.list_canister_changes({
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
      await triggerSyncAndWait();

      const firstRes = await driver.actor.list_canister_changes({
        canister_id: canisterId,
        limit: [],
        page: [],
        reverse: [],
      });
      expect(extractOkResponse(firstRes).is_deleted).toBe(true);

      // Second sync should succeed without errors (skips deleted)
      await triggerSyncAndWait();

      const secondRes = await driver.actor.list_canister_changes({
        canister_id: canisterId,
        limit: [],
        page: [],
        reverse: [],
      });
      expect(extractOkResponse(secondRes).is_deleted).toBe(true);
    });
  });
});
