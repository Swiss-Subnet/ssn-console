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
      const res = await driver.actor.list_org_projects({ org_id: bobOrg.id });
      expect(res).toEqual(noOrgError(alice.profile.id, bobOrg.id));
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

      const res = await driver.actor.list_org_projects({ org_id: bobOrg.id });
      const { projects } = extractOkResponse(res);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Default Project');
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
      expect('Err' in res && res.Err.message).toContain('does not exist');
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      const bob = await setupUser();
      const res = await driver.actor.get_project({ project_id: project.id });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
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
      expect('Err' in res && res.Err.message).toContain('does not exist');
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      const bob = await setupUser();
      const res = await driver.actor.update_project({
        project_id: project.id,
        name: 'hijack',
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
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
      expect('Err' in res && res.Err.message).toContain('does not exist');
    });

    it('should return an error if the caller is not in the org', async () => {
      const alice = await setupUser();
      const { project } = extractOkResponse(
        await driver.actor.create_project({
          org_id: alice.org.id,
          name: projectName,
        }),
      );

      const bob = await setupUser();
      const res = await driver.actor.delete_project({
        project_id: project.id,
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
    });

    it('should return an error when deleting the last project', async () => {
      const { org } = await setupUser();
      const listRes = await driver.actor.list_org_projects({ org_id: org.id });
      const { projects } = extractOkResponse(listRes);
      expect(projects).toHaveLength(1);

      const res = await driver.actor.delete_project({
        project_id: projects[0].id,
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
        team_id: team.id,
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

      const bob = await setupUser();
      const res = await driver.actor.list_project_teams({
        project_id: project.id,
      });
      expect(res).toEqual(noOrgError(bob.profile.id, alice.org.id));
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
      expect(teams).toHaveLength(1);
      expect(teams[0].id).toBe(defaultTeam.id);
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
      expect('Err' in res && res.Err.message).toContain('Project with id');
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
      expect('Err' in res && res.Err.message).toContain('Team with id');
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
        team_id: bobTeam.id,
      });
      expect('Err' in res && res.Err.message).toContain('same organization');
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
        team_id: defaultTeam.id,
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
});
