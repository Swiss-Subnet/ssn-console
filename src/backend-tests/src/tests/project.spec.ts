import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  allProjectPermissions,
  emptyProjectPermissions,
  noOrgError,
  noProfileError,
  noProjectTeamLinkError,
  projectNotFoundOrNoAccessError,
  teamNotFoundOrNoAccessError,
  TestDriver,
  unauthenticatedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
} from '@ssn/test-utils';

describe('Projects', () => {
  let driver: TestDriver;
  const projectName = 'RWA - Production';
  const fakeOrgId = '939ede22-1f0d-4e63-ba18-bed4b09212b5';

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

  describe('list_org_projects', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_org_projects({ org_id: fakeOrgId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the user does not have a profile', async () => {
      const identity = generateRandomIdentity();
      driver.actor.setIdentity(identity);
      const res = await driver.actor.list_org_projects({ org_id: fakeOrgId });
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
      const res = await driver.actor.list_org_projects({ org_id: bobOrg!.id });
      expect(res).toEqual(noOrgError(alice.profile.id, bobOrg!.id));
    });

    it('should list the default project after signup', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.list_org_projects({ org_id: org.id });
      const projects = extractOkResponse(res);
      expect(projects).toEqual({
        projects: [
          {
            id: expect.any(String),
            org_id: org.id,
            name: 'Default Project',
            your_permissions: allProjectPermissions,
          },
        ],
      });
    });

    it('should list created projects in the org', async () => {
      const { org } = await setupUser();

      await driver.actor.create_project({ org_id: org.id, name: projectName });
      await driver.actor.create_project({
        org_id: org.id,
        name: 'Second Project',
      });

      const res = await driver.actor.list_org_projects({ org_id: org.id });
      const { projects } = extractOkResponse(res);
      expect(projects).toHaveLength(3);
      const names = projects.map((p: { name: string }) => p.name).sort();
      expect(names).toEqual(
        ['Default Project', 'Second Project', projectName].sort(),
      );
    });

    it('should not list projects from other orgs', async () => {
      const alice = await setupUser();
      await driver.actor.create_project({
        org_id: alice.org.id,
        name: projectName,
      });

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();
      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      const res = await driver.actor.list_org_projects({ org_id: bobOrg!.id });
      const { projects } = extractOkResponse(res);
      expect(projects).toHaveLength(1);
      expect(projects[0]!.name).toBe('Default Project');
    });
  });

  describe('create_project', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.create_project({
        name: projectName,
        org_id: fakeOrgId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the organization does not exist', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);

      const res = await driver.actor.create_project({
        name: projectName,
        org_id: fakeOrgId,
      });
      expect(res).toEqual(noOrgError(aliceProfile.id, fakeOrgId));
    });

    it('should return an error if the user does not have a profile', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_project({
        name: projectName,
        org_id: fakeOrgId,
      });
      expect(res).toEqual(noProfileError(aliceIdentity.getPrincipal()));
    });

    it('should return an error if the user is not in the organization', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      const aliceProfileRes = await driver.actor.create_my_user_profile();
      const aliceProfile = extractOkResponse(aliceProfileRes);

      const bobIdentity = generateRandomIdentity();
      driver.actor.setIdentity(bobIdentity);
      await driver.actor.create_my_user_profile();

      const bobOrgsRes = await driver.actor.list_my_organizations();
      const [bobOrg] = extractOkResponse(bobOrgsRes);

      driver.actor.setIdentity(aliceIdentity);
      const res = await driver.actor.create_project({
        name: projectName,
        org_id: bobOrg!.id,
      });
      expect(res).toEqual(noOrgError(aliceProfile.id, bobOrg!.id));
    });

    it('should create a project', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);
      await driver.actor.create_my_user_profile();

      const aliceOrgsRes = await driver.actor.list_my_organizations();
      const [aliceOrg] = extractOkResponse(aliceOrgsRes);

      const projectRes = await driver.actor.create_project({
        name: projectName,
        org_id: aliceOrg!.id,
      });
      const project = extractOkResponse(projectRes);

      expect(project).toEqual({
        project: {
          id: expect.any(String),
          org_id: aliceOrg!.id,
          name: projectName,
          your_permissions: allProjectPermissions,
        },
      });
    });

    it('should return an error for an empty name', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_project({
        org_id: org.id,
        name: '   ',
      });
      expect('Err' in res && res.Err.message).toContain('cannot be empty');
    });

    it('should return an error for a name exceeding max length', async () => {
      const { org } = await setupUser();
      const res = await driver.actor.create_project({
        org_id: org.id,
        name: 'a'.repeat(101),
      });
      expect('Err' in res && res.Err.message).toContain('cannot exceed');
    });
  });

  describe('get_project', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.get_project({ project_id: fakeOrgId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent project', async () => {
      await setupUser();
      const res = await driver.actor.get_project({ project_id: fakeOrgId });
      expect(res).toEqual(projectNotFoundOrNoAccessError(fakeOrgId));
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      await setupUser();
      const res = await driver.actor.get_project({ project_id: project.id });
      // Same error as "non-existent project" above: cross-org access must
      // not be distinguishable from a missing id.
      expect(res).toEqual(projectNotFoundOrNoAccessError(project.id));
    });

    it('should get a project', async () => {
      const { org } = await setupUser();
      const { project: created } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );

      const res = await driver.actor.get_project({ project_id: created.id });
      const { project } = extractOkResponse(res);
      expect(project).toEqual({
        id: created.id,
        org_id: org.id,
        name: projectName,
        your_permissions: allProjectPermissions,
      });
    });
  });

  describe('update_project', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.update_project({
        project_id: fakeOrgId,
        name: 'x',
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent project', async () => {
      await setupUser();
      const res = await driver.actor.update_project({
        project_id: fakeOrgId,
        name: 'x',
      });
      expect(res).toEqual(projectNotFoundOrNoAccessError(fakeOrgId));
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      await setupUser();
      const res = await driver.actor.update_project({
        project_id: project.id,
        name: 'hijack',
      });
      expect(res).toEqual(projectNotFoundOrNoAccessError(project.id));
    });

    it('should return an error for an empty name', async () => {
      const { org } = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );
      const res = await driver.actor.update_project({
        project_id: project.id,
        name: '   ',
      });
      expect('Err' in res && res.Err.message).toContain('cannot be empty');
    });

    it('should update the project name', async () => {
      const { org } = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );

      const res = await driver.actor.update_project({
        project_id: project.id,
        name: 'Renamed',
      });
      const { project: updated } = extractOkResponse(res);
      expect(updated).toEqual({
        id: project.id,
        org_id: org.id,
        name: 'Renamed',
        your_permissions: allProjectPermissions,
      });
    });
  });

  describe('delete_project', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.delete_project({ project_id: fakeOrgId });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent project', async () => {
      await setupUser();
      const res = await driver.actor.delete_project({ project_id: fakeOrgId });
      expect(res).toEqual(projectNotFoundOrNoAccessError(fakeOrgId));
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      await setupUser();
      const res = await driver.actor.delete_project({
        project_id: project.id,
      });
      expect(res).toEqual(projectNotFoundOrNoAccessError(project.id));
    });

    it('should return an error when deleting the last project', async () => {
      const { org } = await setupUser();
      const listRes = await driver.actor.list_org_projects({ org_id: org.id });
      const { projects } = extractOkResponse(listRes);
      expect(projects).toHaveLength(1);

      const res = await driver.actor.delete_project({
        project_id: projects[0]!.id,
      });
      expect('Err' in res && res.Err.message).toContain('last project');
    });

    it('should delete a project without canisters', async () => {
      const { org } = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );

      const res = await driver.actor.delete_project({
        project_id: project.id,
      });
      expect(res).toEqual({ Ok: {} });

      const listRes = await driver.actor.list_org_projects({ org_id: org.id });
      const { projects } = extractOkResponse(listRes);
      expect(projects.map(p => p.id)).not.toContain(project.id);
    });

    it('should return an error when the project has canisters', async () => {
      const { identity, org } = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );

      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const [team] = extractOkResponse(teamsRes);
      await driver.actor.add_team_to_project({
        project_id: project.id,
        team_id: team!.id,
      });

      await driver.proposals.createCanister(identity, project.id);

      const res = await driver.actor.delete_project({
        project_id: project.id,
      });
      expect('Err' in res && res.Err.message).toContain('still has canisters');
    });
  });

  describe('list_project_teams', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.list_project_teams({
        project_id: fakeOrgId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      await setupUser();
      const res = await driver.actor.list_project_teams({
        project_id: project.id,
      });
      expect(res).toEqual(projectNotFoundOrNoAccessError(project.id));
    });

    it('should list teams attached to a project', async () => {
      const { org } = await setupUser();
      const defaultProject = await driver.getDefaultProject();

      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const [defaultTeam] = extractOkResponse(teamsRes);

      const res = await driver.actor.list_project_teams({
        project_id: defaultProject.id,
      });
      const teams = extractOkResponse(res);
      expect(teams).toEqual([
        {
          id: defaultTeam!.id,
          name: defaultTeam!.name,
          permissions: allProjectPermissions,
        },
      ]);
    });
  });

  describe('add_team_to_project', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.add_team_to_project({
        project_id: fakeOrgId,
        team_id: fakeOrgId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent project', async () => {
      await setupUser();
      const res = await driver.actor.add_team_to_project({
        project_id: fakeOrgId,
        team_id: fakeOrgId,
      });
      expect(res).toEqual(projectNotFoundOrNoAccessError(fakeOrgId));
    });

    it('should return an error for a non-existent team', async () => {
      const { org } = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );

      const res = await driver.actor.add_team_to_project({
        project_id: project.id,
        team_id: fakeOrgId,
      });
      expect(res).toEqual(teamNotFoundOrNoAccessError(fakeOrgId));
    });

    it('should return an error when the team is in another org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      const bob = await setupUser();
      const bobTeamsRes = await driver.actor.list_org_teams({
        org_id: bob.org.id,
      });
      const [bobTeam] = extractOkResponse(bobTeamsRes);

      driver.actor.setIdentity(alice.identity);
      const res = await driver.actor.add_team_to_project({
        project_id: project.id,
        team_id: bobTeam!.id,
      });
      // Same error as "non-existent team" above: a project admin must not
      // be able to probe team ids across orgs.
      expect(res).toEqual(teamNotFoundOrNoAccessError(bobTeam!.id));
    });

    it('should attach a team to a project', async () => {
      const { org } = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );

      const createTeamRes = await driver.actor.create_team({
        org_id: org.id,
        name: 'Platform',
      });
      const { team } = extractOkResponse(createTeamRes);

      const addRes = await driver.actor.add_team_to_project({
        project_id: project.id,
        team_id: team.id,
      });
      expect(addRes).toEqual({ Ok: {} });

      const listRes = await driver.actor.list_project_teams({
        project_id: project.id,
      });
      const teams = extractOkResponse(listRes);
      expect(teams.map(t => t.id)).toContain(team.id);
    });

    it('should be idempotent when adding an existing team', async () => {
      const { org } = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: org.id,
          name: projectName,
        }),
      );
      const createTeamRes = await driver.actor.create_team({
        org_id: org.id,
        name: 'Platform',
      });
      const { team } = extractOkResponse(createTeamRes);

      await driver.actor.add_team_to_project({
        project_id: project.id,
        team_id: team.id,
      });
      const second = await driver.actor.add_team_to_project({
        project_id: project.id,
        team_id: team.id,
      });
      expect(second).toEqual({ Ok: {} });

      const listRes = await driver.actor.list_project_teams({
        project_id: project.id,
      });
      const teams = extractOkResponse(listRes);
      expect(teams.filter(t => t.id === team.id)).toHaveLength(1);
    });
  });

  describe('remove_team_from_project', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.remove_team_from_project({
        project_id: fakeOrgId,
        team_id: fakeOrgId,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error when removing the last team', async () => {
      const { org } = await setupUser();
      const defaultProject = await driver.getDefaultProject();
      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const [defaultTeam] = extractOkResponse(teamsRes);

      const res = await driver.actor.remove_team_from_project({
        project_id: defaultProject.id,
        team_id: defaultTeam!.id,
      });
      expect('Err' in res && res.Err.message).toContain('last team');
    });

    it('should remove a team from a project', async () => {
      const { org } = await setupUser();
      const defaultProject = await driver.getDefaultProject();
      const createTeamRes = await driver.actor.create_team({
        org_id: org.id,
        name: 'Platform',
      });
      const { team } = extractOkResponse(createTeamRes);

      await driver.actor.add_team_to_project({
        project_id: defaultProject.id,
        team_id: team.id,
      });

      const removeRes = await driver.actor.remove_team_from_project({
        project_id: defaultProject.id,
        team_id: team.id,
      });
      expect(removeRes).toEqual({ Ok: {} });

      const listRes = await driver.actor.list_project_teams({
        project_id: defaultProject.id,
      });
      const teams = extractOkResponse(listRes);
      expect(teams.map(t => t.id)).not.toContain(team.id);
    });

    it('should be a no-op when the team is not in the project', async () => {
      const { org } = await setupUser();
      const defaultProject = await driver.getDefaultProject();
      const createTeamRes = await driver.actor.create_team({
        org_id: org.id,
        name: 'Platform',
      });
      const { team } = extractOkResponse(createTeamRes);

      const res = await driver.actor.remove_team_from_project({
        project_id: defaultProject.id,
        team_id: team.id,
      });
      expect(res).toEqual({ Ok: {} });
    });
  });

  // An org member whose teams have no link to a given project must be denied
  // on every project-scoped endpoint, even though they can see the org. This
  // exercises the `has_link = false` branch of ProjectAuth inside the same
  // org, which is distinct from the cross-org deny path covered elsewhere.
  // All deny assertions share one PocketIC instance.
  describe('permission enforcement for in-org member with unlinked team', () => {
    it('should deny project-scoped ops when the caller has no team link', async () => {
      const alice = await setupUser();
      const defaultProject = await driver.getDefaultProject();

      // Alice creates a second team, Team B. New teams have no project links
      // until explicitly attached via add_team_to_project.
      const createTeamRes = await driver.actor.create_team({
        org_id: alice.org.id,
        name: 'Team B',
      });
      const { team: teamB } = extractOkResponse(createTeamRes);

      // Bob signs up (lands in his own default org), then Alice invites him
      // into her org. Bob accepts, then Alice places him on Team B ONLY,
      // never on the default team that owns defaultProject.
      const bob = await setupUser();
      driver.actor.setIdentity(alice.identity);
      const inviteRes = await driver.actor.create_org_invite({
        org_id: alice.org.id,
        target: { UserId: bob.profile.id },
      });
      const { invite } = extractOkResponse(inviteRes);
      driver.actor.setIdentity(bob.identity);
      await driver.actor.accept_org_invite({ invite_id: invite.id });
      driver.actor.setIdentity(alice.identity);
      await driver.actor.add_user_to_team({
        team_id: teamB.id,
        user_id: bob.profile.id,
      });

      // Bob acts. He is in alice.org, so org-scoped reads succeed.
      driver.actor.setIdentity(bob.identity);

      // Bob still has his own signup-created default project (in his own
      // org) — list_my_projects is team-scoped, not org-scoped — but
      // Alice's defaultProject must not appear since his only team in her
      // org (Team B) has no link to it.
      const myProjects = await driver.actor.list_my_projects({});
      expect(
        extractOkResponse(myProjects).projects.map(p => p.id),
      ).not.toContain(defaultProject.id);

      const orgProjects = await driver.actor.list_org_projects({
        org_id: alice.org.id,
      });
      const { projects } = extractOkResponse(orgProjects);
      expect(projects.map(p => p.id)).toContain(defaultProject.id);

      // Project-scoped endpoints must all deny — Bob's only team (Team B) is
      // not linked to defaultProject, so ProjectAuth::require fails at the
      // has_link check with the "does not have access" unauthorized error.
      const getRes = await driver.actor.get_project({
        project_id: defaultProject.id,
      });
      expect(getRes).toEqual(
        noProjectTeamLinkError(bob.profile.id, defaultProject.id),
      );

      const updateRes = await driver.actor.update_project({
        project_id: defaultProject.id,
        name: 'Hijacked',
      });
      expect(updateRes).toEqual(
        noProjectTeamLinkError(bob.profile.id, defaultProject.id),
      );

      const deleteRes = await driver.actor.delete_project({
        project_id: defaultProject.id,
      });
      expect(deleteRes).toEqual(
        noProjectTeamLinkError(bob.profile.id, defaultProject.id),
      );

      const listTeamsRes = await driver.actor.list_project_teams({
        project_id: defaultProject.id,
      });
      expect(listTeamsRes).toEqual(
        noProjectTeamLinkError(bob.profile.id, defaultProject.id),
      );

      const addTeamRes = await driver.actor.add_team_to_project({
        project_id: defaultProject.id,
        team_id: teamB.id,
      });
      expect(addTeamRes).toEqual(
        noProjectTeamLinkError(bob.profile.id, defaultProject.id),
      );

      const removeTeamRes = await driver.actor.remove_team_from_project({
        project_id: defaultProject.id,
        team_id: teamB.id,
      });
      expect(removeTeamRes).toEqual(
        noProjectTeamLinkError(bob.profile.id, defaultProject.id),
      );
    });
  });

  describe('update_team_project_permissions', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);
      const res = await driver.actor.update_team_project_permissions({
        project_id: fakeOrgId,
        team_id: fakeOrgId,
        permissions: emptyProjectPermissions,
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-existent project', async () => {
      await setupUser();
      const res = await driver.actor.update_team_project_permissions({
        project_id: fakeOrgId,
        team_id: fakeOrgId,
        permissions: allProjectPermissions,
      });
      expect(res).toEqual(projectNotFoundOrNoAccessError(fakeOrgId));
    });

    it('should return an error when the team is not linked to the project', async () => {
      const { org } = await setupUser();
      const defaultProject = await driver.getDefaultProject();

      // Second team is in the org but not linked to defaultProject.
      const secondRes = await driver.actor.create_team({
        org_id: org.id,
        name: 'Second',
      });
      const { team: secondTeam } = extractOkResponse(secondRes);

      const res = await driver.actor.update_team_project_permissions({
        project_id: defaultProject.id,
        team_id: secondTeam.id,
        permissions: allProjectPermissions,
      });
      expect(res).toEqual(teamNotFoundOrNoAccessError(secondTeam.id));
    });

    it('should update and return the new permissions', async () => {
      const { org } = await setupUser();
      const defaultProject = await driver.getDefaultProject();
      const teamsRes = await driver.actor.list_org_teams({ org_id: org.id });
      const [defaultTeam] = extractOkResponse(teamsRes);

      const newPerms = {
        ...emptyProjectPermissions,
        canister_read: true,
        canister_operate: true,
      };
      const res = await driver.actor.update_team_project_permissions({
        project_id: defaultProject.id,
        team_id: defaultTeam!.id,
        permissions: newPerms,
      });
      expect(extractOkResponse(res)).toEqual({
        team: {
          id: defaultTeam!.id,
          name: defaultTeam!.name,
          permissions: newPerms,
        },
      });

      const listRes = await driver.actor.list_project_teams({
        project_id: defaultProject.id,
      });
      const teams = extractOkResponse(listRes);
      expect(teams.find(t => t.id === defaultTeam!.id)?.permissions).toEqual(
        newPerms,
      );
    });
  });
});
