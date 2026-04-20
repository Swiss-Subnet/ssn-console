use crate::{
    data::{
        canister_repository, project_repository, team_repository, user_profile_repository,
        OrgPermissions, Project, ProjectPermissions,
    },
    dto::{
        AddTeamToProjectRequest, AddTeamToProjectResponse, CreateProjectRequest,
        CreateProjectResponse, DeleteProjectRequest, DeleteProjectResponse, GetProjectRequest,
        GetProjectResponse, ListMyProjectsResponse, ListOrgProjectsRequest,
        ListOrgProjectsResponse, ListProjectTeamsRequest, ListProjectTeamsResponse,
        RemoveTeamFromProjectRequest, RemoveTeamFromProjectResponse, UpdateProjectRequest,
        UpdateProjectResponse, UpdateTeamProjectPermissionsRequest,
        UpdateTeamProjectPermissionsResponse,
    },
    mapping::{
        map_list_my_projects_response, map_list_org_projects_response,
        map_list_project_teams_response, map_project_permissions_from_dto, map_project_team,
        map_project_to_response,
    },
    service::access_control_service::{team_not_found_or_no_access, OrgAuth, ProjectAuth},
    validation::ProjectName,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

const MAX_PROJECTS_PER_ORG: usize = 50;

pub fn list_my_projects(caller: &Principal) -> ApiResult<ListMyProjectsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team_ids = team_repository::list_user_team_ids(user_id);
    let projects = project_repository::list_team_projects(&team_ids)
        .into_iter()
        .map(|(project_id, project)| {
            let (perms, _) =
                project_repository::aggregate_team_project_permissions(&team_ids, project_id);
            (project_id, project, perms)
        })
        .collect();

    Ok(map_list_my_projects_response(projects))
}

pub fn list_org_projects(
    caller: &Principal,
    req: ListOrgProjectsRequest,
) -> ApiResult<ListOrgProjectsResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::EMPTY)?;

    let team_ids = team_repository::list_user_team_ids(auth.user_id());
    let projects = project_repository::list_org_projects(auth.org_id())
        .into_iter()
        .map(|(project_id, project)| {
            let (perms, _) =
                project_repository::aggregate_team_project_permissions(&team_ids, project_id);
            (project_id, project, perms)
        })
        .collect();
    Ok(map_list_org_projects_response(projects))
}

pub fn create_project(
    caller: &Principal,
    req: CreateProjectRequest,
) -> ApiResult<CreateProjectResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::PROJECT_CREATE)?;
    let name = ProjectName::try_from(req.name)?;

    if project_repository::has_at_least_n_org_projects(auth.org_id(), MAX_PROJECTS_PER_ORG) {
        return Err(ApiError::client_error(format!(
            "Cannot create more than {MAX_PROJECTS_PER_ORG} projects per organization."
        )));
    }

    let project = Project {
        org_id: auth.org_id(),
        name: name.into_inner(),
    };
    let project_id = project_repository::create_project(auth.org_id(), project.clone());

    // Link every team the creator belongs to in this org with full project
    // permissions. Bootstraps the project-level access chain so the creator
    // (and anyone who already shares a team with them) can immediately
    // manage the new project. Matches the auto-link behavior of the default
    // project created during org setup.
    for team_id in team_repository::list_user_teams_in_org(auth.user_id(), auth.org_id()) {
        project_repository::add_team_to_project(team_id, project_id);
    }

    // The creator's teams were all just linked with ProjectPermissions::ALL,
    // so the aggregated caller permissions on the new project are ALL.
    Ok(map_project_to_response(
        project_id,
        project,
        ProjectPermissions::ALL,
    ))
}

pub fn get_project(caller: &Principal, req: GetProjectRequest) -> ApiResult<GetProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::EMPTY)?;
    let project = project_repository::get_project(&auth.project_id())
        .expect("project must exist after ProjectAuth");

    Ok(map_project_to_response(
        auth.project_id(),
        project,
        auth.perms(),
    ))
}

