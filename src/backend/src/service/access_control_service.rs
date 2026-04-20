use crate::data::{
    organization_repository, project_repository, team_repository, terms_and_conditions_repository,
    trusted_partner_repository, user_profile_repository, OrgPermissions, Project,
    ProjectPermissions, Team, UserStatus,
};
use candid::Principal;
use canister_utils::{assert_authenticated, ApiError, ApiResult, Uuid};
use ic_cdk::api::is_controller;

// Generic "not found or no access" errors. A caller who is not allowed to
// know that a resource exists (or which org owns it) gets this same message
// whether the id refers to a real resource in another org or to a non-
// existent id. This prevents probing for resource existence or mapping ids
// to orgs by observing error messages.
pub fn project_not_found_or_no_access(project_id: Uuid) -> ApiError {
    ApiError::client_error(format!(
        "Project with id {project_id} does not exist or you do not have access."
    ))
}

pub fn team_not_found_or_no_access(team_id: Uuid) -> ApiError {
    ApiError::client_error(format!(
        "Team with id {team_id} does not exist or you do not have access."
    ))
}

pub fn assert_trusted_partner(caller: &Principal) -> ApiResult {
    assert_authenticated(caller)?;

    if !trusted_partner_repository::is_trusted_partner(caller) {
        return Err(ApiError::unauthorized(
            "Only trusted partners can perform this action.".to_string(),
        ));
    }

    Ok(())
}

pub fn assert_has_platform_access(caller: &Principal) -> ApiResult {
    assert_authenticated(caller)?;

    if is_controller(caller) {
        return Ok(());
    }

    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    if !terms_and_conditions_repository::has_accepted_latest_terms_and_conditions(user_id) {
        return Err(ApiError::unauthorized(
            "The latest terms and conditions must be accepted to perform this action.".to_string(),
        ));
    }

    let profile = user_profile_repository::get_user_profile_by_user_id(&user_id)
        .ok_or_else(|| ApiError::unauthorized("User profile not found.".to_string()))?;
    if profile.status == UserStatus::Inactive {
        return Err(ApiError::unauthorized(
            "Inactive users cannot perform this action.".to_string(),
        ));
    }

    Ok(())
}

// Proof that the caller has been resolved to a user, is a member of `org_id`,
// and holds at least the permissions implied by the construction call. The
// only way to obtain an `OrgAuth` is via `require`, which performs the check.
//
// Use `OrgPermissions::EMPTY` as the `needed` argument for read-only endpoints
// that require org membership but no specific capability.
#[derive(Debug, Clone, Copy)]
pub struct OrgAuth {
    user_id: Uuid,
    org_id: Uuid,
    perms: OrgPermissions,
}

impl OrgAuth {
    pub fn require(caller: &Principal, org_id: Uuid, needed: OrgPermissions) -> ApiResult<Self> {
        let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
        Self::require_for_user(user_id, org_id, needed)
    }

    // Same checks as `require`, but skips the principal-to-user lookup
    // because the caller has already resolved it. Used by helpers like
    // `require_team_access` that perform the lookup up front so they can
    // surface resource-specific errors before the membership check runs.
    fn require_for_user(user_id: Uuid, org_id: Uuid, needed: OrgPermissions) -> ApiResult<Self> {
        if !organization_repository::is_user_in_org(user_id, org_id) {
            return Err(ApiError::unauthorized(format!(
                "User with id {user_id} does not belong to org with id {org_id}"
            )));
        }

        let perms = team_repository::aggregate_user_org_permissions(user_id, org_id);
        if !perms.contains(needed) {
            return Err(ApiError::unauthorized(format!(
                "User with id {user_id} lacks required permissions on org \
                 with id {org_id}: {needed}"
            )));
        }

        Ok(Self {
            user_id,
            org_id,
            perms,
        })
    }

    pub fn user_id(&self) -> Uuid {
        self.user_id
    }

    pub fn org_id(&self) -> Uuid {
        self.org_id
    }

    pub fn perms(&self) -> OrgPermissions {
        self.perms
    }

