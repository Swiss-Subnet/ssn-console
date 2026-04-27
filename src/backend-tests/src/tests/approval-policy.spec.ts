import { generateRandomIdentity } from '@dfinity/pic';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestDriver } from '../support';
import { anonymousIdentity, extractOkResponse } from '@ssn/test-utils';
import type { ApprovalPolicy, Proposal } from '@ssn/backend-api';
import { Principal } from '@icp-sdk/core/principal';

async function expectPendingApproval(
  proposal: Proposal,
  expected: { threshold: number; approverCount: number; voteCount: number },
): Promise<void> {
  const [status] = proposal.status;
  if (!status || !('PendingApproval' in status)) {
    throw new Error(
      `expected PendingApproval, got ${JSON.stringify(proposal.status)}`,
    );
  }
  expect(status.PendingApproval.threshold).toBe(expected.threshold);
  expect(status.PendingApproval.approvers.length).toBe(expected.approverCount);
  expect(status.PendingApproval.votes.length).toBe(expected.voteCount);
}

function expectStatusTag(proposal: Proposal, tag: string): void {
  const [status] = proposal.status;
  if (!status || !(tag in status)) {
    throw new Error(
      `expected status ${tag}, got ${JSON.stringify(proposal.status)}`,
    );
  }
}

describe('Approval Policy + Proposal Voting', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('upsert_approval_policy', () => {
    it('should reject FixedQuorum with threshold 0', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      const res = await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 0 } },
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'FixedQuorum threshold must be at least 1.',
        },
      });
    });

    it('should reject an unauthenticated caller', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.upsert_approval_policy({
        project_id: 'does-not-matter',
        operation_type: { CreateCanister: {} },
        policy_type: { AutoApprove: {} },
      });
      expect(res).toEqual({
        Err: {
          code: [{ Unauthenticated: {} }],
          message:
            'Anonymous principals are not allowed to perform this action.',
        },
      });
    });

    it('should persist FixedQuorum and surface it via list_project_approval_policies', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      const upsertRes = await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });
      const policy = extractOkResponse(upsertRes);
      expect(policy.policy_type).toEqual({ FixedQuorum: { threshold: 2 } });
      expect(policy.operation_type).toEqual({ CreateCanister: {} });

      const listRes = await driver.actor.list_project_approval_policies({
        project_id: project.id,
      });
      const { approval_policies } = extractOkResponse(listRes);
      const createCanisterPolicy = approval_policies.find(
        (p: ApprovalPolicy) => 'CreateCanister' in p.operation_type,
      );
      expect(createCanisterPolicy?.policy_type).toEqual({
        FixedQuorum: { threshold: 2 },
      });
    });
  });

  describe('FixedQuorum end-to-end', () => {
    it('should drive a proposal through approvals to Executed', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity] = alice;
      const [bobIdentity] = bob;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });

      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(createRes);
      await expectPendingApproval(pending, {
        threshold: 2,
        approverCount: 2,
        voteCount: 0,
      });

      driver.actor.setIdentity(aliceIdentity);
      const aliceVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Approve: {} },
      });
      const afterAlice = extractOkResponse(aliceVote);
      await expectPendingApproval(afterAlice, {
        threshold: 2,
        approverCount: 2,
        voteCount: 1,
      });

      driver.actor.setIdentity(bobIdentity);
      const bobVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Approve: {} },
      });
      const executed = extractOkResponse(bobVote);
      expectStatusTag(executed, 'Executed');
    });

    it('should flip to Rejected once the threshold becomes unreachable', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity] = alice;
      const [bobIdentity] = bob;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });

      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(createRes);

      // With 2 approvers and threshold 2, any single reject makes the
      // threshold unreachable (rejections > N - threshold = 0).
      driver.actor.setIdentity(aliceIdentity);
      const aliceVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Reject: {} },
      });
      const rejected = extractOkResponse(aliceVote);
      expectStatusTag(rejected, 'Rejected');

      // A subsequent vote from Bob must be rejected — proposal is no longer
      // in PendingApproval.
      driver.actor.setIdentity(bobIdentity);
      const bobVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Reject: {} },
      });
      expect(bobVote).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Proposal ${pending.id} is not pending approval.`,
        },
      });
    });

    it('should reject proposal creation when FixedQuorum requires more approvers than exist', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });

      const res = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `FixedQuorum policy requires 2 approvers but project ${project.id} only has 1.`,
        },
      });
    });

    it('should reject a vote from a principal without PROPOSAL_APPROVE on the project', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity, , aliceOrg] = alice;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });

      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(createRes);

      // Carol is in Alice's org but on a team with no project link.
      const [carolIdentity, carolProfile] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const inviteRes = await driver.actor.create_org_invite({
        org_id: aliceOrg.id,
        target: { UserId: carolProfile.id },
      });
      const { invite } = extractOkResponse(inviteRes);
      driver.actor.setIdentity(carolIdentity);
      await driver.actor.accept_org_invite({ invite_id: invite.id });

      const carolVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Approve: {} },
      });
      expect(carolVote).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Proposal with id ${pending.id} does not exist or you do not have access.`,
        },
      });
    });

    it('should reject a duplicate vote from the same approver', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity] = alice;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });

      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(createRes);

      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Approve: {} },
      });
      const second = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Reject: {} },
      });
      expect(second).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Principal ${aliceIdentity.getPrincipal()} has already voted on proposal ${pending.id}.`,
        },
      });
    });
  });
});

describe('Proposal queries and lifecycle', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('proposer_id', () => {
    it('records the caller as proposer on creation', async () => {
      const [aliceIdentity, aliceProfile] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const proposal = extractOkResponse(createRes);
      expect(proposal.proposer_id).toBe(aliceProfile.id);
    });
  });

  describe('get_proposal', () => {
    it('fetches a proposal for a project member', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity, aliceProfile] = alice;
      const [bobIdentity] = bob;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });
      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const created = extractOkResponse(createRes);

      driver.actor.setIdentity(bobIdentity);
      const getRes = await driver.actor.get_proposal({
        proposal_id: created.id,
      });
      const fetched = extractOkResponse(getRes);
      expect(fetched.id).toBe(created.id);
      expect(fetched.project_id).toBe(project.id);
      expect(fetched.proposer_id).toBe(aliceProfile.id);
      expectStatusTag(fetched, 'PendingApproval');
    });

    it('returns a generic error for a non-existent proposal id', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);

      const ghost = '00000000-0000-0000-0000-000000000000';
      const res = await driver.actor.get_proposal({ proposal_id: ghost });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Proposal with id ${ghost} does not exist or you do not have access.`,
        },
      });
    });

    it('hides proposal existence from a caller outside the project org', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const created = extractOkResponse(createRes);

      const [strangerIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(strangerIdentity);
      const res = await driver.actor.get_proposal({ proposal_id: created.id });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Proposal with id ${created.id} does not exist or you do not have access.`,
        },
      });
    });
  });

  describe('list_project_proposals', () => {
    it('returns an empty list for a fresh project', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      const res = await driver.actor.list_project_proposals({
        project_id: project.id,
        status_filter: [],
        after: [],
        limit: [],
      });
      const { proposals } = extractOkResponse(res);
      expect(proposals).toEqual([]);
    });

    it('lists proposals for the project and filters by status', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity] = alice;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      // First proposal auto-approves and ends in Executed.
      await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      // Switch the policy to FixedQuorum so the next one stays pending.
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });
      const pendingRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(pendingRes);

      const allRes = await driver.actor.list_project_proposals({
        project_id: project.id,
        status_filter: [],
        after: [],
        limit: [],
      });
      const { proposals: all } = extractOkResponse(allRes);
      expect(all.length).toBe(2);

      const pendingOnlyRes = await driver.actor.list_project_proposals({
        project_id: project.id,
        status_filter: [[{ PendingApproval: {} }]],
        after: [],
        limit: [],
      });
      const { proposals: pendingOnly } = extractOkResponse(pendingOnlyRes);
      expect(pendingOnly.length).toBe(1);
      expect(pendingOnly[0]!.id).toBe(pending.id);
    });

    it('rejects a caller without project access', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      const [strangerIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(strangerIdentity);
      const res = await driver.actor.list_project_proposals({
        project_id: project.id,
        status_filter: [],
        after: [],
        limit: [],
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Project with id ${project.id} does not exist or you do not have access.`,
        },
      });
    });
  });

  describe('cancel_proposal', () => {
    it('lets the proposer cancel a pending proposal', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity] = alice;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });
      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(createRes);

      const cancelRes = await driver.actor.cancel_proposal({
        proposal_id: pending.id,
      });
      const cancelled = extractOkResponse(cancelRes);
      expectStatusTag(cancelled, 'Cancelled');
    });

    it('rejects a vote on a cancelled proposal', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity] = alice;
      const [bobIdentity] = bob;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });
      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(createRes);

      await driver.actor.cancel_proposal({ proposal_id: pending.id });

      driver.actor.setIdentity(bobIdentity);
      const voteRes = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Approve: {} },
      });
      expect(voteRes).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Proposal ${pending.id} is not pending approval.`,
        },
      });
    });

    it('rejects cancelling an executed proposal', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      // AutoApprove default → goes straight to Executed.
      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const executed = extractOkResponse(createRes);
      expectStatusTag(executed, 'Executed');

      const cancelRes = await driver.actor.cancel_proposal({
        proposal_id: executed.id,
      });
      expect(cancelRes).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Proposal ${executed.id} cannot be cancelled in its current state.`,
        },
      });
    });

    it('hides cancellation from a caller outside the project org', async () => {
      const alice = await driver.users.createUser();
      const [aliceIdentity] = alice;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      await driver.actor.upsert_approval_policy({
        project_id: project.id,
        operation_type: { CreateCanister: {} },
        policy_type: { FixedQuorum: { threshold: 2 } },
      });
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);
      driver.actor.setIdentity(aliceIdentity);
      const createRes = await driver.actor.create_proposal({
        project_id: project.id,
        operation: [{ CreateCanister: {} }],
      });
      const pending = extractOkResponse(createRes);

      const [strangerIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(strangerIdentity);
      const res = await driver.actor.cancel_proposal({
        proposal_id: pending.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Proposal with id ${pending.id} does not exist or you do not have access.`,
        },
      });
    });
  });

  describe('get_user_profiles_by_principals', () => {
    it('resolves project members and returns no profile for non-members', async () => {
      const alice = await driver.users.createUser();
      const bob = await driver.users.createUser();
      await driver.users.inviteIntoOrgAndDefaultTeam(alice, bob);

      const [aliceIdentity] = alice;
      const [bobIdentity, bobProfile] = bob;
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();
      const [strangerIdentity] = await driver.users.createUser();
      const ghost = generateRandomIdentity().getPrincipal();

      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.get_user_profiles_by_principals({
        project_id: project.id,
        principals: [
          bobIdentity.getPrincipal(),
          strangerIdentity.getPrincipal(),
          ghost,
        ],
      });
      const lookups = extractOkResponse(res);
      expect(lookups.length).toBe(3);

      const findBy = (principal: Principal) =>
        lookups.find(l => l.subject_principal.toText() === principal.toText());

      const bobLookup = findBy(bobIdentity.getPrincipal());
      expect(bobLookup?.profile[0]?.id).toBe(bobProfile.id);

      const strangerLookup = findBy(strangerIdentity.getPrincipal());
      expect(strangerLookup?.profile).toEqual([]);

      const ghostLookup = findBy(ghost);
      expect(ghostLookup?.profile).toEqual([]);
    });

    it('rejects a caller without project access', async () => {
      const [aliceIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(aliceIdentity);
      const project = await driver.getDefaultProject();

      const [strangerIdentity] = await driver.users.createUser();
      driver.actor.setIdentity(strangerIdentity);
      const res = await driver.actor.get_user_profiles_by_principals({
        project_id: project.id,
        principals: [aliceIdentity.getPrincipal()],
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Project with id ${project.id} does not exist or you do not have access.`,
        },
      });
    });
  });
});
