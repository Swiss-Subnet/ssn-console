use crate::{
    data,
    dto::{
        ApprovalPolicy, ListProjectApprovalPoliciesResponse, OperationType, PolicyType,
        UpsertApprovalPolicyRequest,
    },
};
use canister_utils::{ApiError, ApiResult, Uuid};

pub fn map_list_project_approval_policies_response(
    policies: Vec<(Uuid, data::OperationType, data::ApprovalPolicy)>,
) -> ListProjectApprovalPoliciesResponse {
    ListProjectApprovalPoliciesResponse {
        approval_policies: policies
            .into_iter()
            .map(map_approval_policy_response)
            .collect(),
    }
}

pub fn map_approval_policy_response(
    (id, operation_type, policy): (Uuid, data::OperationType, data::ApprovalPolicy),
) -> ApprovalPolicy {
    ApprovalPolicy {
        id: id.to_string(),
        operation_type: map_operation_type_out(operation_type),
        policy_type: map_policy_type_out(policy.policy_type),
    }
}

pub fn map_upsert_approval_policy_request(
    req: UpsertApprovalPolicyRequest,
) -> ApiResult<(Uuid, data::OperationType, data::ApprovalPolicy)> {
    let project_id = Uuid::try_from(req.project_id.as_str())?;
    let operation_type = map_operation_type_in(req.operation_type);
    let policy_type = map_policy_type_in(req.policy_type)?;
    Ok((
        project_id,
        operation_type,
        data::ApprovalPolicy { policy_type },
    ))
}

fn map_operation_type_out(op: data::OperationType) -> OperationType {
    match op {
        data::OperationType::CreateCanister => OperationType::CreateCanister {},
        data::OperationType::AddCanisterController => OperationType::AddCanisterController {},
        // Noop is an internal sentinel used for index-range bounds and is
        // never persisted as a real policy's operation_type.
        data::OperationType::Noop => OperationType::CreateCanister {},
    }
}

fn map_operation_type_in(op: OperationType) -> data::OperationType {
    match op {
        OperationType::CreateCanister {} => data::OperationType::CreateCanister,
        OperationType::AddCanisterController {} => data::OperationType::AddCanisterController,
    }
}

fn map_policy_type_out(policy: data::PolicyType) -> PolicyType {
    match policy {
        data::PolicyType::AutoApprove => PolicyType::AutoApprove {},
        data::PolicyType::FixedQuorum { threshold } => PolicyType::FixedQuorum { threshold },
    }
}

fn map_policy_type_in(policy: PolicyType) -> ApiResult<data::PolicyType> {
    match policy {
        PolicyType::AutoApprove {} => Ok(data::PolicyType::AutoApprove),
        PolicyType::FixedQuorum { threshold } => {
            if threshold < 1 {
                return Err(ApiError::client_error(
                    "FixedQuorum threshold must be at least 1.".to_string(),
                ));
            }
            Ok(data::PolicyType::FixedQuorum { threshold })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use canister_utils::Uuid;

    #[test]
    fn upsert_request_rejects_zero_threshold() {
        let err = map_upsert_approval_policy_request(UpsertApprovalPolicyRequest {
            project_id: Uuid::new().to_string(),
            operation_type: OperationType::CreateCanister {},
            policy_type: PolicyType::FixedQuorum { threshold: 0 },
        })
        .unwrap_err();
        assert!(err.message().contains("at least 1"));
    }

    #[test]
    fn upsert_request_accepts_valid_fixed_quorum() {
        let result = map_upsert_approval_policy_request(UpsertApprovalPolicyRequest {
            project_id: Uuid::new().to_string(),
            operation_type: OperationType::AddCanisterController {},
            policy_type: PolicyType::FixedQuorum { threshold: 2 },
        })
        .unwrap();
        assert_eq!(
            result.2.policy_type,
            data::PolicyType::FixedQuorum { threshold: 2 }
        );
    }
}
