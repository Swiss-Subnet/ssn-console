import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TestDriver,
  canisterQuotaExceededError,
  lacksStaffPermissionError,
  noOrgError,
  unauthenticatedError,
} from '../support';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
} from '@ssn/test-utils';
import { generateRandomIdentity } from '@dfinity/pic';

describe('admin_set_org_billing_plan', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  it('should return an error for an anonymous caller', async () => {
    const [, , org] = await driver.users.createUser();

    driver.actor.setIdentity(anonymousIdentity);
    const res = await driver.actor.admin_set_org_billing_plan({
      org_id: org.id,
      tier: { Pro: null },
    });
    expect(res).toEqual(unauthenticatedError);
  });

  it('should return an error for a caller without WRITE_BILLING staff permission', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();

    driver.actor.setIdentity(aliceIdentity);
    const res = await driver.actor.admin_set_org_billing_plan({
      org_id: org.id,
      tier: { Pro: null },
    });
    expect(res).toEqual(lacksStaffPermissionError('WRITE_BILLING'));
  });

  it('should return an error when the org does not exist', async () => {
    const missingOrgId = '00000000-0000-0000-0000-000000000000';

    driver.actor.setIdentity(controllerIdentity);
    const res = await driver.actor.admin_set_org_billing_plan({
      org_id: missingOrgId,
      tier: { Pro: null },
    });
    expect(res).toEqual({
      Err: {
        code: [{ ClientError: {} }],
        message: `Organization with id ${missingOrgId} does not exist.`,
      },
    });
  });

  // Enterprise plans carry custom limits and need a separate, richer
  // endpoint. The simple (org_id, tier) setter refuses Enterprise rather
  // than writing arbitrary defaults.
  it('should reject Enterprise tier on the simple setter', async () => {
    const [, , org] = await driver.users.createUser();

    driver.actor.setIdentity(controllerIdentity);
    const res = await driver.actor.admin_set_org_billing_plan({
      org_id: org.id,
      tier: { Enterprise: null },
    });
    expect(res).toEqual({
      Err: {
        code: [{ ClientError: {} }],
        message:
          'Enterprise plans must be assigned via the custom-limits endpoint.',
      },
    });
  });

  // Proves the write actually took effect: after switching to Pro the
  // org can exceed the Free-tier 3-canister cap.
  it('should grant Pro tier and lift the Free canister cap', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();

    driver.actor.setIdentity(controllerIdentity);
    const setRes = await driver.actor.admin_set_org_billing_plan({
      org_id: org.id,
      tier: { Pro: null },
    });
    extractOkResponse(setRes);

    driver.actor.setIdentity(aliceIdentity);
    const project = extractOkResponse(await driver.actor.list_my_projects({}))
      .projects[0]!;
    for (let i = 0; i < 4; i++) {
      await driver.proposals.createCanister(aliceIdentity, project.id);
    }

    const canistersRes = await driver.actor.list_my_canisters({
      project_id: project.id,
    });
    const canisters = extractOkResponse(canistersRes);
    expect(canisters).toHaveLength(4);
  });

  // Regression: confirms a Free-tier org without an explicit plan record
  // still gets capped at 3. Pairs with the Pro test above.
  it('should leave Free orgs capped without an explicit plan record', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();

    driver.actor.setIdentity(aliceIdentity);
    const project = extractOkResponse(await driver.actor.list_my_projects({}))
      .projects[0]!;
    await driver.proposals.createCanister(aliceIdentity, project.id);
    await driver.proposals.createCanister(aliceIdentity, project.id);
    await driver.proposals.createCanister(aliceIdentity, project.id);

    const res = await driver.actor.create_proposal({
      project_id: project.id,
      operation: [{ CreateCanister: {} }],
    });
    expect(res).toEqual(canisterQuotaExceededError(org.id, 3));
  });
});

