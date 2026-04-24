use crate::{
    data::{project_repository, team_repository, user_profile_repository, OrgPermissions, Team},
    dto::{
        AddUserToTeamRequest, AddUserToTeamResponse, CreateTeamRequest, CreateTeamResponse,
        DeleteTeamRequest, DeleteTeamResponse, GetTeamRequest, GetTeamResponse,
        ListOrgTeamsRequest, ListOrgTeamsResponse, ListTeamUsersRequest, ListTeamUsersResponse,
        ListTeamsResponse, UpdateTeamOrgPermissionsRequest, UpdateTeamOrgPermissionsResponse,
        UpdateTeamRequest, UpdateTeamResponse,
    },
    mapping::{
        map_list_org_teams_response, map_list_team_users_response, map_list_teams_response,
        map_org_permissions_from_dto, map_org_team, map_team_to_response,
    },
    service::access_control_service::{
        assert_org_admin_populated_after_removing_team, require_team_access, OrgAuth,
    },
    validation::TeamName,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

const MAX_TEAMS_PER_ORG: usize = 50;

pub fn list_my_teams(caller: Principal) -> ApiResult<ListTeamsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let teams = team_repository::list_user_teams(user_id);
    Ok(map_list_teams_response(teams))
}

pub fn list_org_teams(
    caller: &Principal,
    req: ListOrgTeamsRequest,
) -> ApiResult<ListOrgTeamsResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::EMPTY)?;

    let teams = team_repository::list_org_teams_with_permissions(auth.org_id());
    Ok(map_list_org_teams_response(teams))
}

pub fn create_team(caller: &Principal, req: CreateTeamRequest) -> ApiResult<CreateTeamResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::TEAM_MANAGE)?;
    let name = TeamName::try_from(req.name)?;

    if team_repository::has_at_least_n_org_teams(auth.org_id(), MAX_TEAMS_PER_ORG) {
        return Err(ApiError::client_error(format!(
            "Cannot create more than {MAX_TEAMS_PER_ORG} teams per organization."
        )));
    }

    let team = Team {
        org_id: auth.org_id(),
        name: name.into_inner(),
    };
    let team_id = team_repository::create_team(auth.user_id(), auth.org_id(), team.clone());

    Ok(map_team_to_response(team_id, team))
}

pub fn get_team(caller: &Principal, req: GetTeamRequest) -> ApiResult<GetTeamResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let (team, _auth) = require_team_access(caller, team_id, OrgPermissions::EMPTY)?;

    Ok(map_team_to_response(team_id, team))
}

pub fn update_team(caller: &Principal, req: UpdateTeamRequest) -> ApiResult<UpdateTeamResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let (existing, _auth) = require_team_access(caller, team_id, OrgPermissions::TEAM_MANAGE)?;
    let name = TeamName::try_from(req.name)?;

    let team = Team {
        org_id: existing.org_id,
        name: name.into_inner(),
    };
    team_repository::update_team(team_id, team.clone())?;

    Ok(map_team_to_response(team_id, team))
}

pub fn delete_team(caller: &Principal, req: DeleteTeamRequest) -> ApiResult<DeleteTeamResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let (_team, auth) = require_team_access(caller, team_id, OrgPermissions::TEAM_MANAGE)?;

    if !team_repository::has_at_least_n_org_teams(auth.org_id(), 2) {
        return Err(ApiError::client_error(
            "Cannot delete the last team in an organization.".to_string(),
        ));
    }

    if project_repository::team_has_projects(team_id) {
        return Err(ApiError::client_error(
            "Cannot delete a team that still has projects. Remove all projects first.".to_string(),
        ));
    }

    assert_org_admin_populated_after_removing_team(auth.org_id(), team_id)?;

    project_repository::remove_team_project_links(team_id);
    team_repository::delete_team(team_id, auth.org_id())?;

    Ok(DeleteTeamResponse {})
}

pub fn list_team_users(
    caller: &Principal,
    req: ListTeamUsersRequest,
) -> ApiResult<ListTeamUsersResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let (_team, _auth) = require_team_access(caller, team_id, OrgPermissions::EMPTY)?;

    let users = team_repository::list_team_user_ids(team_id)
        .into_iter()
        .filter_map(|id| user_profile_repository::get_user_profile_by_user_id(&id).map(|p| (id, p)))
        .collect::<Vec<_>>();

    Ok(map_list_team_users_response(users))
}

pub fn add_user_to_team(
    caller: &Principal,
    req: AddUserToTeamRequest,
) -> ApiResult<AddUserToTeamResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let target_user_id = Uuid::try_from(req.user_id.as_str())?;
    let (_team, auth) = require_team_access(caller, team_id, OrgPermissions::MEMBER_MANAGE)?;
    auth.assert_member(target_user_id)?;

    if team_repository::is_user_in_team(target_user_id, team_id) {
        return Ok(AddUserToTeamResponse {});
    }

    team_repository::add_user_to_team(target_user_id, team_id);

    Ok(AddUserToTeamResponse {})
}

// Overwrite the org permissions granted to a team. Requires ORG_ADMIN on
// the team's parent org. If the new permissions omit ORG_ADMIN, enforce the
// org-wide invariant that at least one other team retains ORG_ADMIN and
// has a member — otherwise the org would become unadministrable on the
// next request. This mirrors the pre-mutation check in delete_team.
pub fn update_team_org_permissions(
    caller: &Principal,
    req: UpdateTeamOrgPermissionsRequest,
) -> ApiResult<UpdateTeamOrgPermissionsResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let (team, auth) = require_team_access(caller, team_id, OrgPermissions::ORG_ADMIN)?;

    let new_perms = map_org_permissions_from_dto(req.permissions);

    if !new_perms.contains(OrgPermissions::ORG_ADMIN) {
        assert_org_admin_populated_after_removing_team(auth.org_id(), team_id)?;
    }

    team_repository::set_org_team_permissions(auth.org_id(), team_id, new_perms);

    Ok(UpdateTeamOrgPermissionsResponse {
        team: map_org_team(team_id, team, new_perms),
    })
}
