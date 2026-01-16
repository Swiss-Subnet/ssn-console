import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { anonymousIdentity, controllerIdentity, TestDriver } from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

describe('Cycles Ledger', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('create_canister', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      await expect(
        driver.actor.create_canister({
          amount: 0n,
          created_at_time: [],
          from_subaccount: [new Uint8Array()],
          creation_args: [],
        }),
      ).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(
        driver.actor.create_canister({
          amount: 0n,
          created_at_time: [],
          from_subaccount: [],
          creation_args: [],
        }),
      ).rejects.toThrowError(/Only trusted partners can perform this action/);
    });

    it('should return an error for a controller', async () => {
      driver.actor.setIdentity(controllerIdentity);

      await expect(
        driver.actor.create_canister({
          amount: 0n,
          created_at_time: [],
          from_subaccount: [],
          creation_args: [],
        }),
      ).rejects.toThrowError(/Only trusted partners can perform this action/);
    });

    it('should create a canister for a trusted partner', async () => {
      const trustedPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_trusted_partner({
        name: 'Trusted Partner',
        principal_id: trustedPartnerIdentity.getPrincipal().toText(),
      });

      driver.actor.setIdentity(trustedPartnerIdentity);
      const canister = await driver.actor.create_canister({
        amount: 0n,
        created_at_time: [],
        from_subaccount: [],
        creation_args: [],
      });
      if ('Err' in canister) {
        throw new Error(`Failed to create canister: ${canister.Err}`);
      }
      const controllers = await driver.pic.getControllers(
        canister.Ok.canister_id,
      );

      expect(
        controllers.some(c =>
          c.compareTo(trustedPartnerIdentity.getPrincipal()),
        ),
      ).toBe(true);
    });

    it('should default the controllers to the trusted partner if none are provided', async () => {
      const trustedPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_trusted_partner({
        name: 'Trusted Partner',
        principal_id: trustedPartnerIdentity.getPrincipal().toText(),
      });

      driver.actor.setIdentity(trustedPartnerIdentity);
      const canister = await driver.actor.create_canister({
        amount: 0n,
        created_at_time: [],
        from_subaccount: [],
        creation_args: [
          {
            subnet_selection: [],
            settings: [
              {
                controllers: [],
                compute_allocation: [0n],
                environment_variables: [],
                freezing_threshold: [0n],
                log_visibility: [],
                memory_allocation: [0n],
                reserved_cycles_limit: [0n],
                wasm_memory_limit: [0n],
                wasm_memory_threshold: [0n],
              },
            ],
          },
        ],
      });
      if ('Err' in canister) {
        throw new Error(`Failed to create canister: ${canister.Err}`);
      }
      const controllers = await driver.pic.getControllers(
        canister.Ok.canister_id,
      );

      expect(
        controllers.some(c =>
          c.compareTo(trustedPartnerIdentity.getPrincipal()),
        ),
      ).toBe(true);
    });

    it('should not default the controllers to the trusted partner if they are explicitly provided', async () => {
      const trustedPartnerIdentity = generateRandomIdentity();
      const aliceIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_trusted_partner({
        name: 'Trusted Partner',
        principal_id: trustedPartnerIdentity.getPrincipal().toText(),
      });

      driver.actor.setIdentity(trustedPartnerIdentity);
      const canister = await driver.actor.create_canister({
        amount: 0n,
        created_at_time: [],
        from_subaccount: [],
        creation_args: [
          {
            subnet_selection: [],
            settings: [
              {
                controllers: [[aliceIdentity.getPrincipal()]],
                compute_allocation: [0n],
                environment_variables: [],
                freezing_threshold: [0n],
                log_visibility: [],
                memory_allocation: [0n],
                reserved_cycles_limit: [0n],
                wasm_memory_limit: [0n],
                wasm_memory_threshold: [0n],
              },
            ],
          },
        ],
      });
      if ('Err' in canister) {
        throw new Error(`Failed to create canister: ${canister.Err}`);
      }
      const controllers = await driver.pic.getControllers(
        canister.Ok.canister_id,
      );

      expect(
        controllers.some(
          c => c.compareTo(trustedPartnerIdentity.getPrincipal()) === 'eq',
        ),
      ).toBe(false);
      expect(
        controllers.some(
          c => c.compareTo(aliceIdentity.getPrincipal()) === 'eq',
        ),
      ).toBe(true);
    });
  });
});
