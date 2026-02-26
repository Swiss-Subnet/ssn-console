use crate::{
    data::{self},
    dto::{ListMyProjectsResponse, Project},
};
use canister_utils::Uuid;

pub fn map_list_my_projects_response(
    projects: Vec<(Uuid, data::Project)>,
) -> ListMyProjectsResponse {
    projects
        .into_iter()
        .map(|(project_id, project)| map_project_response(project_id, project))
        .collect()
}

pub fn map_project_response(project_id: Uuid, project: data::Project) -> Project {
    Project {
        id: project_id.to_string(),
        name: project.name,
    }
}
