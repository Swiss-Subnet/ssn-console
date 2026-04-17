use crate::{
    data::{
        canister_repository, organization_repository, project_repository, team_repository,
        user_profile_repository, Project,
    },
    dto::{
        AddTeamToProjectRequest, AddTeamToProjectResponse, CreateProjectRequest,
        CreateProjectResponse, DeleteProjectRequest, DeleteProjectResponse, GetProjectRequest,
        GetProjectResponse, ListMyProjectsResponse, ListOrgProjectsRequest,
        ListOrgProjectsResponse, ListProjectTeamsRequest, ListTeamsResponse,
        RemoveTeamFromProjectRequest, RemoveTeamFromProjectResponse, UpdateProjectRequest,
        UpdateProjectResponse,
    },
    mapping::{
        map_list_my_projects_response, map_list_org_projects_response, map_list_teams_response,
        map_project_to_response,
    },
    validation::ProjectName,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

const MAX_PROJECTS_PER_ORG: usize = 50;

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
    let name = ProjectName::try_from(req.name)?;

    if project_repository::has_at_least_n_org_projects(org_id, MAX_PROJECTS_PER_ORG) {
        return Err(ApiError::client_error(format!(
            "Cannot create more than {MAX_PROJECTS_PER_ORG} projects per organization."
        )));
    }

    let project = Project {
        org_id,
        name: name.into_inner(),
    };
    let project_id = project_repository::create_project(org_id, project.clone());

    Ok(map_project_to_response(project_id, project))
}

pub fn get_project(caller: &Principal, req: GetProjectRequest) -> ApiResult<GetProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let project = project_repository::get_project(&project_id).ok_or_else(|| {
        ApiError::client_error(format!("Project with id {project_id} does not exist."))
    })?;
    organization_repository::assert_user_in_org(user_id, project.org_id)?;

    Ok(map_project_to_response(project_id, project))
}

pub fn update_project(
    caller: &Principal,
    req: UpdateProjectRequest,
) -> ApiResult<UpdateProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let existing = project_repository::get_project(&project_id).ok_or_else(|| {
        ApiError::client_error(format!("Project with id {project_id} does not exist."))
    })?;
    organization_repository::assert_user_in_org(user_id, existing.org_id)?;
    let name = ProjectName::try_from(req.name)?;

    let project = Project {
        org_id: existing.org_id,
        name: name.into_inner(),
    };
    project_repository::update_project(project_id, project.clone())?;

    Ok(map_project_to_response(project_id, project))
}

pub fn delete_project(
    caller: &Principal,
    req: DeleteProjectRequest,
) -> ApiResult<DeleteProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let project = project_repository::get_project(&project_id).ok_or_else(|| {
        ApiError::client_error(format!("Project with id {project_id} does not exist."))
    })?;
    organization_repository::assert_user_in_org(user_id, project.org_id)?;

    if !project_repository::has_at_least_n_org_projects(project.org_id, 2) {
        return Err(ApiError::client_error(
            "Cannot delete the last project in an organization.".to_string(),
        ));
    }

    if canister_repository::project_has_canisters(project_id) {
        return Err(ApiError::client_error(
            "Cannot delete a project that still has canisters. Remove all canisters first."
                .to_string(),
        ));
    }

    project_repository::delete_project(project_id, project.org_id)?;

    Ok(DeleteProjectResponse {})
}

pub fn list_project_teams(
    caller: &Principal,
    req: ListProjectTeamsRequest,
) -> ApiResult<ListTeamsResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let project = project_repository::get_project(&project_id).ok_or_else(|| {
        ApiError::client_error(format!("Project with id {project_id} does not exist."))
    })?;
    organization_repository::assert_user_in_org(user_id, project.org_id)?;

    let teams = project_repository::list_project_team_ids(project_id)
        .into_iter()
        .filter_map(|tid| team_repository::get_team(tid).map(|team| (tid, team)))
        .collect::<Vec<_>>();

    Ok(map_list_teams_response(teams))
}

pub fn add_team_to_project(
    caller: &Principal,
    req: AddTeamToProjectRequest,
) -> ApiResult<AddTeamToProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let project = project_repository::get_project(&project_id).ok_or_else(|| {
        ApiError::client_error(format!("Project with id {project_id} does not exist."))
    })?;
    organization_repository::assert_user_in_org(user_id, project.org_id)?;

    let team = team_repository::get_team(team_id)
        .ok_or_else(|| ApiError::client_error(format!("Team with id {team_id} does not exist.")))?;

    if team.org_id != project.org_id {
        return Err(ApiError::client_error(
            "Team and project must belong to the same organization.".to_string(),
        ));
    }

    if project_repository::is_team_in_project(team_id, project_id) {
        return Ok(AddTeamToProjectResponse {});
    }

    project_repository::add_team_to_project(team_id, project_id);

    Ok(AddTeamToProjectResponse {})
}

pub fn remove_team_from_project(
    caller: &Principal,
    req: RemoveTeamFromProjectRequest,
) -> ApiResult<RemoveTeamFromProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let project = project_repository::get_project(&project_id).ok_or_else(|| {
        ApiError::client_error(format!("Project with id {project_id} does not exist."))
    })?;
    organization_repository::assert_user_in_org(user_id, project.org_id)?;

    if !project_repository::is_team_in_project(team_id, project_id) {
        return Ok(RemoveTeamFromProjectResponse {});
    }

    if project_repository::project_team_count(project_id) < 2 {
        return Err(ApiError::client_error(
            "Cannot remove the last team from a project.".to_string(),
        ));
    }

    project_repository::remove_team_from_project(team_id, project_id);

    Ok(RemoveTeamFromProjectResponse {})
}
