use crate::data::{
    memory::{
        init_trusted_partner_principal_index, init_trusted_partners, TrustedPartnerMemory,
        TrustedPartnerPrincipalIndexMemory,
    },
    TrustedPartner, TrustedPartnerId,
};
use candid::Principal;
use std::cell::RefCell;

pub fn list_trusted_partners() -> Vec<(TrustedPartnerId, TrustedPartner)> {
    with_state(|s| s.trusted_partners.iter().map(|e| e.into_pair()).collect())
}

pub fn create_trusted_partner(trusted_partner: TrustedPartner) -> TrustedPartnerId {
    let id = TrustedPartnerId::new();

    mutate_state(|s| {
        s.trusted_partners.insert(id, trusted_partner.clone());
        s.trusted_partner_principal_index
            .insert(trusted_partner.principal, id);
    });

    id
}

pub fn get_trusted_partner_id_by_principal(principal: &Principal) -> Option<TrustedPartnerId> {
    with_state(|s| s.trusted_partner_principal_index.get(principal))
}

pub fn is_trusted_partner(principal: &Principal) -> bool {
    get_trusted_partner_id_by_principal(principal).is_some()
}

pub fn metrics_counts() -> Vec<(&'static str, u64)> {
    with_state(|s| {
        vec![
            ("trusted_partners", s.trusted_partners.len()),
            (
                "trusted_partner_principal_index",
                s.trusted_partner_principal_index.len(),
            ),
        ]
    })
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
