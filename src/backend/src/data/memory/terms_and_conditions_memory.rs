use crate::data::{
    memory::{
        get_memory, Memory, TERMS_AND_CONDITIONS_CREATED_AT_INDEX_MEMORY_ID,
        TERMS_AND_CONDITIONS_MEMORY_ID,
    },
    TermsAndConditions, Uuid,
};
use ic_stable_structures::{BTreeMap, BTreeSet};

pub type TermsAndConditionsMemory = BTreeMap<Uuid, TermsAndConditions, Memory>;
pub type TermsAndConditionsCreatedAtIndexMemory = BTreeSet<(u64, Uuid), Memory>;

pub fn init_terms_and_conditions() -> TermsAndConditionsMemory {
    TermsAndConditionsMemory::init(get_terms_and_conditions_memory())
}

pub fn init_terms_and_conditions_created_at_index_memory() -> TermsAndConditionsCreatedAtIndexMemory
{
    TermsAndConditionsCreatedAtIndexMemory::init(get_terms_and_conditions_created_at_index_memory())
}

pub fn get_terms_and_conditions_memory() -> Memory {
    get_memory(TERMS_AND_CONDITIONS_MEMORY_ID)
}

pub fn get_terms_and_conditions_created_at_index_memory() -> Memory {
    get_memory(TERMS_AND_CONDITIONS_CREATED_AT_INDEX_MEMORY_ID)
}
