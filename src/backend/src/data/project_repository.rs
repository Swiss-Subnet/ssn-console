use super::{
    memory::{
        init_organization_project_index, init_project_team_index, init_projects,
        init_team_project_index, OrganizationProjectIndexMemory, ProjectMemory,
        ProjectTeamIndexMemory, TeamProjectIndexMemory,
    },
    Project,
};
use canister_utils::{ApiError, ApiResult, Uuid};
use std::{cell::RefCell, collections::HashSet};

pub fn add_default_project(team_id: Uuid, org_id: Uuid) -> Uuid {
    let project = Project {
        org_id,
        name: "Default Project".to_string(),
    };

    let project_id = create_project(org_id, project);
    add_team_to_project(team_id, project_id);

    project_id
}

pub fn create_project(org_id: Uuid, project: Project) -> Uuid {
    let project_id = Uuid::new();

    mutate_state(|s| {
        s.projects.insert(project_id, project);
        s.organization_project_index.insert((org_id, project_id));
    });

    project_id
}

pub fn add_team_to_project(team_id: Uuid, project_id: Uuid) {
    mutate_state(|s| {
        s.project_team_index.insert((project_id, team_id));
        s.team_project_index.insert((team_id, project_id));
    });
}

pub fn remove_team_project_links(team_id: Uuid) {
    mutate_state(|s| {
        while let Some((tid, pid)) = s
            .team_project_index
            .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
            .next()
        {
            s.team_project_index.remove(&(tid, pid));
            s.project_team_index.remove(&(pid, tid));
        }
    });
}

pub fn get_project(project_id: &Uuid) -> Option<Project> {
    with_state(|s| s.projects.get(project_id))
}

pub fn list_org_projects(org_id: Uuid) -> Vec<(Uuid, Project)> {
    with_state(|s| {
        s.organization_project_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .filter_map(|(_, project_id)| {
                s.projects
                    .get(&project_id)
                    .map(|project| (project_id, project))
            })
            .collect()
    })
}

pub fn list_team_projects(team_ids: &[Uuid]) -> Vec<(Uuid, Project)> {
    list_all_team_project_ids(team_ids)
        .into_iter()
        .filter_map(|project_id| get_project(&project_id).map(|project| (project_id, project)))
        .collect::<Vec<_>>()
}

fn list_all_team_project_ids(team_ids: &[Uuid]) -> HashSet<Uuid> {
    team_ids
        .iter()
        .flat_map(|team_id| list_team_project_ids(*team_id))
        .collect()
}

pub fn list_team_project_ids(team_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.team_project_index
            .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
            .map(|(_, project_id)| project_id)
            .collect()
    })
}

pub fn team_has_projects(team_id: Uuid) -> bool {
    with_state(|s| {
        s.team_project_index
            .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
            .any(|_| true)
    })
}

pub fn org_has_projects(org_id: Uuid) -> bool {
    with_state(|s| {
        s.organization_project_index
            .range((org_id, Uuid::MIN)..=(org_id, Uuid::MAX))
            .any(|_| true)
    })
}

pub fn assert_any_team_has_project(
    user_id: &Uuid,
    team_ids: &[Uuid],
    project_to_check: Uuid,
) -> ApiResult {
    if !list_all_team_project_ids(team_ids).contains(&project_to_check) {
        return Err(ApiError::unauthorized(format!(
            "User with id {user_id} does not have access to project with id {project_to_check}"
        )));
    }

    Ok(())
}

struct ProjectState {
    projects: ProjectMemory,
    project_team_index: ProjectTeamIndexMemory,
    team_project_index: TeamProjectIndexMemory,
    organization_project_index: OrganizationProjectIndexMemory,
}

impl Default for ProjectState {
    fn default() -> Self {
        Self {
            projects: init_projects(),
            project_team_index: init_project_team_index(),
            team_project_index: init_team_project_index(),
            organization_project_index: init_organization_project_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<ProjectState> = RefCell::new(ProjectState::default());
}

fn with_state<R>(f: impl FnOnce(&ProjectState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut ProjectState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
