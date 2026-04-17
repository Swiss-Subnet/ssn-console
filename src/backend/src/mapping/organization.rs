use crate::{
    data::{self},
    dto::{
        ListMyOrganizationsResponse, ListOrgUsersResponse, OrgUser, Organization,
        OrganizationResponse,
    },
};
use canister_utils::Uuid;

pub fn map_list_my_organizations_response(
    organizations: Vec<(Uuid, data::Organization)>,
) -> ListMyOrganizationsResponse {
    organizations
        .into_iter()
        .map(map_organization_response)
        .collect()
}

pub fn map_organization_response((id, org): (Uuid, data::Organization)) -> Organization {
    Organization {
        id: id.to_string(),
        name: org.name,
    }
}

pub fn map_organization_to_response(id: Uuid, org: data::Organization) -> OrganizationResponse {
    OrganizationResponse {
        organization: map_organization_response((id, org)),
    }
}

pub fn map_list_org_users_response(users: Vec<(Uuid, data::UserProfile)>) -> ListOrgUsersResponse {
    users
        .into_iter()
        .map(|(id, profile)| OrgUser {
            id: id.to_string(),
            email: profile.email,
            email_verified: profile.email_verified,
        })
        .collect()
}