pub fn update_project(
    caller: &Principal,
    req: UpdateProjectRequest,
) -> ApiResult<UpdateProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::PROJECT_SETTINGS)?;
    let name = ProjectName::try_from(req.name)?;

    let project = Project {
        org_id: auth.org_id(),
        name: name.into_inner(),
    };
    project_repository::update_project(auth.project_id(), project.clone())?;

    Ok(map_project_to_response(
        auth.project_id(),
        project,
        auth.perms(),
    ))
}

pub fn delete_project(
    caller: &Principal,
    req: DeleteProjectRequest,
) -> ApiResult<DeleteProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::PROJECT_ADMIN)?;

    if !project_repository::has_at_least_n_org_projects(auth.org_id(), 2) {
        return Err(ApiError::client_error(
            "Cannot delete the last project in an organization.".to_string(),
        ));
    }

    if canister_repository::project_has_canisters(auth.project_id()) {
        return Err(ApiError::client_error(
            "Cannot delete a project that still has canisters. Remove all canisters first."
                .to_string(),
        ));
    }

    project_repository::delete_project(auth.project_id(), auth.org_id())?;

    Ok(DeleteProjectResponse {})
}

pub fn list_project_teams(
    caller: &Principal,
    req: ListProjectTeamsRequest,
) -> ApiResult<ListProjectTeamsResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::EMPTY)?;

    let teams = project_repository::list_project_team_ids(auth.project_id())
        .into_iter()
        .filter_map(|tid| {
            let team = team_repository::get_team(tid)?;
            let perms = project_repository::get_project_team_permissions(auth.project_id(), tid)?;
            Some((tid, team, perms))
        })
        .collect::<Vec<_>>();

    Ok(map_list_project_teams_response(teams))
}

pub fn add_team_to_project(
    caller: &Principal,
    req: AddTeamToProjectRequest,
) -> ApiResult<AddTeamToProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::PROJECT_ADMIN)?;

    // Collapse "team does not exist" and "team in another org" into the same
    // error: the caller, as a project admin, must not be able to probe team
    // ids across orgs.
    let team_in_scope =
        team_repository::get_team(team_id).is_some_and(|t| t.org_id == auth.org_id());
    if !team_in_scope {
        return Err(team_not_found_or_no_access(team_id));
    }

    if project_repository::is_team_in_project(team_id, auth.project_id()) {
        return Ok(AddTeamToProjectResponse {});
    }

    project_repository::add_team_to_project(team_id, auth.project_id());

    Ok(AddTeamToProjectResponse {})
}

pub fn remove_team_from_project(
    caller: &Principal,
    req: RemoveTeamFromProjectRequest,
) -> ApiResult<RemoveTeamFromProjectResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::PROJECT_ADMIN)?;

    if !project_repository::is_team_in_project(team_id, auth.project_id()) {
        return Ok(RemoveTeamFromProjectResponse {});
    }

    if project_repository::project_team_count(auth.project_id()) < 2 {
        return Err(ApiError::client_error(
            "Cannot remove the last team from a project.".to_string(),
        ));
    }

    project_repository::remove_team_from_project(team_id, auth.project_id());

    Ok(RemoveTeamFromProjectResponse {})
}

pub fn update_team_project_permissions(
    caller: &Principal,
    req: UpdateTeamProjectPermissionsRequest,
) -> ApiResult<UpdateTeamProjectPermissionsResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let auth = ProjectAuth::require(caller, project_id, ProjectPermissions::PROJECT_ADMIN)?;

    let team = team_repository::get_team(team_id)
        .filter(|t| t.org_id == auth.org_id())
        .ok_or_else(|| team_not_found_or_no_access(team_id))?;

    if !project_repository::is_team_in_project(team_id, auth.project_id()) {
        return Err(team_not_found_or_no_access(team_id));
    }

    let new_perms = map_project_permissions_from_dto(req.permissions);
    project_repository::set_project_team_permissions(auth.project_id(), team_id, new_perms);

    Ok(UpdateTeamProjectPermissionsResponse {
        team: map_project_team(team_id, team, new_perms),
    })
}
