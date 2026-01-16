use crate::{
    data::trusted_partner_repository,
    dto::{CreateTrustedPartnerRequest, CreateTrustedPartnerResponse, ListTrustedPartnersResponse},
    mapping::{map_create_trusted_partner_request, map_list_trusted_partners_response},
};

pub fn list_trusted_partners() -> ListTrustedPartnersResponse {
    let trusted_partners = trusted_partner_repository::list_trusted_partners();
    map_list_trusted_partners_response(trusted_partners)
}

pub fn create_trusted_partner(
    req: CreateTrustedPartnerRequest,
) -> Result<CreateTrustedPartnerResponse, String> {
    let req = map_create_trusted_partner_request(req)?;

    if let Some(id) =
        trusted_partner_repository::get_trusted_partner_id_by_principal(&req.principal)
    {
        return Err(format!(
            "Trusted partner for principal {} already exists with id {}",
            req.principal, id
        ));
    }

    let id = trusted_partner_repository::create_trusted_partner(req.clone());

    Ok(CreateTrustedPartnerResponse {
        id: id.to_string(),
        name: req.name,
        principal_id: req.principal.to_string(),
    })
}
