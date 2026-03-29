use crate::dto::{GetCanisterMetricsRequest, GetCanisterMetricsResponse};
use crate::service;
use canister_utils::ApiResultDto;
use ic_cdk::*;

#[update]
async fn get_canister_metrics(
    req: GetCanisterMetricsRequest,
) -> ApiResultDto<GetCanisterMetricsResponse> {
    service::get_canister_metrics(req).await.into()
}
