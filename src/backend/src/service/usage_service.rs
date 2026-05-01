use crate::{
    data::{canister_repository, usage_repository, ProjectPermissions},
    dto,
    mapping::usage::{map_canister_usage_dto, map_project_usage_dto},
    service::access_control_service::ProjectAuth,
};
use candid::Principal;
use canister_utils::{ApiResult, Uuid};

pub fn upsert_usage(req: dto::UpsertUsageRequest) -> ApiResult<dto::UpsertUsageResponse> {
    let current_billing_month = get_current_billing_month();

    usage_repository::upsert_canister_usages(current_billing_month, req.usages);

    Ok(dto::UpsertUsageResponse {})
}

pub fn get_usage(caller: Principal, req: dto::GetUsageRequest) -> ApiResult<dto::GetUsageResponse> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let _auth = ProjectAuth::require(&caller, project_id, ProjectPermissions::EMPTY)?;

    let billing_month = req.billing_month.unwrap_or_else(get_current_billing_month);

    let project = map_project_usage_dto(usage_repository::get_project_usage(
        project_id,
        &billing_month,
    ));
    let canisters = canister_repository::list_canisters_by_project_including_deleted(project_id)
        .into_iter()
        .map(|(_, canister)| {
            map_canister_usage_dto(usage_repository::get_canister_usage(
                canister.principal,
                &billing_month,
            ))
        })
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

fn get_current_year(days_since_epoch: u64) -> (u64, u64) {
    let mut days_since_epoch = days_since_epoch;
    let mut year = 1970;

    loop {
        let is_leap = is_leap_year(year);
        let days_in_year = if is_leap { 366 } else { 365 };

        if days_since_epoch >= days_in_year {
            days_since_epoch -= days_in_year;
            year += 1;
        } else {
            break;
        }
    }

    (year, days_since_epoch)
}

fn get_current_month(current_year: u64, days_since_year_start: u64) -> u64 {
    let mut days_since_year_start = days_since_year_start;

    let is_leap = is_leap_year(current_year);
    let days_in_month = [
        31,                            // Jan
        if is_leap { 29 } else { 28 }, // Feb
        31,                            // Mar
        30,                            // Apr
        31,                            // May
        30,                            // Jun
        31,                            // Jul
        31,                            // Aug
        30,                            // Sep
        31,                            // Oct
        30,                            // Nov
        31,                            // Dec
    ];

    let mut month = 1;
    for &dim in days_in_month.iter() {
        if days_since_year_start >= dim {
            days_since_year_start -= dim;
            month += 1;
        } else {
            break;
        }
    }

    month
}

fn is_leap_year(year: u64) -> bool {
    (year.is_multiple_of(4) && !year.is_multiple_of(100)) || year.is_multiple_of(400)
}
