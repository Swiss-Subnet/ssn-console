import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BACKEND_WASM_PATH,
  controllerIdentity,
  extractOkResponse,
  millisecondsToNanoseconds,
  minutesToMilliseconds,
  TestDriver,
} from '../support';
import { Principal } from '@icp-sdk/core/principal';
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

      // Test synchronization with no canister ranges set
      await driver.pic.advanceTime(minutesToMilliseconds(5));
      await driver.pic.tick(3);

      // Should not crash or throw errors
      const canisterIds = await driver.actor.list_subnet_canister_ids({
        limit: [],
        page: [],
      });
      const result = extractOkResponse(canisterIds);
      expect(result.canister_ids).toHaveLength(0);
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
});
