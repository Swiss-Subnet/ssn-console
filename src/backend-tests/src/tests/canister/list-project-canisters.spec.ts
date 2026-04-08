import { generateRandomIdentity } from '@dfinity/pic';
import {
  anonymousIdentity,
  extractOkResponse,
  noProfileError,
  TestDriver,
  unauthenticatedError,
} from '../../support';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Identity } from '@icp-sdk/core/agent';
import type { Canister, Project, UserProfile } from '@ssn/backend-api';
import { Principal } from '@icp-sdk/core/principal';

describe('list_project_canisters', () => {
  let driver: TestDriver;

  async function expectCanister(canister: Canister): Promise<void> {
    expect(canister).toEqual({
      id: expect.any(String),
      info: [
        {
          cycles: 0n,
          idle_cycles_burned_per_day: expect.any(BigInt),
          memory_metrics: {
            canister_history_size: expect.any(BigInt),
            custom_sections_size: 0n,
            global_memory_size: 0n,
            snapshots_size: 0n,
            stable_memory_size: 0n,
            wasm_binary_size: 0n,
            wasm_chunk_store_size: 0n,
            wasm_memory_size: 0n,
          },
          memory_size: expect.any(BigInt),
          module_hash: [],
          query_stats: {
            num_calls_total: 0n,
            num_instructions_total: 0n,
            request_payload_bytes_total: 0n,
            response_payload_bytes_total: 0n,
          },
          ready_for_migration: false,
          reserved_cycles: 0n,
          settings: {
            compute_allocation: 0n,
            controllers: [driver.canisterId],
            environment_variables: [],
            freezing_threshold: expect.any(BigInt),
            log_visibility: {
              Controllers: null,
            },
            memory_allocation: 0n,
            reserved_cycles_limit: expect.any(BigInt),
            wasm_memory_limit: expect.any(BigInt),
            wasm_memory_threshold: 0n,
          },
          status: {
            Running: null,
          },
          version: 0n,
        },
      ],
      principal_id: expect.any(String),
    });

    const controllers = await driver.pic.getControllers(
      Principal.fromText(canister.principal_id),
    );
    const hasCorrectController = controllers.some(
      c => c.compareTo(driver.canisterId) === 'eq',
    );
    expect(hasCorrectController).toBe(true);
  }

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('without canisters', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.list_project_canisters({
        project_id: crypto.randomUUID(),
        limit: [],
        page: [],
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.list_project_canisters({
        project_id: crypto.randomUUID(),
        limit: [],
        page: [],
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should return an empty array when the user has no canisters', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      const defaultProject = await driver.getDefaultProject();

      const canisters = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        defaultProject.id,
      );
      expect(canisters).toEqual([]);
    });
  });

  describe('with canisters', () => {
    let aliceIdentity: Identity;
    let aliceProject: Project;

    let bobIdentity: Identity;
    let bobProject: Project;

    const numAliceCanisters = 8;
    const numBobCanisters = 5;

    beforeEach(async () => {
      aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      aliceProject = await driver.getDefaultProject();
      for (let i = 0; i < numAliceCanisters; i++) {
        await driver.proposals.createCanister(aliceIdentity, aliceProject.id);
      }

      bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      bobProject = await driver.getDefaultProject();
      for (let i = 0; i < numBobCanisters; i++) {
        await driver.proposals.createCanister(bobIdentity, bobProject.id);
      }
    });

    it('should return all canisters owned by the user', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const aliceCanisters = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        aliceProject.id,
      );

      expect(aliceCanisters.length).toBe(numAliceCanisters);
      for (const canister of aliceCanisters) {
        await expectCanister(canister);
      }

      driver.actor.setIdentity(bobIdentity);
      const bobCanisters = await driver.canisters.getAllProjectCanisters(
        bobIdentity,
        bobProject.id,
      );

      expect(bobCanisters.length).toBe(numBobCanisters);
      for (const canister of bobCanisters) {
        await expectCanister(canister);
      }
    });

    it('should return one item per page', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.list_project_canisters({
        project_id: aliceProject.id,
        limit: [1n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);

      expect(okRes.canisters).toHaveLength(1);
      expect(okRes.meta.limit).toBe(1n);
      expect(okRes.meta.page).toBe(1n);
      expect(okRes.meta.total_items).toBe(8n);
      expect(okRes.meta.total_pages).toBe(8n);
    });

    it('should return multiple items per page', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.list_project_canisters({
        project_id: aliceProject.id,
        limit: [3n],
        page: [2n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.canisters).toHaveLength(3);
      expect(okRes.meta.limit).toBe(3n);
      expect(okRes.meta.page).toBe(2n);
      expect(okRes.meta.total_items).toBe(8n);
      expect(okRes.meta.total_pages).toBe(3n);
    });

    it('return all items on a single page', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.list_project_canisters({
        project_id: aliceProject.id,
        limit: [10n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.canisters).toHaveLength(8);
      expect(okRes.meta.limit).toBe(10n);
      expect(okRes.meta.page).toBe(1n);
      expect(okRes.meta.total_items).toBe(8n);
      expect(okRes.meta.total_pages).toBe(1n);
    });

    it('should set a minimum page', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.list_project_canisters({
        project_id: aliceProject.id,
        limit: [1n],
        page: [0n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.page).toBe(1n);
    });

    it('should set a maximum page', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.list_project_canisters({
        project_id: aliceProject.id,
        limit: [1n],
        page: [10_000n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.page).toBe(8n);
    });

    it('should set a minimum limit', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.list_project_canisters({
        project_id: aliceProject.id,
        limit: [0n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.limit).toBe(1n);
    });

    it('should set a maximum limit', async () => {
      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.list_project_canisters({
        project_id: aliceProject.id,
        limit: [10_000n],
        page: [1n],
      });
      const okRes = extractOkResponse(res);
      expect(okRes.meta.limit).toBe(50n);
    });
  });
});
