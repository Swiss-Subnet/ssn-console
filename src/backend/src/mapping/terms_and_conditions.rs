use crate::{
    data::{self, Uuid},
    dto::{
        CreateTermsAndConditionsRequest, CreateTermsAndConditionsResponseRequest,
        GetLatestTermsAndConditionsResponse, TermsAndConditions, TermsAndConditionsResponseType,
    },
};

pub fn map_get_latest_terms_and_conditions_response(
    res: Option<(Uuid, data::TermsAndConditions, bool)>,
) -> GetLatestTermsAndConditionsResponse {
    res.map(|(id, res, has_accepted)| TermsAndConditions {
        id: id.to_string(),
        created_at: res.created_at,
        content: res.content,
        comment: res.comment,
        has_accepted,
    })
}

pub fn map_create_terms_and_conditions_response_request(
    req: CreateTermsAndConditionsResponseRequest,
    user_id: data::Uuid,
    created_at: u64,
) -> Result<data::TermsAndConditionsResponse, String> {
    Ok(data::TermsAndConditionsResponse {
        terms_and_conditions_id: Uuid::try_from(req.terms_and_conditions_id.as_str())?,
        user_id,
        created_at,
        response_type: match req.response_type {
            TermsAndConditionsResponseType::Accept => data::TermsAndConditionsResponseType::Accept,
            TermsAndConditionsResponseType::Reject => data::TermsAndConditionsResponseType::Reject,
        },
    })
}

pub fn map_create_terms_and_conditions_request(
    req: CreateTermsAndConditionsRequest,
    user_id: data::Uuid,
    created_at: u64,
) -> Result<data::TermsAndConditions, String> {
    Ok(data::TermsAndConditions {
        comment: req.comment,
        created_by: user_id,
        created_at,
        content: req.content,
    })
}