describe('get_org_billing_plan', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  it('should return an error for an anonymous caller', async () => {
    const [, , org] = await driver.users.createUser();

    driver.actor.setIdentity(anonymousIdentity);
    const res = await driver.actor.get_org_billing_plan({ org_id: org.id });
    expect(res).toEqual(unauthenticatedError);
  });

  it('should return an error for a caller who is not a member of the org', async () => {
    const [, , aliceOrg] = await driver.users.createUser();

    const bobIdentity = generateRandomIdentity();
    driver.actor.setIdentity(bobIdentity);
    const bobProfileRes = await driver.actor.create_my_user_profile();
    const bobProfile = extractOkResponse(bobProfileRes);

    const res = await driver.actor.get_org_billing_plan({
      org_id: aliceOrg.id,
    });
    expect(res).toEqual(noOrgError(bobProfile.id, aliceOrg.id));
  });

  it('should report Free defaults for an org without a persisted plan', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();
    driver.actor.setIdentity(aliceIdentity);

    const res = await driver.actor.get_org_billing_plan({ org_id: org.id });
    const plan = extractOkResponse(res);
    expect(plan).toEqual({
      tier: { Free: null },
      max_canisters: 3,
      canisters_used: 0,
      max_storage_bytes: [],
    });
  });

  it('should count active canisters across all projects in the org', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();
    driver.actor.setIdentity(aliceIdentity);

    const project = await driver.getDefaultProject();
    await driver.proposals.createCanister(aliceIdentity, project.id);
    await driver.proposals.createCanister(aliceIdentity, project.id);

    const res = await driver.actor.get_org_billing_plan({ org_id: org.id });
    const plan = extractOkResponse(res);
    expect(plan.canisters_used).toBe(2);
    expect(plan.max_canisters).toBe(3);
  });

  it('should reflect a Pro plan after upgrade', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();

    driver.actor.setIdentity(controllerIdentity);
    extractOkResponse(
      await driver.actor.admin_set_org_billing_plan({
        org_id: org.id,
        tier: { Pro: null },
      }),
    );

    driver.actor.setIdentity(aliceIdentity);
    const res = await driver.actor.get_org_billing_plan({ org_id: org.id });
    const plan = extractOkResponse(res);
    expect(plan.tier).toEqual({ Pro: null });
    expect(plan.max_canisters).toBe(50);
    expect(plan.canisters_used).toBe(0);
  });
});

describe('list_my_org_billing_plans', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  it('should return an error for an anonymous caller', async () => {
    driver.actor.setIdentity(anonymousIdentity);
    const res = await driver.actor.list_my_org_billing_plans();
    expect(res).toEqual(unauthenticatedError);
  });

  it('should return one entry per org the caller belongs to', async () => {
    // create_my_user_profile auto-creates a default org for the user,
    // so a brand-new profile already has exactly one membership.
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();

    const res = await driver.actor.list_my_org_billing_plans();
    const plans = extractOkResponse(res);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.tier).toEqual({ Free: null });
    expect(plans[0]!.canisters_used).toBe(0);
  });

  it('should return one entry per org with tier and live canister count', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();
    driver.actor.setIdentity(aliceIdentity);

    const project = await driver.getDefaultProject();
    await driver.proposals.createCanister(aliceIdentity, project.id);
    await driver.proposals.createCanister(aliceIdentity, project.id);

    const res = await driver.actor.list_my_org_billing_plans();
    const plans = extractOkResponse(res);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual({
      org_id: org.id,
      tier: { Free: null },
      max_canisters: 3,
      canisters_used: 2,
      max_storage_bytes: [],
    });
  });

  it('should reflect Pro upgrades per-org', async () => {
    const [aliceIdentity, , org] = await driver.users.createUser();

    driver.actor.setIdentity(controllerIdentity);
    extractOkResponse(
      await driver.actor.admin_set_org_billing_plan({
        org_id: org.id,
        tier: { Pro: null },
      }),
    );

    driver.actor.setIdentity(aliceIdentity);
    const res = await driver.actor.list_my_org_billing_plans();
    const plans = extractOkResponse(res);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.tier).toEqual({ Pro: null });
    expect(plans[0]!.max_canisters).toBe(50);
  });
});