    // Assert that another user is a member of the same org this token
    // authorizes. For use in endpoints that manipulate a peer user
    // (e.g. add_user_to_team) without re-deriving the org_id from the
    // peer's identity.
    pub fn assert_member(&self, target_user_id: Uuid) -> ApiResult {
        if !organization_repository::is_user_in_org(target_user_id, self.org_id) {
            return Err(ApiError::unauthorized(format!(
                "User with id {target_user_id} does not belong to org with id {}",
                self.org_id
            )));
        }
        Ok(())
    }
}

// Proof that the caller has been resolved to a user, has at least one team
// linked to `project_id`, and that team (or the union across their teams)
// holds at least the permissions implied by the construction call. The only
// way to obtain a `ProjectAuth` is via `require`.
//
// Use `ProjectPermissions::EMPTY` as the `needed` argument for read-only
// endpoints that require project access but no specific capability.
#[derive(Debug, Clone, Copy)]
pub struct ProjectAuth {
    #[allow(dead_code)]
    user_id: Uuid,
    project_id: Uuid,
    org_id: Uuid,
    perms: ProjectPermissions,
}

impl ProjectAuth {
    pub fn require(
        caller: &Principal,
        project_id: Uuid,
        needed: ProjectPermissions,
    ) -> ApiResult<Self> {
        let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;

        // Collapse "project does not exist" and "caller is not in project's
        // org" into the same generic error. A caller outside the org must
        // not be able to tell whether a project id is real or learn which
        // org owns it.
        let Project { org_id, .. } = project_repository::get_project(&project_id)
            .ok_or_else(|| project_not_found_or_no_access(project_id))?;

        if !organization_repository::is_user_in_org(user_id, org_id) {
            return Err(project_not_found_or_no_access(project_id));
        }

        let team_ids = team_repository::list_user_team_ids(user_id);
        let (perms, has_link) =
            project_repository::aggregate_team_project_permissions(&team_ids, project_id);

        if !has_link {
            return Err(ApiError::unauthorized(format!(
                "User with id {user_id} does not have access to project \
                 with id {project_id}"
            )));
        }

        if !perms.contains(needed) {
            return Err(ApiError::unauthorized(format!(
                "User with id {user_id} lacks required permissions on project \
                 with id {project_id}: {needed}"
            )));
        }

        Ok(Self {
            user_id,
            project_id,
            org_id,
            perms,
        })
    }

    #[allow(dead_code)]
    pub fn user_id(&self) -> Uuid {
        self.user_id
    }

    pub fn project_id(&self) -> Uuid {
        self.project_id
    }

    pub fn org_id(&self) -> Uuid {
        self.org_id
    }

    #[allow(dead_code)]
    pub fn perms(&self) -> ProjectPermissions {
        self.perms
    }
}

// Resolve a team id and enforce that the caller has org-level access to it
// with the required permissions. Returns the team together with the
// resulting `OrgAuth` (useful when the caller needs both the team record
// and proof of org membership).
//
// Non-existent team ids and teams in orgs the caller can't see both return
// the same generic error so the caller cannot probe for team existence or
// map team ids to orgs.
pub fn require_team_access(
    caller: &Principal,
    team_id: Uuid,
    needed: OrgPermissions,
) -> ApiResult<(Team, OrgAuth)> {
    // Profile check first so that a caller without a profile still gets the
    // canonical no-profile error (they need to sign up, not retry).
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;

    let team =
        team_repository::get_team(team_id).ok_or_else(|| team_not_found_or_no_access(team_id))?;

    if !organization_repository::is_user_in_org(user_id, team.org_id) {
        return Err(team_not_found_or_no_access(team_id));
    }

    let auth = OrgAuth::require_for_user(user_id, team.org_id, needed)?;
    Ok((team, auth))
}

// Invariant: after any mutation that could break it, assert that at least
// one team in the org still holds ORG_ADMIN and has at least one member.
// Without this the org becomes unadministrable.
pub fn assert_org_admin_populated(org_id: Uuid) -> ApiResult {
    if !team_repository::org_admin_is_populated(org_id) {
        return Err(ApiError::client_error(format!(
            "Organization with id {org_id} must retain at least one team with \
             ORG_ADMIN and at least one member."
        )));
    }
    Ok(())
}
