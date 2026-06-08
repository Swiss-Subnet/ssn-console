use super::{
    memory::{
        init_organization_project_index, init_project_team_index,
        init_project_team_permissions_index, init_projects, init_team_project_permissions_index,
        OrganizationProjectIndexMemory, ProjectMemory, ProjectTeamIndexMemory,
        ProjectTeamPermissionsIndexMemory, TeamProjectPermissionsIndexMemory,
    },
    OrgId, Project, ProjectId, ProjectPermissions, TeamId,
};
use canister_utils::{ApiError, ApiResult};
use std::{cell::RefCell, collections::HashSet};

pub fn add_default_project(team_id: TeamId, org_id: OrgId) -> ProjectId {
    let project = Project {
        org_id,
        name: "Default Project".to_string(),
    };

    let project_id = create_project(org_id, project);
    add_team_to_project(team_id, project_id);

    project_id
}

pub fn create_project(org_id: OrgId, project: Project) -> ProjectId {
    let project_id = ProjectId::new();

    mutate_state(|s| {
        s.projects.insert(project_id, project);
        s.organization_project_index.insert((org_id, project_id));
    });

    project_id
}

pub fn add_team_to_project(team_id: TeamId, project_id: ProjectId) {
    add_team_to_project_with_permissions(team_id, project_id, ProjectPermissions::ALL)
}

pub fn add_team_to_project_with_permissions(
    team_id: TeamId,
    project_id: ProjectId,
    permissions: ProjectPermissions,
) {
    mutate_state(|s| {
        s.project_team_permissions_index
            .insert((project_id, team_id), permissions);
        s.team_project_permissions_index
            .insert((team_id, project_id), permissions);
    });
}

pub fn remove_team_from_project(team_id: TeamId, project_id: ProjectId) {
    mutate_state(|s| {
        s.project_team_permissions_index
            .remove(&(project_id, team_id));
        s.team_project_permissions_index
            .remove(&(team_id, project_id));
    });
}

pub fn is_team_in_project(team_id: TeamId, project_id: ProjectId) -> bool {
    with_state(|s| {
        s.project_team_permissions_index
            .get(&(project_id, team_id))
            .is_some()
    })
}

pub fn get_project_team_permissions(
    project_id: ProjectId,
    team_id: TeamId,
) -> Option<ProjectPermissions> {
    with_state(|s| s.project_team_permissions_index.get(&(project_id, team_id)))
}

// Overwrite the project permissions granted to `team_id` on `project_id`.
// No-op if the link is absent. Unlike the org equivalent, projects currently
// have no "must retain an admin" invariant — `remove_team_from_project`
// already guards against leaving a project team-less, but there is no
// PROJECT_ADMIN counterpart to ORG_ADMIN.
pub fn set_project_team_permissions(
    project_id: ProjectId,
    team_id: TeamId,
    permissions: ProjectPermissions,
) {
    mutate_state(|s| {
        if s.project_team_permissions_index
            .get(&(project_id, team_id))
            .is_none()
        {
            return;
        }
        s.project_team_permissions_index
            .insert((project_id, team_id), permissions);
        s.team_project_permissions_index
            .insert((team_id, project_id), permissions);
    });
}

// Union ProjectPermissions of every team in `team_ids` that is linked to
// `project_id`. Also returns whether any of those teams were linked.
pub fn aggregate_team_project_permissions(
    team_ids: &[TeamId],
    project_id: ProjectId,
) -> (ProjectPermissions, bool) {
    with_state(|s| {
        let mut perms = ProjectPermissions::EMPTY;
        let mut has_link = false;
        for team_id in team_ids {
            if let Some(p) = s
                .project_team_permissions_index
                .get(&(project_id, *team_id))
            {
                perms = perms.union(p);
                has_link = true;
            }
        }
        (perms, has_link)
    })
}

pub fn list_project_team_ids(project_id: ProjectId) -> Vec<TeamId> {
    with_state(|s| {
        s.project_team_permissions_index
            .range((project_id, TeamId::MIN)..=(project_id, TeamId::MAX))
            .map(|entry| entry.key().1)
            .collect()
    })
}

pub fn project_team_count(project_id: ProjectId) -> usize {
    with_state(|s| {
        s.project_team_permissions_index
            .range((project_id, TeamId::MIN)..=(project_id, TeamId::MAX))
            .count()
    })
}

pub fn update_project(project_id: ProjectId, project: Project) -> ApiResult {
    mutate_state(|s| {
        if !s.projects.contains_key(&project_id) {
            return Err(ApiError::client_error(format!(
                "Project with id {project_id} does not exist."
            )));
        }
        s.projects.insert(project_id, project);
        Ok(())
    })
}

pub fn delete_project(project_id: ProjectId, org_id: OrgId) -> ApiResult {
    mutate_state(|s| {
        if s.projects.remove(&project_id).is_none() {
            return Err(ApiError::client_error(format!(
                "Project with id {project_id} does not exist."
            )));
        }

        s.organization_project_index.remove(&(org_id, project_id));

        let project_permissions = s
            .project_team_permissions_index
            .range((project_id, TeamId::MIN)..=(project_id, TeamId::MAX))
            .map(|entry| *entry.key())
            .collect::<Vec<_>>();

        for (pid, team_id) in project_permissions {
            s.project_team_permissions_index.remove(&(pid, team_id));
            s.team_project_permissions_index.remove(&(team_id, pid));
        }

        Ok(())
    })
}

