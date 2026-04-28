import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TestDriver,
  unauthenticatedError,
  unauthorizedError,
} from '../support';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
  hoursToMilliseconds,
  millisecondsToNanoseconds,
  minutesToMilliseconds,
} from '@ssn/test-utils';
import type { Cursor, CyclesMetricsSnapshotDto } from '@ssn/cycles-monitor-api';
import type { Principal } from '@icp-sdk/core/principal';
import { generateRandomIdentity } from '@dfinity/pic';

type Snapshot = {
  timestamp_ns: bigint;
  canister_id: Principal;
  memory: bigint;
  compute_allocation: bigint;
  ingress_induction: bigint;
  instructions: bigint;
  request_and_response_transmission: bigint;
  uninstall: bigint;
  http_outcalls: bigint;
  burned_cycles: bigint;
};

describe('Cycles Monitor', () => {
  let driver: TestDriver;

  async function waitForSync(): Promise<void> {
    await driver.pic.advanceTime(minutesToMilliseconds(5));
    await driver.pic.tick(3);
  }

  function expectSnapshotsToContain(
    snapshots: CyclesMetricsSnapshotDto[],
    expected: Partial<Snapshot>,
  ): void {
    expect(snapshots).toContainEqual({
      timestamp_ns: expected.timestamp_ns ?? expect.any(BigInt),
      canister_id: expected.canister_id ?? driver.cyclesMonitorCanisterId,
      memory: expected.memory ?? expect.any(BigInt),
      compute_allocation: expected.compute_allocation ?? expect.any(BigInt),
      ingress_induction: expected.ingress_induction ?? expect.any(BigInt),
      instructions: expected.instructions ?? expect.any(BigInt),
      request_and_response_transmission:
        expected.request_and_response_transmission ?? expect.any(BigInt),
      uninstall: expected.uninstall ?? expect.any(BigInt),
      http_outcalls: expected.http_outcalls ?? expect.any(BigInt),
      burned_cycles: expected.burned_cycles ?? expect.any(BigInt),
    });
  }

  beforeEach(async () => {
    driver = await TestDriver.create();
    await driver.setSubnetCanisterRanges(10);
    await waitForSync();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('trigger_sync_metrics', () => {
    it('should reject unauthenticated calls', async () => {
      driver.cyclesMonitorActor.setIdentity(anonymousIdentity);
      const res = await driver.cyclesMonitorActor.trigger_sync_metrics({});

      expect(res).toEqual(unauthenticatedError);
    });

    it('should reject non-controller calls', async () => {
      const alice = generateRandomIdentity();
      driver.cyclesMonitorActor.setIdentity(alice);
      const res = await driver.cyclesMonitorActor.trigger_sync_metrics({});

      expect(res).toEqual(unauthorizedError);
    });

    it('should allow controller calls', async () => {
      driver.cyclesMonitorActor.setIdentity(controllerIdentity);
      const res = await driver.cyclesMonitorActor.trigger_sync_metrics({});

      const okRes = extractOkResponse(res);
      expect(okRes.message).toBe('Sync triggered successfully.');
    });
  });

  describe('list_metrics_after', () => {
    it('should reject unauthenticated calls', async () => {
      driver.cyclesMonitorActor.setIdentity(anonymousIdentity);
      const res = await driver.cyclesMonitorActor.list_metrics_after({
        cursor: [],
      });

      expect(res).toEqual(unauthenticatedError);
    });

    it('should reject non-controller calls', async () => {
      const alice = generateRandomIdentity();
      driver.cyclesMonitorActor.setIdentity(alice);
      const res = await driver.cyclesMonitorActor.list_metrics_after({
        cursor: [],
      });

      expect(res).toEqual(unauthorizedError);
    });

    it('should return metrics for controller', async () => {
      driver.cyclesMonitorActor.setIdentity(controllerIdentity);
      const canisterIds = await driver.createCanisters(5);

      {
        const res = await driver.cyclesMonitorActor.list_metrics_after({
          cursor: [],
        });
        const okRes = extractOkResponse(res);
        expect(okRes.snapshots.length).toBe(0);
        expect(okRes.next_cursor.length).toBe(0);
      }

      await waitForSync(); // canister history sync
      await waitForSync(); // cycles monitor sync

      {
        const res = await driver.cyclesMonitorActor.list_metrics_after({
          cursor: [],
        });
        const okRes = extractOkResponse(res);
        // 2 test canisters synced twice
        // other 5 canisters synced once
        expect(okRes.snapshots.length).toBe(9);
        expect(okRes.next_cursor.length).toBe(0);

        expectSnapshotsToContain(okRes.snapshots, {
          canister_id: driver.cyclesMonitorCanisterId,
        });
        expectSnapshotsToContain(okRes.snapshots, {
          canister_id: driver.canisterHistoryCanisterId,
        });
        canisterIds.forEach(canister_id => {
          expectSnapshotsToContain(okRes.snapshots, { canister_id });
        });
      }

      await waitForSync(); // more cycles monitor sync

      {
        const res1 = await driver.cyclesMonitorActor.list_metrics_after({
          cursor: [],
        });
        const okRes1 = extractOkResponse(res1);
        expect(okRes1.snapshots.length).toBeGreaterThan(0);

        // Find a cursor partway through the results
        const cursorSnapshot =
          okRes1.snapshots[Math.floor(okRes1.snapshots.length / 2)]!;
        const cursor: Cursor = [
          cursorSnapshot.timestamp_ns,
          cursorSnapshot.canister_id,
        ];

        // Fetch page 2 using cursor
        const res2 = await driver.cyclesMonitorActor.list_metrics_after({
          cursor: [cursor],
        });
        const okRes2 = extractOkResponse(res2);

        // Assert page 2 does not contain the cursor item and comes strictly after
        expect(
          okRes2.snapshots.some(
            s =>
              s.timestamp_ns === cursor[0] &&
              s.canister_id.compareTo(cursor[1]) === 'eq',
          ),
        ).toBe(false);
      }

      // Check metric increments
      {
        const res = await driver.cyclesMonitorActor.list_metrics_after({
          cursor: [],
        });
        const okRes = extractOkResponse(res);

        // Group by canister ID to compare over time
        const snapshotsByCanister = new Map<
          string,
          CyclesMetricsSnapshotDto[]
        >();
        okRes.snapshots.forEach(s => {
          const id = s.canister_id.toText();
          if (!snapshotsByCanister.has(id)) {
            snapshotsByCanister.set(id, []);
          }
          snapshotsByCanister.get(id)!.push(s);
        });

        // Check each canister has increasing timestamps
        for (const snapshots of snapshotsByCanister.values()) {
          if (snapshots.length < 2) continue;

          // Sort by timestamp
          snapshots.sort((a, b) => Number(a.timestamp_ns - b.timestamp_ns));

          for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i - 1]!;
            const curr = snapshots[i]!;

            // Timestamp should strictly increase
            expect(curr.timestamp_ns).toBeGreaterThan(prev.timestamp_ns);
          }
        }
      }
    });

    it('should evict metrics older than 24 hours', async () => {
      driver.cyclesMonitorActor.setIdentity(controllerIdentity);
      await driver.createCanisters(5);

      await waitForSync(); // canister history sync
      await waitForSync(); // cycles monitor sync

      let maxOldTimestampNs: bigint;
      {
        const res = await driver.cyclesMonitorActor.list_metrics_after({
          cursor: [],
        });
        const okRes = extractOkResponse(res);
        // 2 test canisters synced twice
        // other 5 canisters synced once
        expect(okRes.snapshots.length).toBe(9);
        expect(okRes.next_cursor.length).toBe(0);

        // Find the maximum timestamp from the first set of snapshots
        maxOldTimestampNs = okRes.snapshots.reduce(
          (max, s) => (s.timestamp_ns > max ? s.timestamp_ns : max),
          0n,
        );
      }

      const twentyFiveHoursMs = hoursToMilliseconds(25);
      // Advance time by more than 24 hours
      await driver.pic.advanceCertifiedTime(twentyFiveHoursMs);
      // wait for sync
      await driver.pic.tick(3);

      {
        const res = await driver.cyclesMonitorActor.list_metrics_after({
          cursor: [],
        });
        const okRes = extractOkResponse(res);

        // 9 old snapshots removed, all 7 canisters synced once
        expect(okRes.snapshots.length).toBe(7);
        expect(okRes.next_cursor.length).toBe(0);

        // All returned snapshots should now be newer than the max timestamp from before the time advance
        for (const snapshot of okRes.snapshots) {
          expect(snapshot.timestamp_ns).toBeGreaterThan(
            maxOldTimestampNs + millisecondsToNanoseconds(twentyFiveHoursMs),
          );
        }
      }
    });
  });
});
