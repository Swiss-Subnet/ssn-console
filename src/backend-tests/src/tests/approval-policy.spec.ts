import { generateRandomIdentity } from '@dfinity/pic';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestDriver } from '../support';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
} from '@ssn/test-utils';
import type { ApprovalPolicy, Proposal } from '@ssn/backend-api';

async function createActivatedUser(driver: TestDriver) {
  const identity = generateRandomIdentity();
  driver.actor.setIdentity(identity);
  const profileRes = await driver.actor.create_my_user_profile();
  const profile = extractOkResponse(profileRes);
  const orgsRes = await driver.actor.list_my_organizations();
  const [org] = extractOkResponse(orgsRes);
  if (!org) {
    throw new Error('Expected default organization after signup');
  }

  driver.actor.setIdentity(controllerIdentity);
  await driver.actor.update_user_profile({
    user_id: profile.id,
    status: [{ Active: null }],
  });

  driver.actor.setIdentity(identity);
  return { identity, profile, org };
}

async function inviteUserIntoOrgAndDefaultTeam(
  driver: TestDriver,
  host: Awaited<ReturnType<typeof createActivatedUser>>,
  guest: Awaited<ReturnType<typeof createActivatedUser>>,
) {
  driver.actor.setIdentity(host.identity);
  const teamsRes = await driver.actor.list_org_teams({ org_id: host.org.id });
  const [defaultTeam] = extractOkResponse(teamsRes);
  if (!defaultTeam) {
    throw new Error('Expected default team after signup');
  }

  const inviteRes = await driver.actor.create_org_invite({
    org_id: host.org.id,
    target: { UserId: guest.profile.id },
  });
  const { invite } = extractOkResponse(inviteRes);

  driver.actor.setIdentity(guest.identity);
  await driver.actor.accept_org_invite({ invite_id: invite.id });

  driver.actor.setIdentity(host.identity);
  await driver.actor.add_user_to_team({
    team_id: defaultTeam.id,
    user_id: guest.profile.id,
  });
}

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
      const alice = await createActivatedUser(driver);
      const project = await driver.getDefaultProject();

      driver.actor.setIdentity(alice.identity);
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
      const alice = await createActivatedUser(driver);
      const project = await driver.getDefaultProject();

      driver.actor.setIdentity(alice.identity);
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
      const alice = await createActivatedUser(driver);
      const bob = await createActivatedUser(driver);
      await inviteUserIntoOrgAndDefaultTeam(driver, alice, bob);

      driver.actor.setIdentity(alice.identity);
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

      driver.actor.setIdentity(alice.identity);
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

      driver.actor.setIdentity(bob.identity);
      const bobVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Approve: {} },
      });
      const executed = extractOkResponse(bobVote);
      expectStatusTag(executed, 'Executed');
    });

    it('should flip to Rejected once the threshold becomes unreachable', async () => {
      const alice = await createActivatedUser(driver);
      const bob = await createActivatedUser(driver);
      await inviteUserIntoOrgAndDefaultTeam(driver, alice, bob);

      driver.actor.setIdentity(alice.identity);
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
      driver.actor.setIdentity(alice.identity);
      const aliceVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Reject: {} },
      });
      const rejected = extractOkResponse(aliceVote);
      expectStatusTag(rejected, 'Rejected');

      // A subsequent vote from Bob must be rejected — proposal is no longer
      // in PendingApproval.
      driver.actor.setIdentity(bob.identity);
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
      const alice = await createActivatedUser(driver);
      const project = await driver.getDefaultProject();

      driver.actor.setIdentity(alice.identity);
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
      const alice = await createActivatedUser(driver);
      const bob = await createActivatedUser(driver);
      await inviteUserIntoOrgAndDefaultTeam(driver, alice, bob);

      driver.actor.setIdentity(alice.identity);
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
      const carol = await createActivatedUser(driver);
      driver.actor.setIdentity(alice.identity);
      const inviteRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: carol.profile.id },
      });
      const { invite } = extractOkResponse(inviteRes);
      driver.actor.setIdentity(carol.identity);
      await driver.actor.accept_org_invite({ invite_id: invite.id });

      const carolVote = await driver.actor.vote_proposal({
        proposal_id: pending.id,
        vote: { Approve: {} },
      });
      expect(carolVote).toEqual({
        Err: {
          code: [{ Unauthorized: {} }],
          message: `User with id ${carol.profile.id} does not have access to project with id ${project.id}`,
        },
      });
    });

    it('should reject a duplicate vote from the same approver', async () => {
      const alice = await createActivatedUser(driver);
      const bob = await createActivatedUser(driver);
      await inviteUserIntoOrgAndDefaultTeam(driver, alice, bob);

      driver.actor.setIdentity(alice.identity);
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

      driver.actor.setIdentity(alice.identity);
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
          message: `Principal ${alice.identity.getPrincipal()} has already voted on proposal ${pending.id}.`,
        },
      });
    });
  });
});
