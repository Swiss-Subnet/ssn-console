use crate::{
    data,
    dto::{Canister, CreateCanisterResponse, ListCanistersResponse, ListMyCanistersResponse},
};

pub fn map_list_canisters_response(
    canisters: Vec<(data::Uuid, data::Canister)>,
) -> ListCanistersResponse {
    canisters
        .into_iter()
        .map(|(id, canister)| map_canister_response(id, canister))
        .collect()
}

pub fn map_list_my_canisters_response(
    canisters: Vec<(data::Uuid, data::Canister)>,
) -> ListMyCanistersResponse {
    canisters
        .into_iter()
        .map(|(id, canister)| map_canister_response(id, canister))
        .collect()
}

pub fn map_create_my_canister_response(
    id: data::Uuid,
    canister: data::Canister,
) -> CreateCanisterResponse {
    map_canister_response(id, canister)
}

pub fn map_canister_response(id: data::Uuid, canister: data::Canister) -> Canister {
    Canister {
        id: id.to_string(),
        principal_id: canister.principal.to_string(),
    }
}
