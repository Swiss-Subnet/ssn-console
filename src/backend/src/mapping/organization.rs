use crate::{
    data::{self},
    dto::{ListMyOrganizationsResponse, Organization},
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
