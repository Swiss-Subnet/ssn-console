use crate::data::{
    memory::{
        get_memory, Memory, TERMS_AND_CONDITIONS_RESPONSE_MEMORY_ID,
        TERMS_AND_CONDITIONS_RESPONSE_USER_INDEX_MEMORY_ID,
    },
    TermsAndConditionsResponse, Uuid,
};
use ic_stable_structures::BTreeMap;

pub type TermsAndConditionsResponseMemory = BTreeMap<Uuid, TermsAndConditionsResponse, Memory>;
pub type TermsAndConditionsResponseUserIndexMemory = BTreeMap<(Uuid, Uuid), Uuid, Memory>;

pub fn init_terms_and_conditions_response() -> TermsAndConditionsResponseMemory {
    TermsAndConditionsResponseMemory::init(get_terms_and_conditions_response_memory())
}

pub fn init_terms_and_conditions_response_user_index() -> TermsAndConditionsResponseUserIndexMemory
{
    TermsAndConditionsResponseUserIndexMemory::init(
        get_terms_and_conditions_response_user_index_memory(),
    )
}

pub fn get_terms_and_conditions_response_memory() -> Memory {
    get_memory(TERMS_AND_CONDITIONS_RESPONSE_MEMORY_ID)
}

pub fn get_terms_and_conditions_response_user_index_memory() -> Memory {
    get_memory(TERMS_AND_CONDITIONS_RESPONSE_USER_INDEX_MEMORY_ID)
}
