import { generateRandomIdentity } from '@dfinity/pic';
import { anonymousIdentity, controllerIdentity, TestDriver } from '../support';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';
import type { Canister } from '@ssn/backend-api';

describe('Canisters', () => {
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

  describe('list_my_canisters', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(driver.actor.list_my_canisters()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(driver.actor.list_my_canisters()).rejects.toThrowError(
        new RegExp(
          `User profile for principal ${aliceIdentity.getPrincipal()} does not exist`,
        ),
      );
    });

    it('should return an empty array when the user has no canisters', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const canisters = await driver.actor.list_my_canisters();
      expect(canisters).toEqual([]);
    });

    it('should return all canisters owned by the user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      await driver.createCanister();
      await driver.createCanister();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      await driver.createCanister();
      await driver.createCanister();
      await driver.createCanister();

      driver.actor.setIdentity(aliceIdentity);
      const aliceCanisters = await driver.actor.list_my_canisters();

      expect(aliceCanisters.length).toBe(2);
      await expectCanister(aliceCanisters[0]);
      await expectCanister(aliceCanisters[1]);

      driver.actor.setIdentity(bobIdentity);
      const bobCanisters = await driver.actor.list_my_canisters();

      expect(bobCanisters.length).toBe(3);
      await expectCanister(bobCanisters[0]);
      await expectCanister(bobCanisters[1]);
      await expectCanister(bobCanisters[2]);
    });
  });

  describe('create_my_canister', () => {
    it('should create a canister for a valid user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      await driver.createCanister();
      const [canister] = await driver.actor.list_my_canisters();
      await expectCanister(canister);
    });

    it('should return an error for a user who has not accepted the latest terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      await expect(driver.createCanister()).rejects.toThrowError(
        /The latest terms and conditions must be accepted to perform this action/,
      );
    });

    it('should return an error for a user who has explicitly rejected the latest terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const [termsAndConditions] =
        await driver.actor.get_latest_terms_and_conditions();
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Reject: null },
      });

      await expect(driver.createCanister()).rejects.toThrowError(
        /The latest terms and conditions must be accepted to perform this action/,
      );
    });

    it('should create a canister for a controller without accepting terms and conditions', async () => {
      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });
      await driver.createCanister();
      const [canister] = await driver.actor.list_my_canisters();
      await expectCanister(canister);
    });

    it('should create a canister for a user who has accepted the latest terms and conditions', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const [termsAndConditions] =
        await driver.actor.get_latest_terms_and_conditions();
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Accept: null },
      });

      await driver.createCanister();
      const [canister] = await driver.actor.list_my_canisters();
      await expectCanister(canister);
    });
  });
});
