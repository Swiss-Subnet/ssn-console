use crate::{
    constants::{DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT, MIN_PAGINATION_LIMIT},
    data::{
        self, approval_policy_repository, organization_billing_plan_repository,
        organization_repository, project_repository, team_repository, user_profile_repository,
        ApprovalPolicy, OperationType, OrgId, OrgPermissions, Organization, PolicyType,
        StaffPermissions, TeamId,
    },
    dto::{
        CreateOrganizationRequest, CreateOrganizationResponse, DeleteOrganizationRequest,
        DeleteOrganizationResponse, GetOrganizationRequest, GetOrganizationResponse,
        ListMyOrganizationsResponse, ListOrgUsersRequest, ListOrgUsersResponse,
        ListOrganizationsRequest, ListOrganizationsResponse, UpdateOrganizationRequest,
        UpdateOrganizationResponse,
    },
    mapping::{
        map_list_my_organizations_response, map_list_org_users_response,
        map_list_organizations_response, map_organization_to_response, AdminOrgEntry,
    },
    service::access_control_service::{self, OrgAuth},
    validation::OrgName,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult};

const MAX_ORGS_PER_USER: usize = 20;

pub fn list_organizations(
    caller: &Principal,
    req: ListOrganizationsRequest,
) -> ApiResult<ListOrganizationsResponse> {
    access_control_service::assert_staff_perm(caller, StaffPermissions::READ_ALL_ORGS)?;

    let after = req.after.map(|c| OrgId::try_from(c.as_str())).transpose()?;
    let limit = req
        .limit
        .map(u64::from)
        .unwrap_or(DEFAULT_PAGINATION_LIMIT)
        .clamp(MIN_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT) as usize;

    let orgs = organization_repository::list_all_orgs(after, limit);
    // A full page implies there may be more; the last id is the next cursor.
    let next_cursor = (orgs.len() == limit)
        .then(|| orgs.last().map(|(id, _)| *id))
        .flatten();

    let entries: Vec<AdminOrgEntry> = orgs
        .into_iter()
        .map(|(org_id, org)| {
            let tier = organization_billing_plan_repository::get_or_default(org_id).tier;
            let member_count = organization_repository::list_org_users(org_id).len() as u32;
            (org_id, org, tier, member_count)
        })
        .collect();

    Ok(map_list_organizations_response(entries, next_cursor))
}

pub fn list_my_organizations(caller: &Principal) -> ApiResult<ListMyOrganizationsResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;

    let organizations = organization_repository::list_user_orgs(user_id)
        .into_iter()
        .map(|(org_id, org)| {
            let perms = team_repository::aggregate_user_org_permissions(user_id, org_id);
            (org_id, org, perms)
        })
        .collect();
    Ok(map_list_my_organizations_response(organizations))
}

pub fn list_org_users(
    caller: &Principal,
    req: ListOrgUsersRequest,
) -> ApiResult<ListOrgUsersResponse> {
    let org_id = OrgId::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::EMPTY)?;

    // Team membership and admin status leak organizational structure, so
    // only callers who can manage members see them. Other members still
    // get the list of who is in the org, just without per-user details.
    let can_see_details = auth.perms().contains(OrgPermissions::MEMBER_MANAGE);

    // Resolve every team in the org once, so per-user enrichment is lookups.
    let org_teams: std::collections::BTreeMap<TeamId, (data::Team, OrgPermissions)> =
        if can_see_details {
            team_repository::list_org_teams_with_permissions(org_id)
                .into_iter()
                .map(|(team_id, team, perms)| (team_id, (team, perms)))
                .collect()
        } else {
            std::collections::BTreeMap::new()
        };

    let users = organization_repository::list_org_users(org_id)
        .into_iter()
        .filter_map(|user_id| {
            user_profile_repository::get_user_profile_by_user_id(&user_id)
                .map(|profile| (user_id, profile))
        })
        .map(|(user_id, profile)| {
            if !can_see_details {
                return (user_id, profile, Vec::new(), false);
            }
            let team_ids = team_repository::list_user_teams_in_org(user_id, org_id);
            let teams: Vec<(TeamId, data::Team)> = team_ids
                .iter()
                .filter_map(|tid| org_teams.get(tid).map(|(t, _)| (*tid, t.clone())))
                .collect();
            let is_org_admin = team_ids.iter().any(|tid| {
                org_teams
                    .get(tid)
                    .map(|(_, p)| p.contains(OrgPermissions::ORG_ADMIN))
                    .unwrap_or(false)
            });
            (user_id, profile, teams, is_org_admin)
        })
        .collect::<Vec<_>>();

    Ok(map_list_org_users_response(users))
}

pub fn create_organization(
    caller: &Principal,
    req: CreateOrganizationRequest,
) -> ApiResult<CreateOrganizationResponse> {
    let user_id = user_profile_repository::assert_user_id_by_principal(caller)?;
    let name = OrgName::try_from(req.name)?;

    if organization_repository::has_at_least_n_user_orgs(user_id, MAX_ORGS_PER_USER) {
        return Err(ApiError::client_error(format!(
            "Cannot create more than {MAX_ORGS_PER_USER} organizations."
        )));
    }

    let org = Organization {
        name: name.into_inner(),
    };
    let org_id = organization_repository::create_org(user_id, org.clone());
    let team_id = team_repository::add_default_team(user_id, org_id);
    let project_id = project_repository::add_default_project(team_id, org_id);

    for op in [
        OperationType::CreateCanister,
        OperationType::AddCanisterController,
    ] {
        approval_policy_repository::upsert_approval_policy(
            project_id,
            op,
            ApprovalPolicy {
                policy_type: PolicyType::AutoApprove,
            },
        );
    }

    // The caller is the sole member of the freshly-created default team,
    // which was created with OrgPermissions::ALL. Aggregation is equivalent,
    // but a direct constant keeps the bootstrap predictable.
    Ok(map_organization_to_response(
        org_id,
        org,
        OrgPermissions::ALL,
    ))
}

