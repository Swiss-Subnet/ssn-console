use std::collections::HashSet;

use crate::{
    data::{project_repository, team_repository},
    mapping::map_list_user_projects_response,
};
use candid::Principal;

pub fn list_my_projects(calling_principal: Principal) -> Result<Vec<crate::dto::Project>, String> {
    let user_id =
        crate::data::user_profile_repository::get_user_id_by_principal(&calling_principal)
            .ok_or_else(|| {
                format!(
                    "User profile for principal {} does not exist",
                    calling_principal
                )
            })?;

    let mut project_ids = HashSet::new();
    for team_id in team_repository::list_user_team_ids(user_id) {
        for project_id in project_repository::list_team_project_ids(team_id) {
            project_ids.insert(project_id);
        }
    }

    let projects = project_ids
        .iter()
        .filter_map(|project_id| {
            project_repository::get_project(project_id).map(|project| (*project_id, project))
        })
        .collect::<Vec<_>>();

    Ok(map_list_user_projects_response(projects))
}