pub fn has_at_least_n_org_projects(org_id: OrgId, n: usize) -> bool {
    with_state(|s| {
        s.organization_project_index
            .range((org_id, ProjectId::MIN)..=(org_id, ProjectId::MAX))
            .take(n)
            .count()
            >= n
    })
}

pub fn remove_team_project_links(team_id: TeamId) {
    mutate_state(|s| {
        let project_permissions = s
            .team_project_permissions_index
            .range((team_id, ProjectId::MIN)..=(team_id, ProjectId::MAX))
            .map(|entry| *entry.key())
            .collect::<Vec<_>>();

        for (tid, pid) in project_permissions {
            s.team_project_permissions_index.remove(&(tid, pid));
            s.project_team_permissions_index.remove(&(pid, tid));
        }
    });
}

pub fn get_project(project_id: &ProjectId) -> Option<Project> {
    with_state(|s| s.projects.get(project_id))
}

pub fn list_org_projects(org_id: OrgId) -> Vec<(ProjectId, Project)> {
    with_state(|s| {
        s.organization_project_index
            .range((org_id, ProjectId::MIN)..=(org_id, ProjectId::MAX))
            .filter_map(|(_, project_id)| {
                s.projects
                    .get(&project_id)
                    .map(|project| (project_id, project))
            })
            .collect()
    })
}

pub fn list_team_projects(team_ids: &[TeamId]) -> Vec<(ProjectId, Project)> {
    list_all_team_project_ids(team_ids)
        .into_iter()
        .filter_map(|project_id| get_project(&project_id).map(|project| (project_id, project)))
        .collect::<Vec<_>>()
}

fn list_all_team_project_ids(team_ids: &[TeamId]) -> HashSet<ProjectId> {
    team_ids
        .iter()
        .flat_map(|team_id| list_team_project_ids(*team_id))
        .collect()
}

pub fn list_team_project_ids(team_id: TeamId) -> Vec<ProjectId> {
    with_state(|s| {
        s.team_project_permissions_index
            .range((team_id, ProjectId::MIN)..=(team_id, ProjectId::MAX))
            .map(|entry| entry.key().1)
            .collect()
    })
}

pub fn team_has_projects(team_id: TeamId) -> bool {
    with_state(|s| {
        s.team_project_permissions_index
            .range((team_id, ProjectId::MIN)..=(team_id, ProjectId::MAX))
            .next()
            .is_some()
    })
}

pub fn org_has_projects(org_id: OrgId) -> bool {
    with_state(|s| {
        s.organization_project_index
            .range((org_id, ProjectId::MIN)..=(org_id, ProjectId::MAX))
            .any(|_| true)
    })
}

pub fn metrics_counts() -> Vec<(&'static str, u64)> {
    with_state(|s| {
        vec![
            ("projects", s.projects.len()),
            ("project_team_index", s.project_team_index.len()),
            (
                "organization_project_index",
                s.organization_project_index.len(),
            ),
            (
                "project_team_permissions_index",
                s.project_team_permissions_index.len(),
            ),
            (
                "team_project_permissions_index",
                s.team_project_permissions_index.len(),
            ),
        ]
    })
}

struct ProjectState {
    projects: ProjectMemory,
    project_team_index: ProjectTeamIndexMemory, // TODO: remove after migration has run on all environments
    organization_project_index: OrganizationProjectIndexMemory,
    project_team_permissions_index: ProjectTeamPermissionsIndexMemory,
    team_project_permissions_index: TeamProjectPermissionsIndexMemory,
}

impl Default for ProjectState {
    fn default() -> Self {
        Self {
            projects: init_projects(),
            project_team_index: init_project_team_index(),
            organization_project_index: init_organization_project_index(),
            project_team_permissions_index: init_project_team_permissions_index(),
            team_project_permissions_index: init_team_project_permissions_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<ProjectState> = RefCell::new(ProjectState::default());
}

pub fn migrate_project_team_permissions() {
    mutate_state(|s| {
        let entries: Vec<(ProjectId, TeamId)> = s
            .project_team_index
            .range((ProjectId::MIN, TeamId::MIN)..=(ProjectId::MAX, TeamId::MAX))
            .collect();

        for (project_id, team_id) in entries {
            s.project_team_index.remove(&(project_id, team_id));
            if s.project_team_permissions_index
                .get(&(project_id, team_id))
                .is_none()
            {
                s.project_team_permissions_index
                    .insert((project_id, team_id), ProjectPermissions::ALL);
                s.team_project_permissions_index
                    .insert((team_id, project_id), ProjectPermissions::ALL);
            }
        }
    });
}

fn with_state<R>(f: impl FnOnce(&ProjectState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut ProjectState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
