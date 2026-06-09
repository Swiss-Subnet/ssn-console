use crate::{
    data::StaffPermissions,
    dto::{GetMetricsRequest, GetMetricsResponse},
    service::{access_control_service, metrics_service},
};
use canister_utils::ApiResultDto;
use ic_cdk::{api::msg_caller, *};

// Aggregate sizes of stable memory regions plus entry counts per stable
// structure. Read-only, returns no record contents, intended for the
// off-chain Prometheus proxy and on-call operators investigating capacity
// or anomalies. Gated on StaffPermissions::READ_METRICS so a scraping
// identity can be granted exactly this and nothing else; canister
// controllers are auto-allowed via assert_staff_perm.
#[query]
fn admin_get_metrics(_req: GetMetricsRequest) -> ApiResultDto<GetMetricsResponse> {
    let caller = msg_caller();
    if let Err(err) =
        access_control_service::assert_staff_perm(&caller, StaffPermissions::READ_METRICS)
    {
        return ApiResultDto::Err(err);
    }

    ApiResultDto::Ok(metrics_service::collect_metrics())
}
