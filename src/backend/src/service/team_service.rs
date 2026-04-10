use crate::{
    data::{
        organization_repository, project_repository, team_repository, user_profile_repository, Team,
    },
    dto::{
        AddUserToTeamRequest, CreateTeamRequest, CreateTeamResponse, DeleteTeamRequest,
        GetTeamRequest, GetTeamResponse, ListOrgTeamsRequest, ListTeamsResponse, UpdateTeamRequest,
        UpdateTeamResponse,
    },
    mapping::{map_list_teams_response, map_team_to_response},
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};

const MAX_TEAM_NAME_LENGTH: usize = 100;
const MAX_TEAMS_PER_ORG: usize = 50;

fn validate_and_trim_team_name(name: String) -> ApiResult<String> {
    let trimmed = name.trim().to_string();
    if trimmed.is_empty() {
        return Err(ApiError::client_error(
            "Team name cannot be empty.".to_string(),
        ));
    }
    if trimmed.len() > MAX_TEAM_NAME_LENGTH {
        return Err(ApiError::client_error(format!(
            "Team name cannot exceed {MAX_TEAM_NAME_LENGTH} characters."
        )));
    }
    Ok(trimmed)
}

pub fn list_my_teams(caller: Principal) -> ApiResult<ListTeamsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(&caller)?;

    let teams = team_repository::list_user_teams(user_id);
    Ok(map_list_teams_response(teams))
}

pub fn list_org_teams(
    caller: &Principal,
    req: ListOrgTeamsRequest,
) -> ApiResult<ListTeamsResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    organization_repository::assert_user_in_org(user_id, org_id)?;

    let teams = team_repository::list_org_teams(org_id);
    Ok(map_list_teams_response(teams))
}

pub fn create_team(caller: &Principal, req: CreateTeamRequest) -> ApiResult<CreateTeamResponse> {
    let org_id = Uuid::try_from(req.org_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    organization_repository::assert_user_in_org(user_id, org_id)?;
    let name = validate_and_trim_team_name(req.name)?;

    if team_repository::count_org_teams(org_id) >= MAX_TEAMS_PER_ORG {
        return Err(ApiError::client_error(format!(
            "Cannot create more than {MAX_TEAMS_PER_ORG} teams per organization."
        )));
    }

    let team = Team { org_id, name };
    let team_id = team_repository::create_team(user_id, org_id, team.clone());

    Ok(map_team_to_response(team_id, team))
}

pub fn get_team(caller: &Principal, req: GetTeamRequest) -> ApiResult<GetTeamResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team = team_repository::get_team(team_id)
        .ok_or_else(|| ApiError::client_error(format!("Team with id {team_id} does not exist.")))?;
    organization_repository::assert_user_in_org(user_id, team.org_id)?;

    Ok(map_team_to_response(team_id, team))
}

pub fn update_team(caller: &Principal, req: UpdateTeamRequest) -> ApiResult<UpdateTeamResponse> {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let existing = team_repository::get_team(team_id)
        .ok_or_else(|| ApiError::client_error(format!("Team with id {team_id} does not exist.")))?;
    organization_repository::assert_user_in_org(user_id, existing.org_id)?;
    let name = validate_and_trim_team_name(req.name)?;

    let team = Team {
        org_id: existing.org_id,
        name,
    };
    team_repository::update_team(team_id, team.clone())?;

    Ok(map_team_to_response(team_id, team))
}

pub fn delete_team(caller: &Principal, req: DeleteTeamRequest) -> ApiResult {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team = team_repository::get_team(team_id)
        .ok_or_else(|| ApiError::client_error(format!("Team with id {team_id} does not exist.")))?;
    organization_repository::assert_user_in_org(user_id, team.org_id)?;

    if team_repository::count_org_teams(team.org_id) <= 1 {
        return Err(ApiError::client_error(
            "Cannot delete the last team in an organization.".to_string(),
        ));
    }

    if project_repository::team_has_projects(team_id) {
        return Err(ApiError::client_error(
            "Cannot delete a team that still has projects. Remove all projects first.".to_string(),
        ));
    }

    project_repository::remove_team_project_links(team_id);
    team_repository::delete_team(team_id, team.org_id)?;

    Ok(())
}

pub fn add_user_to_team(caller: &Principal, req: AddUserToTeamRequest) -> ApiResult {
    let team_id = Uuid::try_from(req.team_id.as_str())?;
    let target_user_id = Uuid::try_from(req.user_id.as_str())?;
    let caller_user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let team = team_repository::get_team(team_id)
        .ok_or_else(|| ApiError::client_error(format!("Team with id {team_id} does not exist.")))?;
    organization_repository::assert_user_in_org(caller_user_id, team.org_id)?;
    organization_repository::assert_user_in_org(target_user_id, team.org_id)?;

    if team_repository::is_user_in_team(target_user_id, team_id) {
        return Ok(());
    }

    team_repository::add_user_to_team(target_user_id, team_id);

    Ok(())
}

pub fn migrate_team_org_ids() {
    team_repository::migrate_team_org_ids();
}
