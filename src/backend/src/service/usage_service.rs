use crate::{
    data::{usage_repository, ProjectPermissions},
    dto, env,
    mapping::usage::{map_usage_data, map_usage_dto},
    service::access_control_service::ProjectAuth,
};
use candid::Principal;
use canister_utils::{ApiError, ApiResult, Uuid};
use ic_cdk::api::time;

pub fn upsert_usage(caller: Principal, req: dto::UpsertUsageRequest) -> ApiResult<()> {
    let expected_principal = env::get_public_key_principal();

    if caller != expected_principal {
        return Err(ApiError::unauthorized("Unauthorized".to_string()));
    }

    usage_repository::upsert_canister_usage(map_usage_data(req.usage));
    Ok(())
}

pub fn get_usage(
    caller: Principal,
    req: dto::GetUsageRequest,
) -> ApiResult<Vec<dto::CanisterUsage>> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let month = req.month.unwrap_or_else(get_current_month);

    let _auth = ProjectAuth::require(&caller, project_id, ProjectPermissions::EMPTY)?;

    let usage =
        crate::data::canister_repository::list_canisters_by_project_including_deleted(project_id)
            .into_iter()
            .filter_map(|(_, canister)| {
                usage_repository::get_canister_usage(canister.principal, month).map(map_usage_dto)
            })
            .collect();

    Ok(usage)
}

fn get_current_month() -> u32 {
    let nanos = time();
    let secs = nanos / 1_000_000_000;

    // Crude calculation for YYYYMM.
    // 1970-01-01 is the epoch.
    let year = 1970 + (secs / 31_536_000);
    let month = 1 + ((secs % 31_536_000) / 2_628_000); // roughly
    (year as u32) * 100 + (month as u32)
}
