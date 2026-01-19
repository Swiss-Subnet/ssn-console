use crate::data::{
    memory::{
        get_memory, Memory, TRUSTED_PARTNERS_MEMORY_ID, TRUSTED_PARTNER_PRINCIPAL_INDEX_MEMORY_ID,
    },
    TrustedPartner, Uuid,
};
use candid::Principal;
use ic_stable_structures::BTreeMap;

pub type TrustedPartnerMemory = BTreeMap<Uuid, TrustedPartner, Memory>;
pub type TrustedPartnerPrincipalIndexMemory = BTreeMap<Principal, Uuid, Memory>;

pub fn init_trusted_partners() -> TrustedPartnerMemory {
    TrustedPartnerMemory::init(get_trusted_partners_memory())
}

pub fn init_trusted_partner_principal_index() -> TrustedPartnerPrincipalIndexMemory {
    TrustedPartnerPrincipalIndexMemory::init(get_trusted_partners_principal_index_memory())
}

fn get_trusted_partners_memory() -> Memory {
    get_memory(TRUSTED_PARTNERS_MEMORY_ID)
}

fn get_trusted_partners_principal_index_memory() -> Memory {
    get_memory(TRUSTED_PARTNER_PRINCIPAL_INDEX_MEMORY_ID)
}
