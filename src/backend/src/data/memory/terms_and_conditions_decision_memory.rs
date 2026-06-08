use crate::data::{
    memory::{
        get_memory, Memory, TERMS_AND_CONDITIONS_DECISION_MEMORY_ID,
        TERMS_AND_CONDITIONS_DECISION_USER_INDEX_MEMORY_ID,
    },
    TermsAndConditionsDecision, TermsAndConditionsDecisionId, TermsAndConditionsId, UserId,
};
use ic_stable_structures::BTreeMap;

pub type TermsAndConditionsDecisionMemory =
    BTreeMap<TermsAndConditionsDecisionId, TermsAndConditionsDecision, Memory>;
pub type TermsAndConditionsDecisionUserIndexMemory =
    BTreeMap<(UserId, TermsAndConditionsId), TermsAndConditionsDecisionId, Memory>;

pub fn init_terms_and_conditions_decision() -> TermsAndConditionsDecisionMemory {
    TermsAndConditionsDecisionMemory::init(get_terms_and_conditions_decision_memory())
}

pub fn init_terms_and_conditions_decision_user_index() -> TermsAndConditionsDecisionUserIndexMemory
{
    TermsAndConditionsDecisionUserIndexMemory::init(
        get_terms_and_conditions_decision_user_index_memory(),
    )
}

pub fn get_terms_and_conditions_decision_memory() -> Memory {
    get_memory(TERMS_AND_CONDITIONS_DECISION_MEMORY_ID)
}

pub fn get_terms_and_conditions_decision_user_index_memory() -> Memory {
    get_memory(TERMS_AND_CONDITIONS_DECISION_USER_INDEX_MEMORY_ID)
}
