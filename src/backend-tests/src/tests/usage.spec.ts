import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TestDriver,
  authServiceIdentity,
  projectNotFoundOrNoAccessError,
  unauthenticatedError,
} from '../support';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
} from '@ssn/test-utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type { CanisterUsage, GetUsageResponseData } from '@ssn/backend-api';

describe('Usage Metrics', () => {
  let driver: TestDriver;
  let userIdentity: Identity;

  function createUsage(
    canisterId: Principal | string,
    multiplier: bigint,
  ): CanisterUsage {
    return {
      canister_id: Principal.from(canisterId),
      memory: 100n * multiplier,
      memory_bytes: 200n * multiplier,
      compute_allocation: 1n * multiplier,
      compute_allocation_percent: 1n * multiplier,
      ingress_induction: 300n * multiplier,
      ingress_induction_bytes_total: 400n * multiplier,
      instructions: 500n * multiplier,
      compute_time_seconds_total: 6n * multiplier,
      request_and_response_transmission: 700n * multiplier,
      transmission_bytes_total: 800n * multiplier,
      uninstall: 90n * multiplier,
      uninstalls_total: 100n * multiplier,
      http_outcalls: 110n * multiplier,
      burned_cycles: 1200n * multiplier,
    };
  }

  // PocketIC initializes its clock to wall-time and refuses to set time
  // backwards, so test dates must stay ahead of "now". Derive two consecutive
  // future months from a base instant rather than hardcoding calendar months.
  const billingMonth = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  const futureMonths = (base: Date) => {
    const firstOfNextMonth = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1),
    );
    const month1 = new Date(firstOfNextMonth);
    const month2 = new Date(
      Date.UTC(month1.getUTCFullYear(), month1.getUTCMonth() + 1, 1),
    );
    return { month1, month2 };
  };

  const cleanUsage = (usageData: GetUsageResponseData) => {
    const cleaned = structuredClone(usageData);
    // Sort canisters predictably here as replacing their IDs with the anonymous principal
    // ruins the sorting applied by the backend which relies on canister string values.
    cleaned.canisters.sort((a, b) => {
      // Compare any arbitrary stable property since the canister_ids get wiped
      const aVal = a.burned_cycles;
      const bVal = b.burned_cycles;
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
    cleaned.canisters.forEach(c => (c.canister_id = Principal.anonymous()));
    return cleaned;
  };

  beforeEach(async () => {
    driver = await TestDriver.create();
    const [identity] = await driver.users.createUser();
    userIdentity = identity;
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('record_usage', () => {
    it('should reject unauthenticated caller', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const result = await driver.actor.record_usage({ usages: [] });
      expect(result).toEqual({
        Err: {
          code: [{ Unauthorized: {} }],
          message: 'Only the auth-service is allowed to call this endpoint',
        },
      });
    });

    it('should reject normal user', async () => {
      driver.actor.setIdentity(userIdentity);
      const result = await driver.actor.record_usage({ usages: [] });
      expect(result).toEqual({
        Err: {
          code: [{ Unauthorized: {} }],
          message: 'Only the auth-service is allowed to call this endpoint',
        },
      });
    });

    it('should accept auth service identity', async () => {
      driver.actor.setIdentity(authServiceIdentity);
      const result = await driver.actor.record_usage({ usages: [] });
      expect(result).toEqual({ Ok: {} });
    });
  });

  describe('get_usage', () => {
    it('should reject unauthenticated caller', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const result = await driver.actor.get_usage({
        project_id: 'some-id',
        billing_month: [],
      });
      expect(result).toEqual(unauthenticatedError);
    });

    it('should reject random user without project access', async () => {
      const [randomUser] = await driver.users.createUser();
      driver.actor.setIdentity(randomUser);

      const fakeProjectId = '7b003a27-0cfd-4edb-aa90-b9cc815d481f';
      const result = await driver.actor.get_usage({
        project_id: fakeProjectId,
        billing_month: [],
      });

      expect(result).toEqual(projectNotFoundOrNoAccessError(fakeProjectId));
    });
  });

  describe('Integration: Upsert and Get Usage', () => {
    it('should upsert usage across multiple canisters and correctly aggregate project usage', async () => {
      driver.actor.setIdentity(userIdentity);

      const project1 = await driver.getDefaultProject();

      const defaultOrgRes = await driver.actor.list_my_organizations();
      const orgsList = extractOkResponse(defaultOrgRes);
      const orgId = orgsList[0]!.id;

      driver.actor.setIdentity(controllerIdentity);
      extractOkResponse(
        await driver.actor.admin_set_org_billing_plan({
          org_id: orgId,
          tier: { Pro: null },
        }),
      );

      driver.actor.setIdentity(userIdentity);
      const project2Res = await driver.actor.create_project({
        org_id: orgId,
        name: 'Project 2',
      });
      const project2 = extractOkResponse(project2Res).project;

      for (let i = 0; i < 3; i++) {
        await driver.proposals.createCanister(userIdentity, project1.id);
      }
      const p1ListRes = await driver.actor.list_my_canisters({
        project_id: project1.id,
      });
      const p1Canisters = extractOkResponse(p1ListRes);

      for (let i = 0; i < 3; i++) {
        await driver.proposals.createCanister(userIdentity, project2.id);
      }
      const p2ListRes = await driver.actor.list_my_canisters({
        project_id: project2.id,
      });
      const p2Canisters = extractOkResponse(p2ListRes);

      const canisters = [...p1Canisters, ...p2Canisters];
      for (let entry = 1n; entry <= 3n; entry++) {
        const usages = [];

        for (let i = 0; i < canisters.length; i++) {
          usages.push(
            createUsage(canisters[i]!.principal_id, entry + BigInt(i)),
          );
        }

        driver.actor.setIdentity(authServiceIdentity);
        const upsertRes = await driver.actor.record_usage({ usages });
        extractOkResponse(upsertRes);
      }

      driver.actor.setIdentity(userIdentity);

      const getP1Res = await driver.actor.get_usage({
        project_id: project1.id,
        billing_month: [],
      });
      const p1Usage = extractOkResponse(getP1Res);

      const getP2Res = await driver.actor.get_usage({
        project_id: project2.id,
        billing_month: [],
      });
      const p2Usage = extractOkResponse(getP2Res);

      expect(cleanUsage(p1Usage)).toMatchSnapshot('project-1-usage');
      expect(cleanUsage(p2Usage)).toMatchSnapshot('project-2-usage');
    });

    it('should correctly retrieve historical billing months', async () => {
      driver.actor.setIdentity(userIdentity);
      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(userIdentity, project.id);

      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const canister = extractOkResponse(canisterRes)[0]!;

      const { month1, month2 } = futureMonths(
        new Date(await driver.pic.getTime()),
      );

      // Advance to mid-Month-1 and record usage there.
      {
        await driver.pic.setTime(month1);
        await driver.pic.tick();
        driver.actor.setIdentity(authServiceIdentity);
        const upsertRes = await driver.actor.record_usage({
          usages: [createUsage(canister.principal_id, 1n)],
        });
        extractOkResponse(upsertRes);
      }

      // Advance to mid-Month-2 and record usage there.
      {
        await driver.pic.setTime(month2);
        await driver.pic.tick();
        driver.actor.setIdentity(authServiceIdentity);
        const upsertRes = await driver.actor.record_usage({
          usages: [createUsage(canister.principal_id, 2n)],
        });
        extractOkResponse(upsertRes);
      }

      driver.actor.setIdentity(userIdentity);
      const month1Res = await driver.actor.get_usage({
        project_id: project.id,
        billing_month: [billingMonth(month1)],
      });
      const month1Usage = extractOkResponse(month1Res);

      const month2Res = await driver.actor.get_usage({
        project_id: project.id,
        billing_month: [billingMonth(month2)],
      });
      const month2Usage = extractOkResponse(month2Res);

      expect(cleanUsage(month1Usage)).toMatchSnapshot(
        'historical-usage-month-1',
      );
      expect(cleanUsage(month2Usage)).toMatchSnapshot(
        'historical-usage-month-2',
      );
    });

    it('returns second-month-only usage when fed lifetime-cumulative counters across a month boundary', async () => {
      driver.actor.setIdentity(userIdentity);
      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(userIdentity, project.id);

      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const canister = extractOkResponse(canisterRes)[0]!;

      const { month2 } = futureMonths(new Date(await driver.pic.getTime()));
      const endOfMonth1 = new Date(month2.getTime() - 60 * 60 * 1000);

      // Lifetime burned_cycles at end of Month 1: 1.5T (everything before Month 2).
      await driver.pic.setTime(endOfMonth1);
      await driver.pic.tick();
      driver.actor.setIdentity(authServiceIdentity);
      extractOkResponse(
        await driver.actor.record_usage({
          usages: [
            {
              ...createUsage(canister.principal_id, 0n),
              burned_cycles: 1_500_000_000_000n,
            },
          ],
        }),
      );

      // Lifetime burned_cycles at start of Month 2: only 500 cycles burned *in* Month 2.
      await driver.pic.setTime(month2);
      await driver.pic.tick();
      extractOkResponse(
        await driver.actor.record_usage({
          usages: [
            {
              ...createUsage(canister.principal_id, 0n),
              burned_cycles: 1_500_000_000_500n,
            },
          ],
        }),
      );

      driver.actor.setIdentity(userIdentity);
      const month2Usage = extractOkResponse(
        await driver.actor.get_usage({
          project_id: project.id,
          billing_month: [billingMonth(month2)],
        }),
      );

      // Usage during Month 2 should be 500 cycles. Currently returns 1.5T + 500
      // because the backend stores cumulative-at-end-of-month instead of
      // subtracting Month 1's anchor.
      expect(month2Usage.project.burned_cycles).toBe(500n);
    });
  });
});
