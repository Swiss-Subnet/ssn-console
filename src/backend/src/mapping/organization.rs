use crate::{
    data::{self, PlanTier as ModelPlanTier, TeamId},
    dto::{
        AdminOrganization, ListMyOrganizationsResponse, ListOrgUsersResponse,
        ListOrganizationsResponse, OrgUser, Organization, OrganizationResponse, PlanTier,
    },
    mapping::{map_org_permissions, map_team},
};
use canister_utils::Uuid;

fn map_plan_tier(tier: ModelPlanTier) -> PlanTier {
    match tier {
        ModelPlanTier::Free => PlanTier::Free,
        ModelPlanTier::Pro => PlanTier::Pro,
        ModelPlanTier::Enterprise => PlanTier::Enterprise,
    }
}

pub type AdminOrgEntry = (Uuid, data::Organization, ModelPlanTier, u32);

pub fn map_list_organizations_response(
    entries: Vec<AdminOrgEntry>,
    next_cursor: Option<Uuid>,
) -> ListOrganizationsResponse {
    ListOrganizationsResponse {
        organizations: entries
            .into_iter()
            .map(|(id, org, tier, member_count)| AdminOrganization {
                id: id.to_string(),
                name: org.name,
                tier: map_plan_tier(tier),
                member_count,
            })
            .collect(),
        next_cursor: next_cursor.map(|id| id.to_string()),
    }
}

pub fn map_list_my_organizations_response(
    organizations: Vec<(Uuid, data::Organization, data::OrgPermissions)>,
) -> ListMyOrganizationsResponse {
    organizations
        .into_iter()
        .map(map_organization_response)
        .collect()
}

pub fn map_organization_response(
    (id, org, your_permissions): (Uuid, data::Organization, data::OrgPermissions),
) -> Organization {
    Organization {
        id: id.to_string(),
        name: org.name,
        your_permissions: map_org_permissions(your_permissions),
    }
}

pub fn map_organization_to_response(
    id: Uuid,
    org: data::Organization,
    your_permissions: data::OrgPermissions,
) -> OrganizationResponse {
    OrganizationResponse {
        organization: map_organization_response((id, org, your_permissions)),
    }
}

pub type OrgUserEntry = (Uuid, data::UserProfile, Vec<(TeamId, data::Team)>, bool);

pub fn map_list_org_users_response(users: Vec<OrgUserEntry>) -> ListOrgUsersResponse {
    users
        .into_iter()
        .map(|(id, profile, teams, is_org_admin)| OrgUser {
            id: id.to_string(),
            email: profile.email,
            email_verified: profile.email_verified,
            teams: teams
                .into_iter()
                .map(|(team_id, team)| map_team(team_id, team))
                .collect(),
            is_org_admin,
        })
        .collect()
}
