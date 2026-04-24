use crate::{
    data::{self},
    dto::{self},
    mapping::map_project_permissions,
};
use canister_utils::Uuid;

pub fn map_list_my_projects_response(
    projects: Vec<(Uuid, data::Project, data::ProjectPermissions)>,
) -> dto::ListMyProjectsResponse {
    dto::ListMyProjectsResponse {
        projects: projects.into_iter().map(map_project_response).collect(),
    }
}

pub fn map_list_org_projects_response(
    projects: Vec<(Uuid, data::Project, data::ProjectPermissions)>,
) -> dto::ListOrgProjectsResponse {
    dto::ListOrgProjectsResponse {
        projects: projects.into_iter().map(map_project_response).collect(),
    }
}

pub fn map_project_response(
    (project_id, project, your_permissions): (Uuid, data::Project, data::ProjectPermissions),
) -> dto::Project {
    dto::Project {
        id: project_id.to_string(),
        org_id: project.org_id.to_string(),
        name: project.name,
        your_permissions: map_project_permissions(your_permissions),
    }
}

pub fn map_project_to_response(
    project_id: Uuid,
    project: data::Project,
    your_permissions: data::ProjectPermissions,
) -> dto::ProjectResponse {
    dto::ProjectResponse {
        project: map_project_response((project_id, project, your_permissions)),
    }
}
