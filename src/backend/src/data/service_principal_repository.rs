use crate::data::{
    memory::{init_service_principal_permissions, ServicePrincipalPermissionsMemory},
    StaffPermissions,
};
use candid::Principal;
use std::cell::RefCell;

pub fn get_service_principal_permissions(principal: &Principal) -> Option<StaffPermissions> {
    with_state(|s| s.service_principal_permissions.get(principal))
}

pub fn set_service_principal_permissions(principal: Principal, permissions: StaffPermissions) {
    mutate_state(|s| {
        s.service_principal_permissions
            .insert(principal, permissions);
    });
}

pub fn remove_service_principal(principal: &Principal) -> bool {
    mutate_state(|s| s.service_principal_permissions.remove(principal).is_some())
}

pub fn list_service_principals() -> Vec<(Principal, StaffPermissions)> {
    with_state(|s| {
        s.service_principal_permissions
            .iter()
            .map(|e| e.into_pair())
            .collect()
    })
}

pub fn metrics_counts() -> Vec<(&'static str, u64)> {
    with_state(|s| {
        vec![(
            "service_principal_permissions",
            s.service_principal_permissions.len(),
        )]
    })
}

struct ServicePrincipalState {
    service_principal_permissions: ServicePrincipalPermissionsMemory,
}

impl Default for ServicePrincipalState {
    fn default() -> Self {
        Self {
            service_principal_permissions: init_service_principal_permissions(),
        }
    }
}

thread_local! {
    static STATE: RefCell<ServicePrincipalState> = RefCell::new(ServicePrincipalState::default());
}

fn with_state<R>(f: impl FnOnce(&ServicePrincipalState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut ServicePrincipalState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
