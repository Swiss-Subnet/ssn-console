use crate::data::{
    memory::{
        init_terms_and_conditions, init_terms_and_conditions_created_at_index_memory,
        init_terms_and_conditions_decision, init_terms_and_conditions_decision_user_index,
        TermsAndConditionsCreatedAtIndexMemory, TermsAndConditionsDecisionMemory,
        TermsAndConditionsDecisionUserIndexMemory, TermsAndConditionsMemory,
    },
    TermsAndConditions, TermsAndConditionsDecision, TermsAndConditionsDecisionType,
};
use canister_utils::{ApiError, ApiResult, Uuid};
use std::cell::RefCell;

// Returns versions ordered ascending by created_at. ic_stable_structures'
// BTreeSet iter is forward-only (no DoubleEndedIterator), so callers that
// want newest-first reverse on their end.
pub fn list_terms_and_conditions() -> Vec<(Uuid, TermsAndConditions)> {
    with_state(|s| {
        s.terms_and_conditions_created_at_index
            .iter()
            .filter_map(|(_, id)| s.terms_and_conditions.get(&id).map(|t| (id, t)))
            .collect()
    })
}

pub fn get_latest_terms_and_conditions(user_id: Uuid) -> Option<(Uuid, TermsAndConditions, bool)> {
    let latest_id = get_latest_terms_and_condition_id()?;

    let has_accepted = has_accepted_terms_and_conditions(user_id, latest_id);

    with_state(|s| {
        s.terms_and_conditions
            .get(&latest_id)
            .map(|terms_and_conditions| (latest_id, terms_and_conditions, has_accepted))
    })
}

pub fn has_accepted_latest_terms_and_conditions(user_id: Uuid) -> bool {
    let Some(latest_id) = get_latest_terms_and_condition_id() else {
        return true;
    };

    has_accepted_terms_and_conditions(user_id, latest_id)
}

fn get_latest_terms_and_condition_id() -> Option<Uuid> {
    with_state(|s| {
        s.terms_and_conditions_created_at_index
            .last()
            .map(|(_, id)| id)
    })
}

fn has_accepted_terms_and_conditions(user_id: Uuid, terms_and_conditions_id: Uuid) -> bool {
    with_state(|s| {
        s.terms_and_conditions_decisions_user_index
            .get(&(user_id, terms_and_conditions_id))
            .and_then(|response_id| s.terms_and_conditions_decisions.get(&response_id))
            .map(|response| response.decision_type == TermsAndConditionsDecisionType::Accept)
            .unwrap_or(false)
    })
}

pub fn upsert_terms_and_conditions_decision(
    terms_and_conditions_decision: TermsAndConditionsDecision,
) -> ApiResult<Uuid> {
    mutate_state(|s| {
        if !s
            .terms_and_conditions
            .contains_key(&terms_and_conditions_decision.terms_and_conditions_id)
        {
            return Err(ApiError::client_error(format!(
                "Terms and conditions with id {} does not exist.",
                terms_and_conditions_decision.terms_and_conditions_id
            )));
        }

        let id = s
            .terms_and_conditions_decisions_user_index
            .get(&(
                terms_and_conditions_decision.user_id,
                terms_and_conditions_decision.terms_and_conditions_id,
            ))
            .unwrap_or_else(Uuid::new);

        s.terms_and_conditions_decisions
            .insert(id, terms_and_conditions_decision.clone());

        s.terms_and_conditions_decisions_user_index.insert(
            (
                terms_and_conditions_decision.user_id,
                terms_and_conditions_decision.terms_and_conditions_id,
            ),
            id,
        );

        Ok(id)
    })
}

pub fn create_terms_and_conditions(terms_and_conditions: TermsAndConditions) -> Uuid {
    let id = Uuid::new();

    mutate_state(|s| {
        s.terms_and_conditions
            .insert(id, terms_and_conditions.clone());
        s.terms_and_conditions_created_at_index
            .insert((terms_and_conditions.created_at, id))
    });

    id
}

struct TermsAndConditionsState {
    terms_and_conditions: TermsAndConditionsMemory,
    terms_and_conditions_created_at_index: TermsAndConditionsCreatedAtIndexMemory,
    terms_and_conditions_decisions: TermsAndConditionsDecisionMemory,
    terms_and_conditions_decisions_user_index: TermsAndConditionsDecisionUserIndexMemory,
}

impl Default for TermsAndConditionsState {
    fn default() -> Self {
        Self {
            terms_and_conditions: init_terms_and_conditions(),
            terms_and_conditions_created_at_index:
                init_terms_and_conditions_created_at_index_memory(),
            terms_and_conditions_decisions: init_terms_and_conditions_decision(),
            terms_and_conditions_decisions_user_index:
                init_terms_and_conditions_decision_user_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<TermsAndConditionsState> = RefCell::new(TermsAndConditionsState::default());
}

fn with_state<R>(f: impl FnOnce(&TermsAndConditionsState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut TermsAndConditionsState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seed(created_at: u64) -> Uuid {
        create_terms_and_conditions(TermsAndConditions {
            content: format!("content-{created_at}"),
            comment: format!("comment-{created_at}"),
            created_at,
            created_by: Uuid::new(),
        })
    }

    #[test]
    fn list_returns_versions_in_ascending_created_at_order() {
        let middle = seed(200);
        let oldest = seed(100);
        let newest = seed(300);

        let ids: Vec<Uuid> = list_terms_and_conditions()
            .into_iter()
            .map(|(id, _)| id)
            .collect();

        assert_eq!(ids, vec![oldest, middle, newest]);
    }
}
