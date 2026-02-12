use crate::{
    data::{self},
    dto::{ListMyProjectsResponse, Project},
};

pub fn map_list_user_projects_response(
    projects: Vec<(data::Uuid, data::Project)>,
) -> ListMyProjectsResponse {
    projects
        .into_iter()
        .map(|(project_id, project)| map_project_response(project_id, project))
        .collect()
}

pub fn map_project_response(project_id: data::Uuid, project: data::Project) -> Project {
    Project {
        id: project_id.to_string(),
        name: project.name,
    }
}
