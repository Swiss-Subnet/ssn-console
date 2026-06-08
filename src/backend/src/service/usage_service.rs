use crate::{
    data::{usage_repository, BillingMonth, ProjectId, ProjectPermissions},
    dto,
    mapping::usage::{map_canister_usage_dto, map_project_usage_dto},
    service::access_control_service::ProjectAuth,
};
use candid::Principal;
use canister_utils::{get_current_month, get_current_year, ApiResult};

pub fn record_usage(req: dto::RecordUsageRequest) -> ApiResult<dto::RecordUsageResponse> {
    let current_billing_month = get_current_billing_month();

    usage_repository::upsert_canister_usages(current_billing_month, req.usages);

    Ok(dto::RecordUsageResponse {})
}

pub fn get_usage(caller: Principal, req: dto::GetUsageRequest) -> ApiResult<dto::GetUsageResponse> {
    let project_id = ProjectId::try_from(req.project_id.as_str())?;
    let _auth = ProjectAuth::require(&caller, project_id, ProjectPermissions::EMPTY)?;

    let billing_month_str = req.billing_month.unwrap_or_else(get_current_billing_month);
    let billing_month = BillingMonth::try_new(billing_month_str)?;

    let project = map_project_usage_dto(usage_repository::get_project_usage(
        project_id,
        &billing_month,
    ));
    let canisters = usage_repository::list_canister_usages_for_project(project_id, &billing_month)
        .into_iter()
        .map(map_canister_usage_dto)
        .collect();

    Ok(dto::GetUsageResponse { project, canisters })
}

fn get_current_billing_month() -> String {
    let now_nanos = ic_cdk::api::time();
    let now_secs = now_nanos / 1_000_000_000;
    let days_since_epoch = now_secs / 86_400;

    let (current_year, days_since_year_start) = get_current_year(days_since_epoch);
    let current_month = get_current_month(current_year, days_since_year_start);

    format!("{:04}-{:02}", current_year, current_month)
}
