mod memory_manager;
use memory_manager::*;

mod canister_memory;
mod terms_and_conditions_memory;
mod terms_and_conditions_response_memory;
mod trusted_partner_memory;
mod user_profile_memory;

pub(super) use canister_memory::*;
pub(super) use terms_and_conditions_memory::*;
pub(super) use terms_and_conditions_response_memory::*;
pub(super) use trusted_partner_memory::*;
pub(super) use user_profile_memory::*;
