import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  allOrgPermissions,
  allProjectPermissions,
  lacksStaffPermissionError,
  noProfileError,
  TestDriver,
  unauthenticatedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
} from '@ssn/test-utils';

describe('User Profile', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  // Creates an active user and grants the given staff permissions. Returns
  // the user's identity (caller is reset to anonymous). Used to assert
  // staff-gated admin endpoints honor the relevant permission bit.
  async function createActiveStaffUser(
    permissions: Partial<{
      read_all_orgs: boolean;
      write_billing: boolean;
      manage_users: boolean;
      read_metrics: boolean;
    }> = {},
  ) {
    const identity = generateRandomIdentity();
    driver.actor.setIdentity(identity);
    const profile = extractOkResponse(
      await driver.actor.create_my_user_profile(),
    );

    driver.actor.setIdentity(controllerIdentity);
    await driver.actor.admin_update_user_profile({
      user_id: profile.id,
      status: [{ Active: null }],
    });
    await driver.actor.admin_grant_staff_permissions({
      user_id: profile.id,
      permissions: {
        read_all_orgs: false,
        write_billing: false,
        manage_users: false,
        read_metrics: false,
        ...permissions,
      },
    });

    driver.actor.setIdentity(anonymousIdentity);
    return { identity, profile };
  }

  describe('admin_list_user_profiles', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.admin_list_user_profiles();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an empty array when there are no users', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const profilesRes = await driver.actor.admin_list_user_profiles();
      const profiles = extractOkResponse(profilesRes);
      expect(profiles).toEqual([]);
    });

    it('should return all user profiles', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });
      const aliceProfileRes = await driver.actor.get_my_user_profile();
      const [aliceProfile] = extractOkResponse(aliceProfileRes);

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: ['bob@subnet.ch'] });
      const bobProfileRes = await driver.actor.get_my_user_profile();
      const [bobProfile] = extractOkResponse(bobProfileRes);

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: ['admin@subnet.ch'] });
      const controllerProfileRes = await driver.actor.get_my_user_profile();
      const [controllerProfile] = extractOkResponse(controllerProfileRes);

      const profilesRes = await driver.actor.admin_list_user_profiles();
      const profiles = extractOkResponse(profilesRes);

      expect(profiles.length).toBe(3);
      expect(profiles).toContainEqual(aliceProfile);
      expect(profiles).toContainEqual(bobProfile);
      expect(profiles).toContainEqual(controllerProfile);
    });
  });

  describe('admin_update_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);

      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.admin_update_user_profile({
        user_id: aliceProfile.id,
        status: [{ Active: null }],
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user does not exist', async () => {
      const userId = '2d3ee223-c6d2-49d8-928f-d42597bfed65';
      driver.actor.setIdentity(controllerIdentity);

      const res = await driver.actor.admin_update_user_profile({
        user_id: userId,
        status: [{ Active: null }],
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `User profile for user with id ${userId} does not exist.`,
        },
      });
    });

    it('should update the user status and user stats', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);
      expect(aliceProfile.status).toEqual({ Inactive: null });

      driver.actor.setIdentity(controllerIdentity);
      let userStatsRes = await driver.actor.admin_get_user_stats();
      let userStats = extractOkResponse(userStatsRes);
      expect(userStats.total).toBe(1n);
      expect(userStats.active).toBe(0n);

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.admin_update_user_profile({
        user_id: aliceProfile.id,
        status: [{ Active: null }],
      });

      driver.actor.setIdentity(controllerIdentity);
      userStatsRes = await driver.actor.admin_get_user_stats();
      userStats = extractOkResponse(userStatsRes);
      expect(userStats.total).toBe(1n);
      expect(userStats.active).toBe(1n);

      driver.actor.setIdentity(aliceIdentity);
      const updatedAliceProfileRes = await driver.actor.get_my_user_profile();
      const [updatedAliceProfile] = extractOkResponse(updatedAliceProfileRes);
      expect(updatedAliceProfile!.status).toEqual({ Active: null });

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.admin_update_user_profile({
        user_id: aliceProfile.id,
        status: [{ Inactive: null }],
      });

      driver.actor.setIdentity(controllerIdentity);
      userStatsRes = await driver.actor.admin_get_user_stats();
      userStats = extractOkResponse(userStatsRes);
      expect(userStats.total).toBe(1n);
      expect(userStats.active).toBe(0n);

      driver.actor.setIdentity(aliceIdentity);
      const finalUpdatedAliceProfileRes =
        await driver.actor.get_my_user_profile();
      const [finalUpdatedAliceProfile] = extractOkResponse(
        finalUpdatedAliceProfileRes,
      );
      expect(finalUpdatedAliceProfile!.status).toEqual({ Inactive: null });
    });
  });

  // The user-management admin endpoints are gated on MANAGE_USERS (controllers
  // are auto-allowed). Grouped into two PocketIC instances -- one denied path,
  // one allowed path -- to keep boot overhead down.
  describe('manage_users staff gate', () => {
    it('denies a staff user lacking manage_users on every user endpoint', async () => {
      const { profile: target } = await createActiveStaffUser({
        manage_users: true,
      });
      const { identity } = await createActiveStaffUser({ read_metrics: true });
      driver.actor.setIdentity(identity);

      const expected = lacksStaffPermissionError('MANAGE_USERS');
      expect(await driver.actor.admin_list_user_profiles()).toEqual(expected);
      expect(await driver.actor.admin_get_user_stats()).toEqual(expected);
      expect(await driver.actor.admin_list_stale_users()).toEqual(expected);
      expect(
        await driver.actor.admin_update_user_profile({
          user_id: target.id,
          status: [{ Inactive: null }],
        }),
      ).toEqual(expected);
    });

    it('allows a staff user holding manage_users on every user endpoint', async () => {
      const { identity, profile } = await createActiveStaffUser({
        manage_users: true,
      });
      driver.actor.setIdentity(identity);

      expect(
        extractOkResponse(await driver.actor.admin_list_user_profiles()),
      ).toHaveLength(1);
      extractOkResponse(await driver.actor.admin_get_user_stats());
      extractOkResponse(await driver.actor.admin_list_stale_users());
      extractOkResponse(
        await driver.actor.admin_update_user_profile({
          user_id: profile.id,
          status: [{ Inactive: null }],
        }),
      );
    });
  });

  describe('get_my_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.get_my_user_profile();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should not return a user profile if none exists', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const aliceProfileRes = await driver.actor.get_my_user_profile();
      const [aliceProfile] = extractOkResponse(aliceProfileRes);
      expect(aliceProfile).toBeUndefined();
    });

    it('should return a user profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      const aliceEmail = 'alice@subnet.ch';

      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: [aliceEmail] });

      const aliceProfileRes = await driver.actor.get_my_user_profile();
      const [aliceProfile] = extractOkResponse(aliceProfileRes);
      expect(aliceProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [aliceEmail],
        is_admin: false,
        email_verified: false,
      });
    });

    it('should return an admin user profile', async () => {
      const adminEmail = 'admin@subnet.ch';

      driver.actor.setIdentity(controllerIdentity);
      await driver.actor.create_my_user_profile();
      await driver.actor.update_my_user_profile({ email: [adminEmail] });

      const adminProfileRes = await driver.actor.get_my_user_profile();
      const [adminProfile] = extractOkResponse(adminProfileRes);
      expect(adminProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [adminEmail],
        is_admin: true,
        email_verified: false,
      });
    });
  });

  describe('create_my_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.create_my_user_profile();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should create a user profile', async () => {
      const aliceIdentity = generateRandomIdentity();

      driver.actor.setIdentity(aliceIdentity);
      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);

      expect(aliceProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [],
        is_admin: false,
        email_verified: false,
      });

      const fetchedProfileRes = await driver.actor.get_my_user_profile();
      const [fetchedProfile] = extractOkResponse(fetchedProfileRes);
      expect(fetchedProfile).toEqual(aliceProfile);

      const organizationsRes = await driver.actor.list_my_organizations();
      const organizations = extractOkResponse(organizationsRes);
      expect(organizations).toHaveLength(1);
      expect(organizations[0]).toEqual({
        id: expect.any(String),
        name: 'Default Organization',
        your_permissions: allOrgPermissions,
      });

      const projectsRes = await driver.actor.list_my_projects({});
      const projectsOkRes = extractOkResponse(projectsRes);
      expect(projectsOkRes.projects).toHaveLength(1);
      expect(projectsOkRes.projects[0]).toEqual({
        id: expect.any(String),
        org_id: organizations[0]!.id,
        name: 'Default Project',
        your_permissions: allProjectPermissions,
      });

      const teamsRes = await driver.actor.list_my_teams();
      const teams = extractOkResponse(teamsRes);
      expect(teams).toHaveLength(1);
      expect(teams[0]).toEqual({
        id: expect.any(String),
        name: 'Default Team',
      });

      const approvalPoliciesRes =
        await driver.actor.list_project_approval_policies({
          project_id: projectsOkRes.projects[0]!.id,
        });
      const approvalPolicies = extractOkResponse(approvalPoliciesRes);
      expect(approvalPolicies.approval_policies).toHaveLength(2);
      expect(approvalPolicies.approval_policies).toContainEqual({
        id: expect.any(String),
        operation_type: { CreateCanister: {} },
        policy_type: { AutoApprove: {} },
      });
      expect(approvalPolicies.approval_policies).toContainEqual({
        id: expect.any(String),
        operation_type: { AddCanisterController: {} },
        policy_type: { AutoApprove: {} },
      });
    });

    it('should create an admin user profile', async () => {
      driver.actor.setIdentity(controllerIdentity);
      const adminProfileRes = await driver.actor.create_my_user_profile();
      const adminProfile = extractOkResponse(adminProfileRes);

      expect(adminProfile).toEqual({
        id: expect.any(String),
        status: { Inactive: null },
        email: [],
        is_admin: true,
        email_verified: false,
      });

      const fetchedProfileRes = await driver.actor.get_my_user_profile();
      const [fetchedProfile] = extractOkResponse(fetchedProfileRes);
      expect(fetchedProfile).toEqual(adminProfile);

      const organizationsRes = await driver.actor.list_my_organizations();
      const organizations = extractOkResponse(organizationsRes);
      expect(organizations).toHaveLength(1);
      expect(organizations[0]).toEqual({
        id: expect.any(String),
        name: 'Default Organization',
        your_permissions: allOrgPermissions,
      });

      const projectsRes = await driver.actor.list_my_projects({});
      const projectsOkRes = extractOkResponse(projectsRes);
      expect(projectsOkRes.projects).toHaveLength(1);
      expect(projectsOkRes.projects[0]).toEqual({
        id: expect.any(String),
        org_id: organizations[0]!.id,
        name: 'Default Project',
        your_permissions: allProjectPermissions,
      });

      const teamsRes = await driver.actor.list_my_teams();
      const teams = extractOkResponse(teamsRes);
      expect(teams).toHaveLength(1);
      expect(teams[0]).toEqual({
        id: expect.any(String),
        name: 'Default Team',
      });

      const approvalPoliciesRes =
        await driver.actor.list_project_approval_policies({
          project_id: projectsOkRes.projects[0]!.id,
        });
      const approvalPolicies = extractOkResponse(approvalPoliciesRes);
      expect(approvalPolicies.approval_policies).toHaveLength(2);
      expect(approvalPolicies.approval_policies).toContainEqual({
        id: expect.any(String),
        operation_type: { CreateCanister: {} },
        policy_type: { AutoApprove: {} },
      });
      expect(approvalPolicies.approval_policies).toContainEqual({
        id: expect.any(String),
        operation_type: { AddCanisterController: {} },
        policy_type: { AutoApprove: {} },
      });
    });

    it('should return an error if the user profile already exists', async () => {
      const aliceIdentity = generateRandomIdentity();

      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const res = await driver.actor.create_my_user_profile();
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `User profile for principal ${aliceIdentity.getPrincipal()} already exists.`,
        },
      });
    });
  });

  describe('update_my_user_profile', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.update_my_user_profile({
        email: ['alice@subnet.ch'],
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user profile does not exist', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.update_my_user_profile({
        email: ['alice@subnet.ch'],
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should update the user email', async () => {
      const aliceIdentity = generateRandomIdentity();
      const aliceInitialEmail = 'chalice@subnet.ch';
      const aliceFinalEmail = 'alice@subnet.ch';

      driver.actor.setIdentity(aliceIdentity);
      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);

      await driver.actor.update_my_user_profile({
        email: [aliceInitialEmail],
      });
      const updatedProfileRes = await driver.actor.get_my_user_profile();
      const [updatedProfile] = extractOkResponse(updatedProfileRes);

      await driver.actor.update_my_user_profile({
        email: [aliceFinalEmail],
      });
      const finalUpdatedProfileRes = await driver.actor.get_my_user_profile();
      const [finalUpdatedProfile] = extractOkResponse(finalUpdatedProfileRes);

      expect(aliceProfile.email).toEqual([]);
      expect(updatedProfile!.email).toEqual([aliceInitialEmail]);
      expect(finalUpdatedProfile!.email).toEqual([aliceFinalEmail]);
    });
  });
});
