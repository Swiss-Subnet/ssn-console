use crate::data::{
    memory::{
        init_terms_and_conditions, init_terms_and_conditions_created_at_index_memory,
        init_terms_and_conditions_response, init_terms_and_conditions_response_user_index,
        TermsAndConditionsCreatedAtIndexMemory, TermsAndConditionsMemory,
        TermsAndConditionsResponseMemory, TermsAndConditionsResponseUserIndexMemory,
    },
    TermsAndConditions, TermsAndConditionsResponse, TermsAndConditionsResponseType, Uuid,
};
use std::cell::RefCell;

pub fn get_latest_terms_and_conditions(user_id: Uuid) -> Option<(Uuid, TermsAndConditions, bool)> {
    let Some(latest_id) = get_latest_terms_and_condition_id() else {
        return None;
    };

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
        s.terms_and_conditions_responses_user_index
            .get(&(user_id, terms_and_conditions_id))
            .and_then(|response_id| s.terms_and_conditions_responses.get(&response_id))
            .map(|response| response.response_type == TermsAndConditionsResponseType::Accept)
            .unwrap_or(false)
    })
}

pub fn upsert_terms_and_conditions_response(
    terms_and_conditions_response: TermsAndConditionsResponse,
) -> Result<Uuid, String> {
    mutate_state(|s| {
        if !s
            .terms_and_conditions
            .contains_key(&terms_and_conditions_response.terms_and_conditions_id)
        {
            return Err(format!(
                "Terms and conditions with id {} does not exist",
                terms_and_conditions_response.terms_and_conditions_id
            ));
        }

        let id = s
            .terms_and_conditions_responses_user_index
            .get(&(
                terms_and_conditions_response.user_id,
                terms_and_conditions_response.terms_and_conditions_id,
            ))
            .unwrap_or_else(|| Uuid::new());

        s.terms_and_conditions_responses
            .insert(id, terms_and_conditions_response.clone());

        s.terms_and_conditions_responses_user_index.insert(
            (
                terms_and_conditions_response.user_id,
                terms_and_conditions_response.terms_and_conditions_id,
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
    terms_and_conditions_responses: TermsAndConditionsResponseMemory,
    terms_and_conditions_responses_user_index: TermsAndConditionsResponseUserIndexMemory,
}

impl Default for TermsAndConditionsState {
    fn default() -> Self {
        Self {
            terms_and_conditions: init_terms_and_conditions(),
            terms_and_conditions_created_at_index:
                init_terms_and_conditions_created_at_index_memory(),
            terms_and_conditions_responses: init_terms_and_conditions_response(),
            terms_and_conditions_responses_user_index:
                init_terms_and_conditions_response_user_index(),
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