pub fn get_organization(
    caller: &Principal,
    req: GetOrganizationRequest,
) -> ApiResult<GetOrganizationResponse> {
    let org_id = OrgId::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::EMPTY)?;

    let org =
        organization_repository::get_org(auth.org_id()).expect("org must exist after OrgAuth");

    Ok(map_organization_to_response(
        auth.org_id(),
        org,
        auth.perms(),
    ))
}

pub fn update_organization(
    caller: &Principal,
    req: UpdateOrganizationRequest,
) -> ApiResult<UpdateOrganizationResponse> {
    let org_id = OrgId::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::ORG_ADMIN)?;
    let name = OrgName::try_from(req.name)?;

    let org = Organization {
        name: name.into_inner(),
    };
    organization_repository::update_org(auth.org_id(), org.clone())?;

    Ok(map_organization_to_response(
        auth.org_id(),
        org,
        auth.perms(),
    ))
}

// Deleting an org requires all projects to be removed first. Since
// create_organization always creates a default project, the user must first
// delete the default project (which itself requires PROJECT_ADMIN on the
// project) before delete_organization can succeed.
pub fn delete_organization(
    caller: &Principal,
    req: DeleteOrganizationRequest,
) -> ApiResult<DeleteOrganizationResponse> {
    let org_id = OrgId::try_from(req.org_id.as_str())?;
    let auth = OrgAuth::require(caller, org_id, OrgPermissions::ORG_ADMIN)?;

    if !organization_repository::has_at_least_n_user_orgs(auth.user_id(), 2) {
        return Err(ApiError::client_error(
            "Cannot delete your last organization.".to_string(),
        ));
    }

    if project_repository::org_has_projects(auth.org_id()) {
        return Err(ApiError::client_error(
            "Cannot delete an organization that still has projects. Remove all projects first."
                .to_string(),
        ));
    }

    // Safe to delete: no projects remain, so no canisters, approval
    // policies, or proposals are linked to this org.
    team_repository::delete_org_teams(auth.org_id());
    organization_repository::delete_org(auth.org_id())?;
    // Idempotent: orgs that never had a persisted plan (lazy-default
    // case) leave no row to remove; this just guards against a stale
    // plan record outliving its org.
    organization_billing_plan_repository::delete_plan(auth.org_id());

    Ok(DeleteOrganizationResponse {})
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::user_profile_repository::create_user_profile;
    use crate::data::{OrganizationBillingPlan, UserId, UserProfile, UserStatus};
    use crate::dto::PlanTier;

    fn principal(byte: u8) -> Principal {
        let mut bytes = [0u8; 29];
        bytes[28] = byte;
        Principal::from_slice(&bytes)
    }

    fn staff(byte: u8, perms: StaffPermissions) -> Principal {
        let p = principal(byte);
        create_user_profile(
            p,
            UserProfile {
                status: UserStatus::Active,
                staff_permissions: Some(perms),
                ..UserProfile::default()
            },
        );
        p
    }

    fn req(after: Option<OrgId>, limit: Option<u32>) -> ListOrganizationsRequest {
        ListOrganizationsRequest {
            after: after.map(|id| id.to_string()),
            limit,
        }
    }

    #[test]
    fn list_organizations_requires_read_all_orgs() {
        let support_only = staff(10, StaffPermissions::EMPTY);
        let err = list_organizations(&support_only, req(None, None)).unwrap_err();
        assert!(err.message().contains("staff permissions"));

        let outsider = principal(11);
        assert!(list_organizations(&outsider, req(None, None)).is_err());
    }

    #[test]
    fn list_organizations_reports_tier_and_member_count() {
        let owner = UserId::new();
        let org_id = organization_repository::create_org(
            owner,
            Organization {
                name: "Acme".to_string(),
            },
        );
        organization_repository::add_user_to_org(UserId::new(), org_id);
        organization_billing_plan_repository::set_plan(
            org_id,
            OrganizationBillingPlan::pro_snapshot(),
        );

        let admin = staff(12, StaffPermissions::READ_ALL_ORGS);
        let res = list_organizations(&admin, req(None, Some(50))).unwrap();

        let entry = res
            .organizations
            .iter()
            .find(|o| o.id == org_id.to_string())
            .expect("seeded org must be listed");
        assert!(matches!(entry.tier, PlanTier::Pro));
        assert_eq!(entry.member_count, 2);
    }

    #[test]
    fn list_organizations_sets_next_cursor_only_when_page_is_full() {
        let admin = staff(13, StaffPermissions::READ_ALL_ORGS);
        for i in 0..3 {
            organization_repository::create_org(
                UserId::new(),
                Organization {
                    name: format!("paged-{i}"),
                },
            );
        }

        let full = list_organizations(&admin, req(None, Some(1))).unwrap();
        assert_eq!(full.organizations.len(), 1);
        assert!(full.next_cursor.is_some());

        // Walk to the end; the final short page must clear the cursor.
        let mut cursor = full.next_cursor.clone();
        loop {
            let page = list_organizations(
                &admin,
                ListOrganizationsRequest {
                    after: cursor.clone(),
                    limit: Some(50),
                },
            )
            .unwrap();
            if page.next_cursor.is_none() {
                break;
            }
            cursor = page.next_cursor;
        }
    }
}
