use crate::{
    data::{self},
    dto::{self},
};
use canister_utils::Uuid;
use std::collections::BTreeMap;

pub fn map_list_my_projects_response(
    projects: Vec<(Uuid, data::Project)>,
) -> dto::ListMyProjectsResponse {
    let projects_by_org = projects.into_iter().fold(
        BTreeMap::<_, Vec<_>>::new(),
        |mut acc, (project_id, project)| {
            acc.entry(project.org_id)
                .or_default()
                .push(map_project_response((project_id, project)));
            acc
        },
    );

    let projects = projects_by_org
        .into_iter()
        .map(|(org_id, projects)| dto::OrgWithProjects {
            org_id: org_id.to_string(),
            projects,
        })
        .collect();

    dto::ListMyProjectsResponse { orgs_with_projects: projects }
}

pub fn map_project_response((project_id, project): (Uuid, data::Project)) -> dto::Project {
    dto::Project {
        id: project_id.to_string(),
        org_id: project.org_id.to_string(),
        name: project.name,
    }
}
