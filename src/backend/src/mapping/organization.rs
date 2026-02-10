use crate::{
    data::{self},
    dto::{ListMyOrganizationsResponse, Organization},
};

pub fn map_list_my_organizations_response(
    organizations: Vec<(data::Uuid, data::Organization)>,
) -> ListMyOrganizationsResponse {
    organizations
        .into_iter()
        .map(|(org_id, org)| map_organization_response(org_id, org))
        .collect()
}

pub fn map_organization_response(org_id: data::Uuid, org: data::Organization) -> Organization {
    Organization {
        id: org_id.to_string(),
        name: org.name,
    }
}
