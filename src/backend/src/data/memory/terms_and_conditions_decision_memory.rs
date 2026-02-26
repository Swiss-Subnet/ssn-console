use crate::data::{
    memory::{
        get_memory, Memory, TERMS_AND_CONDITIONS_DECISION_MEMORY_ID,
        TERMS_AND_CONDITIONS_DECISION_USER_INDEX_MEMORY_ID,
    },
    TermsAndConditionsDecision,
};
use canister_utils::Uuid;
use ic_stable_structures::BTreeMap;

pub type TermsAndConditionsDecisionMemory = BTreeMap<Uuid, TermsAndConditionsDecision, Memory>;
pub type TermsAndConditionsDecisionUserIndexMemory = BTreeMap<(Uuid, Uuid), Uuid, Memory>;

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
