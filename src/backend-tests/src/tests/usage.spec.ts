import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TestDriver,
  offchainIdentity,
  projectNotFoundOrNoAccessError,
  unauthenticatedError,
} from '../support';
import { anonymousIdentity, extractOkResponse } from '@ssn/test-utils';
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

  const cleanUsage = (usageData: GetUsageResponseData) => {
    const cleaned = structuredClone(usageData);
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
          message: 'Only the offchain-service is allowed to call this endpoint',
        },
      });
    });

    it('should reject normal user', async () => {
      driver.actor.setIdentity(userIdentity);
      const result = await driver.actor.record_usage({ usages: [] });
      expect(result).toEqual({
        Err: {
          code: [{ Unauthorized: {} }],
          message: 'Only the offchain-service is allowed to call this endpoint',
        },
      });
    });

    it('should accept offchain service identity', async () => {
      driver.actor.setIdentity(offchainIdentity);
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

        driver.actor.setIdentity(offchainIdentity);
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

      // Advance time to Month 1 (June 2026)
      {
        await driver.pic.setTime(new Date('2026-06-15T12:00:00Z'));
        await driver.pic.tick();
        driver.actor.setIdentity(offchainIdentity);
        const upsertRes = await driver.actor.record_usage({
          usages: [createUsage(canister.principal_id, 1n)],
        });
        extractOkResponse(upsertRes);
      }

      // Advance time to Month 2 (July 2026)
      {
        await driver.pic.setTime(new Date('2026-07-15T12:00:00Z'));
        await driver.pic.tick();
        driver.actor.setIdentity(offchainIdentity);
        const upsertRes = await driver.actor.record_usage({
          usages: [createUsage(canister.principal_id, 2n)],
        });
        extractOkResponse(upsertRes);
      }

      driver.actor.setIdentity(userIdentity);
      const juneRes = await driver.actor.get_usage({
        project_id: project.id,
        billing_month: ['2026-06'],
      });
      const juneUsage = extractOkResponse(juneRes);

      const julyRes = await driver.actor.get_usage({
        project_id: project.id,
        billing_month: ['2026-07'],
      });
      const julyUsage = extractOkResponse(julyRes);

      expect(cleanUsage(juneUsage)).toMatchSnapshot(
        'historical-usage-june-2026',
      );
      expect(cleanUsage(julyUsage)).toMatchSnapshot(
        'historical-usage-july-2026',
      );
    });

    it('returns July-only usage when fed lifetime-cumulative counters across a month boundary', async () => {
      driver.actor.setIdentity(userIdentity);
      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(userIdentity, project.id);

      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const canister = extractOkResponse(canisterRes)[0]!;

      // Lifetime burned_cycles at end of June: 1.5T (everything before July).
      await driver.pic.setTime(new Date('2026-06-30T23:00:00Z'));
      await driver.pic.tick();
      driver.actor.setIdentity(offchainIdentity);
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

      // Lifetime burned_cycles at start of July: only 500 cycles burned *in* July.
      await driver.pic.setTime(new Date('2026-07-01T00:00:00Z'));
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
      const julyUsage = extractOkResponse(
        await driver.actor.get_usage({
          project_id: project.id,
          billing_month: ['2026-07'],
        }),
      );

      // "Usage during July" should be 500 cycles. Currently returns 1.5T + 500
      // because the backend stores cumulative-at-end-of-month instead of
      // subtracting June's anchor.
      expect(julyUsage.project.burned_cycles).toBe(500n);
    });
  });
});
