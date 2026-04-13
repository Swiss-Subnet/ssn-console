use crate::{
    data::{
        organization_repository, project_repository, team_repository, user_profile_repository,
        Project,
    },
    dto::{
        self, CreateProjectRequest, CreateProjectResponse, ListMyProjectsResponse,
        ListOrgProjectsRequest, ListOrgProjectsResponse,
    },
    mapping::{map_list_my_projects_response, map_list_org_projects_response},
};
use candid::Principal;
use canister_utils::{ApiResult, Uuid};

pub fn list_my_projects(caller: &Principal) -> ApiResult<ListMyProjectsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team_ids = team_repository::list_user_team_ids(user_id);
    let projects = project_repository::list_team_projects(&team_ids);

    Ok(map_list_my_projects_response(projects))
}

pub fn list_org_projects(
    caller: &Principal,
    req: ListOrgProjectsRequest,
) -> ApiResult<ListOrgProjectsResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    organization_repository::assert_user_in_org(user_id, org_id)?;

    let projects = project_repository::list_org_projects(org_id);
    Ok(map_list_org_projects_response(projects))
}

pub fn create_project(
    caller: &Principal,
    req: CreateProjectRequest,
) -> ApiResult<CreateProjectResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    organization_repository::assert_user_in_org(user_id, org_id)?;

    let id = project_repository::create_project(
        org_id,
        Project {
            org_id,
            name: req.name.clone(),
        },
    );

    Ok(CreateProjectResponse {
        project: dto::Project {
            id: id.to_string(),
            org_id: org_id.to_string(),
            name: req.name,
        },
    })
}
