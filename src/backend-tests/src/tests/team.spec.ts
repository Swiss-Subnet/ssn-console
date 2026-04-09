import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  anonymousIdentity,
  extractOkResponse,
  noOrgError,
  noProfileError,
  TestDriver,
  unauthenticatedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

describe('Teams', () => {
  let driver: TestDriver;
  const teamName = 'Engineering';
  const fakeOrgId = '939ede22-1f0d-4e63-ba18-bed4b09212b5';
  const fakeTeamId = '839ede22-1f0d-4e63-ba18-bed4b09212b5';

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  async function setupUser() {
    const identity = generateRandomIdentity();
    driver.actor.setIdentity(identity);
    const profileRes = await driver.actor.create_my_user_profile();
    const profile = extractOkResponse(profileRes);
    const orgsRes = await driver.actor.list_my_organizations();
    const [org] = extractOkResponse(orgsRes);
    return { identity, profile, org };
  }

  describe('list_my_teams', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_my_teams();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return the default team after signup', async () => {
      await setupUser();
      const res = await driver.actor.list_my_teams();
      const teams = extractOkResponse(res);
      expect(teams).toHaveLength(1);
      expect(teams[0]).toEqual({
        id: expect.any(String),
        name: 'Default Team',
      });
    });
  });

  describe('list_org_teams', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_org_teams({ org_id: fakeOrgId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      driver.actor.setIdentity(alice.identity);
      const res = await driver.actor.list_org_teams({ org_id: bobOrg.id });
      expect(res).toEqual(noOrgError(alice.profile.id, bobOrg.id));
    });

    it('should list teams in the org', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.list_org_teams({ org_id: org.id });
      const teams = extractOkResponse(res);
      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe('Default Team');
    });
  });

  describe('create_team', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.create_team({
        org_id: fakeOrgId,
        name: teamName,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user does not have a profile', async () => {
      const identity = generateRandomIdentity();
      driver.actor.setIdentity(identity);
      const res = await driver.actor.create_team({
        org_id: fakeOrgId,
        name: teamName,
      });
      expect(res).toEqual(noProfileError(identity.getPrincipal()));
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      driver.actor.setIdentity(alice.identity);
      const res = await driver.actor.create_team({
        org_id: bobOrg.id,
        name: teamName,
      });
      expect(res).toEqual(noOrgError(alice.profile.id, bobOrg.id));
    });

    it('should return an error for an empty name', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_team({
        org_id: org.id,
        name: '   ',
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Team name cannot be empty.',
        },
      });
    });

    it('should return an error for a name exceeding max length', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_team({
        org_id: org.id,
        name: 'a'.repeat(101),
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Team name cannot exceed 100 characters.',
        },
      });
    });

    it('should trim whitespace from the name', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_team({
        org_id: org.id,
        name: '  Engineering  ',
      });
      const { team } = extractOkResponse(res);
      expect(team.name).toBe('Engineering');
    });

    it('should return an error when exceeding max teams per org', async () => {
      const { org } = await setupUser();
      for (let i = 0; i < 49; i++) {
        const r = await driver.actor.create_team({
          org_id: org.id,
          name: `Team ${i}`,
        });
        extractOkResponse(r);
      }
      // 49 created + 1 default = 50, so the next one should fail
      const res = await driver.actor.create_team({
        org_id: org.id,
        name: 'One Too Many',
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Cannot create more than 50 teams per organization.',
        },
      });
    });

    it('should create a team', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_team({
        org_id: org.id,
        name: teamName,
      });
      const created = extractOkResponse(res);
      expect(created).toEqual({
        team: {
          id: expect.any(String),
          name: teamName,
        },
      });
    });

    it('should add the creator as a member', async () => {
      const { org } = await setupUser();
      await driver.actor.create_team({ org_id: org.id, name: teamName });

      const teamsRes = await driver.actor.list_my_teams();
      const teams = extractOkResponse(teamsRes);
      expect(teams).toHaveLength(2);
      expect(teams.map((t) => t.name)).toContain(teamName);
    });
  });

  describe('get_team', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.get_team({ team_id: fakeTeamId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent team', async () => {
      await setupUser();
      const res = await driver.actor.get_team({ team_id: fakeTeamId });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Team with id ${fakeTeamId} does not exist.`,
        },
      });
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();
      const aliceTeamsRes = await driver.actor.list_org_teams({
        org_id: alice.org.id,
      });
      const [aliceDefaultTeam] = extractOkResponse(aliceTeamsRes);

      const bob = await setupUser();
      const getRes = await driver.actor.get_team({
        team_id: aliceDefaultTeam.id,
      });
      expect(getRes).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should get a team', async () => {
      const { org } = await setupUser();
      const createRes = await driver.actor.create_team({
        org_id: org.id,
        name: teamName,
      });
      const { team } = extractOkResponse(createRes);

      const getRes = await driver.actor.get_team({ team_id: team.id });
      expect(extractOkResponse(getRes)).toEqual({ team });
    });
  });

  describe('update_team', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.update_team({
        team_id: fakeTeamId,
        name: 'New Name',
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent team', async () => {
      await setupUser();
      const res = await driver.actor.update_team({
        team_id: fakeTeamId,
        name: 'New Name',
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Team with id ${fakeTeamId} does not exist.`,
        },
      });
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();
      const aliceTeamsRes = await driver.actor.list_org_teams({
        org_id: alice.org.id,
      });
      const [aliceDefaultTeam] = extractOkResponse(aliceTeamsRes);

      const bob = await setupUser();
      const res = await driver.actor.update_team({
        team_id: aliceDefaultTeam.id,
        name: 'Hijacked',
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should return an error for an empty name', async () => {
      const { org } = await setupUser();
      const createRes = await driver.actor.create_team({
        org_id: org.id,
        name: teamName,
      });
      const { team } = extractOkResponse(createRes);

      const res = await driver.actor.update_team({
        team_id: team.id,
        name: '   ',
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Team name cannot be empty.',
        },
      });
    });

    it('should return an error for a name exceeding max length', async () => {
      const { org } = await setupUser();
      const createRes = await driver.actor.create_team({
        org_id: org.id,
        name: teamName,
      });
      const { team } = extractOkResponse(createRes);

      const res = await driver.actor.update_team({
        team_id: team.id,
        name: 'a'.repeat(101),
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Team name cannot exceed 100 characters.',
        },
      });
    });

    it('should update the team name', async () => {
      const { org } = await setupUser();
      const createRes = await driver.actor.create_team({
        org_id: org.id,
        name: teamName,
      });
      const { team } = extractOkResponse(createRes);

      const updatedName = 'Platform';
      const updateRes = await driver.actor.update_team({
        team_id: team.id,
        name: updatedName,
      });
      expect(extractOkResponse(updateRes)).toEqual({
        team: { id: team.id, name: updatedName },
      });
    });
  });

  describe('delete_team', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.delete_team({ team_id: fakeTeamId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent team', async () => {
      await setupUser();
      const res = await driver.actor.delete_team({ team_id: fakeTeamId });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Team with id ${fakeTeamId} does not exist.`,
        },
      });
    });

    it('should return an error if the user is not in the org', async () => {
      const alice = await setupUser();
      const createRes = await driver.actor.create_team({
        org_id: alice.org.id,
        name: 'Deletable',
      });
      const { team } = extractOkResponse(createRes);

      const bob = await setupUser();
      const res = await driver.actor.delete_team({ team_id: team.id });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should return an error when deleting the last team', async () => {
      const { org } = await setupUser();
      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const [defaultTeam] = extractOkResponse(teamsRes);

      const res = await driver.actor.delete_team({ team_id: defaultTeam.id });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: 'Cannot delete the last team in an organization.',
        },
      });
    });

    it('should return an error when the team has projects', async () => {
      const { org } = await setupUser();
      // The default team has the default project, so it can't be deleted
      // even after creating a second team.
      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const [defaultTeam] = extractOkResponse(teamsRes);

      // Create a second team so the "last team" guard doesn't fire first.
      await driver.actor.create_team({ org_id: org.id, name: 'Second Team' });

      const res = await driver.actor.delete_team({ team_id: defaultTeam.id });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message:
            'Cannot delete a team that still has projects. Remove all projects first.',
        },
      });
    });

    it('should delete a team without projects', async () => {
      const { org } = await setupUser();
      const createRes = await driver.actor.create_team({
        org_id: org.id,
        name: teamName,
      });
      const { team } = extractOkResponse(createRes);

      const deleteRes = await driver.actor.delete_team({ team_id: team.id });
      expect(deleteRes).toEqual({ Ok: null });

      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const teams = extractOkResponse(teamsRes);
      expect(teams.map((t) => t.id)).not.toContain(team.id);
    });
  });

  describe('add_user_to_team', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.add_user_to_team({
        team_id: fakeTeamId,
        user_id: 'some-user-id',
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent team', async () => {
      const { profile } = await setupUser();
      const res = await driver.actor.add_user_to_team({
        team_id: fakeTeamId,
        user_id: profile.id,
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Team with id ${fakeTeamId} does not exist.`,
        },
      });
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const aliceTeamsRes = await driver.actor.list_org_teams({
        org_id: alice.org.id,
      });
      const [aliceDefaultTeam] = extractOkResponse(aliceTeamsRes);

      const bob = await setupUser();
      const res = await driver.actor.add_user_to_team({
        team_id: aliceDefaultTeam.id,
        user_id: bob.profile.id,
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should return an error if the target user is not in the org', async () => {
      const alice = await setupUser();
      const aliceTeamsRes = await driver.actor.list_org_teams({
        org_id: alice.org.id,
      });
      const [aliceDefaultTeam] = extractOkResponse(aliceTeamsRes);

      const bob = await setupUser();
      // Switch back to Alice (who is in the org) to make the call
      driver.actor.setIdentity(alice.identity);
      const res = await driver.actor.add_user_to_team({
        team_id: aliceDefaultTeam.id,
        user_id: bob.profile.id,
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    // Blocked: no "add user to org" API exists yet, so we cannot
    // get Bob into Alice's org to test the happy path.
    it.skip('should add a user to the team', async () => {
      const alice = await setupUser();
      const createRes = await driver.actor.create_team({
        org_id: alice.org.id,
        name: 'Shared Team',
      });
      const { team } = extractOkResponse(createRes);

      const bob = await setupUser();
      // TODO: add Bob to Alice's org here once the API exists.
      driver.actor.setIdentity(alice.identity);
      const addRes = await driver.actor.add_user_to_team({
        team_id: team.id,
        user_id: bob.profile.id,
      });
      expect(addRes).toEqual({ Ok: null });

      // Bob should now see the team in list_my_teams.
      driver.actor.setIdentity(bob.identity);
      const teamsRes = await driver.actor.list_my_teams();
      const teams = extractOkResponse(teamsRes);
      expect(teams.map((t) => t.id)).toContain(team.id);
    });

    it('should be idempotent when adding an existing member', async () => {
      const { org, profile } = await setupUser();
      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const [defaultTeam] = extractOkResponse(teamsRes);

      // User is already a member of the default team
      const res = await driver.actor.add_user_to_team({
        team_id: defaultTeam.id,
        user_id: profile.id,
      });
      expect(res).toEqual({ Ok: null });
    });
  });
});
