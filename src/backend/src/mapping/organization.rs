use crate::{
    data::{self},
    dto::{ListMyOrganizationsResponse, Organization},
};

pub fn map_list_my_organizations_response(
    organizations: Vec<(data::Uuid, data::Organization)>,
) -> ListMyOrganizationsResponse {
    organizations
        .into_iter()
        .map(map_organization_response)
        .collect()
}

pub fn map_organization_response((id, org): (data::Uuid, data::Organization)) -> Organization {
    Organization {
        id: id.to_string(),
        name: org.name,
    }
}
