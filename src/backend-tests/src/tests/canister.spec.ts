import { generateRandomIdentity } from '@dfinity/pic';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
  inactiveUserError,
  latestTermsAndConditionsError,
  noProfileError,
  notOwnedProjectError,
  TestDriver,
  unauthenticatedError,
} from '../support';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';
import type { Canister } from '@ssn/backend-api';

describe('Canisters', () => {
  const projectId = '9c9cfd54-b456-42bb-892f-6bc7b1907aeb';
  const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
  const controllerId = Principal.fromUint8Array(new Uint8Array([1]));

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

  describe('create_canister', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const proposalRes = await driver.actor.create_proposal({
        project_id: projectId,
        operation: [{ CreateCanister: {} }],
      });
      expect(proposalRes).toEqual(unauthenticatedError);
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_proposal({
        project_id: projectId,
        operation: [{ CreateCanister: {} }],
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should return an error for an inactive user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await driver.actor.create_my_user_profile();
      const project = await driver.getDefaultProject();

      const res = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      expect(res).toEqual(inactiveUserError());
    });

    it('should return an error for a project the user does not have access to', async () => {
      const [aliceIdentity, aliceProfile] = await driver.users.createUser();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobProject = await driver.getDefaultProject();

      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.create_proposal({
        project_id: bobProject.id,
        operation: [{ CreateCanister: {} }],
      });
      expect(res).toEqual(notOwnedProjectError(aliceProfile.id, bobProject.id));
    });

    it('should return an error for a project that does not exist', async () => {
      const [aliceIdentity, aliceProfile] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_proposal({
        project_id: projectId,
        operation: [{ CreateCanister: {} }],
      });
      expect(res).toEqual(notOwnedProjectError(aliceProfile.id, projectId));
    });

    it('should create a canister for a valid user', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);

      const [canister] = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        project.id,
      );
      await expectCanister(canister!);
    });

    it('should return an error for a user who has not accepted the latest terms and conditions', async () => {
      const [aliceIdentity] = await driver.users.createUser();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      const res = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      expect(res).toEqual(latestTermsAndConditionsError);
    });

    it('should return an error for a user who has explicitly rejected the latest terms and conditions', async () => {
      const [aliceIdentity] = await driver.users.createUser();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const temrsAndConditionsRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditions] = extractOkResponse(temrsAndConditionsRes);
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Reject: null },
      });

      const project = await driver.getDefaultProject();
      const res = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      expect(res).toEqual(latestTermsAndConditionsError);
    });

    it('should create a canister for a controller without accepting terms and conditions', async () => {
      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(controllerIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        controllerIdentity,
        project.id,
      );
      await expectCanister(canister!);
    });

    it('should create a canister for a user who has accepted the latest terms and conditions', async () => {
      const [aliceIdentity] = await driver.users.createUser();

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const termsAndConditionsRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditions] = extractOkResponse(termsAndConditionsRes);
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Accept: null },
      });

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        project.id,
      );
      await expectCanister(canister!);
    });
  });

  describe('add_canister_controller', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.create_proposal({
        project_id: projectId,
        operation: [
          {
            AddCanisterController: {
              canister_id: canisterId,
              controller_id: controllerId,
            },
          },
        ],
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_proposal({
        project_id: projectId,
        operation: [
          {
            AddCanisterController: {
              canister_id: canisterId,
              controller_id: controllerId,
            },
          },
        ],
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should return an error for a project the user does not have access to', async () => {
      const [aliceIdentity, aliceProfile] = await driver.users.createUser();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobProject = await driver.getDefaultProject();

      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.create_proposal({
        project_id: bobProject.id,
        operation: [
          {
            AddCanisterController: {
              canister_id: canisterId,
              controller_id: controllerId,
            },
          },
        ],
      });
      expect(res).toEqual(notOwnedProjectError(aliceProfile.id, bobProject.id));
    });

    it('should return an error for a project that does not exist', async () => {
      const [aliceIdentity, aliceProfile] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_proposal({
        project_id: projectId,
        operation: [
          {
            AddCanisterController: {
              canister_id: canisterId,
              controller_id: controllerId,
            },
          },
        ],
      });
      expect(res).toEqual(notOwnedProjectError(aliceProfile.id, projectId));
    });

    it('should return an error for a canister that does not exist', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      const proposal = await driver.proposals.addCanisterController(
        aliceIdentity,
        project.id,
        canisterId,
        controllerId,
      );

      const [status] = proposal.status;
      if (!status || !('Failed' in status)) {
        throw new Error('Expected a failed proposal');
      }
      expect(status.Failed.message).toMatch(
        new RegExp(`Failed to get canister_status for canister ${canisterId}`),
      );
    });

    it('should return an error if the controller has already been added', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        project.id,
      );
      const canisterId = Principal.fromText(canister!.principal_id);

      await driver.proposals.addCanisterController(
        aliceIdentity,
        project.id,
        canisterId,
        controllerId,
      );

      const proposal = await driver.proposals.addCanisterController(
        aliceIdentity,
        project.id,
        canisterId,
        controllerId,
      );

      const [status] = proposal.status;
      if (!status || !('Failed' in status)) {
        throw new Error('Expected a failed proposal');
      }
      expect(status.Failed.message).toMatch(
        new RegExp(
          `Controller ${controllerId} is already a controller of canister ${canisterId}`,
        ),
      );
    });

    it('should add a controller for a valid user and canister', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        project.id,
      );

      await driver.proposals.addCanisterController(
        aliceIdentity,
        project.id,
        Principal.fromText(canister!.principal_id),
        controllerId,
      );

      const controllers = await driver.pic.getControllers(
        Principal.fromText(canister!.principal_id),
      );
      const hasCorrectController = controllers.some(
        c => c.compareTo(controllerId) === 'eq',
      );
      expect(hasCorrectController).toBe(true);
    });

    it('should return an error for a user who has not accepted the latest terms and conditions', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        project.id,
      );

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [
          {
            AddCanisterController: {
              canister_id: Principal.fromText(canister!.principal_id),
              controller_id: controllerId,
            },
          },
        ],
      });
      expect(res).toEqual(latestTermsAndConditionsError);
    });

    it('should return an error for a user who has explicitly rejected the latest terms and conditions', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        project.id,
      );

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const termsAndConditionsRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditions] = extractOkResponse(termsAndConditionsRes);
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Reject: null },
      });

      const res = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [
          {
            AddCanisterController: {
              canister_id: Principal.fromText(canister!.principal_id),
              controller_id: controllerId,
            },
          },
        ],
      });
      expect(res).toEqual(latestTermsAndConditionsError);
    });

    it('should add a controller for a controller without accepting terms and conditions', async () => {
      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(controllerIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        controllerIdentity,
        project.id,
      );

      await driver.proposals.addCanisterController(
        controllerIdentity,
        project.id,
        Principal.fromText(canister!.principal_id),
        controllerId,
      );

      const controllers = await driver.pic.getControllers(
        Principal.fromText(canister!.principal_id),
      );
      const hasCorrectController = controllers.some(
        c => c.compareTo(controllerId) === 'eq',
      );
      expect(hasCorrectController).toBe(true);
    });

    it('should add a controller for a user who has accepted the latest terms and conditions', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.create_terms_and_conditions({
        content: 'Terms and conditions content',
        comment: 'Terms and conditions comment',
      });

      driver.actor.setIdentity(aliceIdentity);
      const termsAndConditionsRes =
        await driver.actor.get_latest_terms_and_conditions();
      const [termsAndConditions] = extractOkResponse(termsAndConditionsRes);
      if (!termsAndConditions) {
        throw new Error('Terms and conditions not found');
      }

      await driver.actor.upsert_terms_and_conditions_decision({
        terms_and_conditions_id: termsAndConditions.id,
        decision_type: { Accept: null },
      });

      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);
      const [canister] = await driver.canisters.getAllProjectCanisters(
        aliceIdentity,
        project.id,
      );

      await driver.proposals.addCanisterController(
        aliceIdentity,
        project.id,
        Principal.fromText(canister!.principal_id),
        controllerId,
      );

      const controllers = await driver.pic.getControllers(
        Principal.fromText(canister!.principal_id),
      );
      const hasCorrectController = controllers.some(
        c => c.compareTo(controllerId) === 'eq',
      );
      expect(hasCorrectController).toBe(true);
    });
  });
});
