use crate::data::{
    memory::{
        init_trusted_partner_principal_index, init_trusted_partners, TrustedPartnerMemory,
        TrustedPartnerPrincipalIndexMemory,
    },
    TrustedPartner, Uuid,
};
use std::cell::RefCell;

pub fn list_trusted_partners() -> Vec<(Uuid, TrustedPartner)> {
    with_state(|s| s.trusted_partners.iter().map(|e| e.into_pair()).collect())
}

pub fn create_trusted_partner(trusted_partner: TrustedPartner) -> Uuid {
    let id = Uuid::new();

    mutate_state(|s| {
        s.trusted_partners.insert(id, trusted_partner.clone());
        s.trusted_partner_principal_index
            .insert(trusted_partner.principal, id);
    });

    id
}

pub fn get_trusted_partner_id_by_principal(principal: &candid::Principal) -> Option<Uuid> {
    with_state(|s| s.trusted_partner_principal_index.get(principal))
}

pub fn is_trusted_partner(principal: &candid::Principal) -> bool {
    get_trusted_partner_id_by_principal(principal).is_some()
}

struct TrustedPartnerState {
    trusted_partners: TrustedPartnerMemory,
    trusted_partner_principal_index: TrustedPartnerPrincipalIndexMemory,
}

impl Default for TrustedPartnerState {
    fn default() -> Self {
        Self {
            trusted_partners: init_trusted_partners(),
            trusted_partner_principal_index: init_trusted_partner_principal_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<TrustedPartnerState> = RefCell::new(TrustedPartnerState::default());
}

fn with_state<R>(f: impl FnOnce(&TrustedPartnerState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut TrustedPartnerState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
