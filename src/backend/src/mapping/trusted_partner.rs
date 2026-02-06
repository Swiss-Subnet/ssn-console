use crate::{
    data::{self},
    dto::{CreateTrustedPartnerRequest, ListTrustedPartnersResponse, TrustedPartner},
};
use candid::Principal;

pub fn map_list_trusted_partners_response(
    trusted_partners: Vec<(data::Uuid, data::TrustedPartner)>,
) -> ListTrustedPartnersResponse {
    trusted_partners
        .into_iter()
        .map(|(id, trusted_partner)| map_trusted_partner_response(id, trusted_partner))
        .collect()
}

pub fn map_trusted_partner_response(
    id: data::Uuid,
    trusted_partner: data::TrustedPartner,
) -> TrustedPartner {
    TrustedPartner {
        id: id.to_string(),
        name: trusted_partner.name,
        principal_id: trusted_partner.principal.to_string(),
    }
}

pub fn map_create_trusted_partner_request(
    req: CreateTrustedPartnerRequest,
) -> Result<data::TrustedPartner, String> {
    Ok(data::TrustedPartner {
        name: req.name,
        principal: Principal::from_text(&req.principal_id)
            .map_err(|err| format!("Failed to convert principal {}: {}", req.principal_id, err))?,
    })
}
