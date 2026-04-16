use ic_cdk::call::{CallRejected, RejectCode};

pub fn is_destination_invalid(rejected: &CallRejected) -> bool {
    rejected.reject_code() == Ok(RejectCode::DestinationInvalid)
}
