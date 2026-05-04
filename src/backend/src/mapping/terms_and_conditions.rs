use crate::{
    data::{self},
    dto::{
        CreateTermsAndConditionsRequest, GetLatestTermsAndConditionsResponse,
        ListTermsAndConditionsResponse, TermsAndConditions, TermsAndConditionsDecisionType,
        TermsAndConditionsListItem, UpsertTermsAndConditionsDecisionRequest,
    },
};
use canister_utils::{ApiResult, Uuid};

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

pub fn map_list_terms_and_conditions_response(
    items: Vec<(Uuid, data::TermsAndConditions)>,
) -> ListTermsAndConditionsResponse {
    items
        .into_iter()
        .map(|(id, t)| TermsAndConditionsListItem {
            id: id.to_string(),
            content: t.content,
            comment: t.comment,
            created_at: t.created_at,
            created_by: t.created_by.to_string(),
        })
        .collect()
}

pub fn map_create_terms_and_conditions_decision_request(
    req: UpsertTermsAndConditionsDecisionRequest,
    user_id: Uuid,
    created_at: u64,
) -> ApiResult<data::TermsAndConditionsDecision> {
    Ok(data::TermsAndConditionsDecision {
        terms_and_conditions_id: Uuid::try_from(req.terms_and_conditions_id.as_str())?,
        user_id,
        created_at,
        decision_type: match req.decision_type {
            TermsAndConditionsDecisionType::Accept => data::TermsAndConditionsDecisionType::Accept,
            TermsAndConditionsDecisionType::Reject => data::TermsAndConditionsDecisionType::Reject,
        },
    })
}

pub fn map_create_terms_and_conditions_request(
    req: CreateTermsAndConditionsRequest,
    user_id: Uuid,
    created_at: u64,
) -> ApiResult<data::TermsAndConditions> {
    Ok(data::TermsAndConditions {
        comment: req.comment,
        created_by: user_id,
        created_at,
        content: req.content,
    })
}
