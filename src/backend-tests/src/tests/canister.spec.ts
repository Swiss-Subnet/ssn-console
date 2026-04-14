import { generateRandomIdentity } from '@dfinity/pic';
import type { Identity } from '@icp-sdk/core/agent';
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
import { IDL } from '@icp-sdk/core/candid';
import type { Canister } from '@ssn/backend-api';

const MANAGEMENT_CANISTER_ID = Principal.fromText('aaaaa-aa');
const DeleteCanisterArgs = IDL.Record({ canister_id: IDL.Principal });

async function deleteCanisterOnChain(
  driver: TestDriver,
  canisterPrincipal: Principal,
): Promise<void> {
  await driver.pic.addCycles(canisterPrincipal, 1_000_000_000_000n);
  await driver.pic.stopCanister({
    canisterId: canisterPrincipal,
    sender: driver.canisterId,
  });
  await driver.pic.updateCall({
    canisterId: MANAGEMENT_CANISTER_ID,
    method: 'delete_canister',
    arg: new Uint8Array(
      IDL.encode([DeleteCanisterArgs], [{ canister_id: canisterPrincipal }]),
    ),
    sender: driver.canisterId,
  });
}

describe('Canisters', () => {
  const projectId = '9c9cfd54-b456-42bb-892f-6bc7b1907aeb';
  const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
  const controllerId = Principal.fromUint8Array(new Uint8Array([1]));

  let driver: TestDriver;

  async function expectCanister(canister: Canister): Promise<void> {
    expect(canister).toEqual({
      id: expect.any(String),
      state: {
        Accessible: {
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
      },
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

      const res = await driver.actor.list_my_canisters({
        project_id: projectId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a user without a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.list_my_canisters({
        project_id: projectId,
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should return an empty array when the user has no canisters', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const project = await driver.getDefaultProject();
      const canistersRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const canisters = extractOkResponse(canistersRes);
      expect(canisters).toEqual([]);
    });

    it('should return all canisters owned by the user', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProject = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, aliceProject.id);
      await driver.proposals.createCanister(aliceIdentity, aliceProject.id);

      const [bobIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(bobIdentity);
      const bobProject = await driver.getDefaultProject();
      await driver.proposals.createCanister(bobIdentity, bobProject.id);
      await driver.proposals.createCanister(bobIdentity, bobProject.id);
      await driver.proposals.createCanister(bobIdentity, bobProject.id);

      driver.actor.setIdentity(aliceIdentity);
      const aliceCanistersRes = await driver.actor.list_my_canisters({
        project_id: aliceProject.id,
      });
      const aliceCanisters = extractOkResponse(aliceCanistersRes);

      expect(aliceCanisters.length).toBe(2);
      await expectCanister(aliceCanisters[0]!);
      await expectCanister(aliceCanisters[1]!);

      driver.actor.setIdentity(bobIdentity);
      const bobCanistersRes = await driver.actor.list_my_canisters({
        project_id: bobProject.id,
      });
      const bobCanisters = extractOkResponse(bobCanistersRes);

      expect(bobCanisters.length).toBe(3);
      await expectCanister(bobCanisters[0]!);
      await expectCanister(bobCanisters[1]!);
      await expectCanister(bobCanisters[2]!);
    });
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

      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);
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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);
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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);
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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);
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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);

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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);

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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);

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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);

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
      const canisterRes = await driver.actor.list_my_canisters({
        project_id: project.id,
      });
      const [canister] = extractOkResponse(canisterRes);

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

  describe('deleted canisters', () => {
    async function createAndDeleteCanister(): Promise<{
      identity: Identity;
      projectId: string;
      record: Canister;
    }> {
      const [identity] = await driver.users.createUser();
      driver.actor.setIdentity(identity);
      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(identity, project.id);

      const before = extractOkResponse(
        await driver.actor.list_my_canisters({ project_id: project.id }),
      );
      expect(before).toHaveLength(1);
      const record = before[0]!;

      await deleteCanisterOnChain(
        driver,
        Principal.fromText(record.principal_id),
      );

      return { identity, projectId: project.id, record };
    }

    it('list_my_canisters reports Deleted state for canisters removed on-chain', async () => {
      const { projectId, record } = await createAndDeleteCanister();

      const after = extractOkResponse(
        await driver.actor.list_my_canisters({ project_id: projectId }),
      );
      expect(after).toHaveLength(1);
      expect(after[0]!.id).toBe(record.id);
      expect(after[0]!.state).toEqual({ Deleted: null });
    });

    it('remove_my_canister deletes the record for a canister removed on-chain', async () => {
      const { projectId, record } = await createAndDeleteCanister();

      const removeRes = await driver.actor.remove_my_canister({
        canister_id: record.id,
      });
      extractOkResponse(removeRes);

      const after = extractOkResponse(
        await driver.actor.list_my_canisters({ project_id: projectId }),
      );
      expect(after).toEqual([]);
    });

    it('remove_my_canister rejects canisters that still exist on-chain', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.proposals.createCanister(aliceIdentity, project.id);

      const [record] = extractOkResponse(
        await driver.actor.list_my_canisters({ project_id: project.id }),
      );

      const removeRes = await driver.actor.remove_my_canister({
        canister_id: record!.id,
      });
      expect(removeRes).toHaveProperty('Err');

      const after = extractOkResponse(
        await driver.actor.list_my_canisters({ project_id: project.id }),
      );
      expect(after).toHaveLength(1);
    });

    it('remove_my_canister rejects callers who do not own the canister', async () => {
      const { record } = await createAndDeleteCanister();

      const [bobIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(bobIdentity);

      const removeRes = await driver.actor.remove_my_canister({
        canister_id: record.id,
      });
      expect(removeRes).toHaveProperty('Err');
    });
  });
});
