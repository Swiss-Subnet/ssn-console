use crate::data::{
    memory::{get_memory, Memory, SERVICE_PRINCIPAL_PERMISSIONS_MEMORY_ID},
    StaffPermissions,
};
use candid::Principal;
use ic_stable_structures::BTreeMap;

pub type ServicePrincipalPermissionsMemory = BTreeMap<Principal, StaffPermissions, Memory>;

pub fn init_service_principal_permissions() -> ServicePrincipalPermissionsMemory {
    ServicePrincipalPermissionsMemory::init(get_memory(SERVICE_PRINCIPAL_PERMISSIONS_MEMORY_ID))
}
