use super::{
    memory::{
        init_organization_project_index, init_project_team_index, init_projects,
        init_team_project_index, OrganizationProjectIndexMemory, ProjectMemory,
        ProjectTeamIndexMemory, TeamProjectIndexMemory,
    },
    Project, Uuid,
};
use std::cell::RefCell;

pub fn add_default_project(team_id: Uuid, org_id: Uuid) -> Uuid {
    let project_id = Uuid::new();
    let project = Project {
        name: "Default Project".to_string(),
    };

    mutate_state(|s| {
        s.projects.insert(project_id, project);
        s.organization_project_index.insert((org_id, project_id));
        s.project_team_index.insert((project_id, team_id));
        s.team_project_index.insert((team_id, project_id));
    });

    project_id
}

pub fn get_project(project_id: &Uuid) -> Option<Project> {
    with_state(|s| s.projects.get(project_id))
}

pub fn list_team_project_ids(team_id: Uuid) -> Vec<Uuid> {
    with_state(|s| {
        s.team_project_index
            .range((team_id, Uuid::MIN)..=(team_id, Uuid::MAX))
            .map(|(_, project_id)| project_id)
            .collect()
    })
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
