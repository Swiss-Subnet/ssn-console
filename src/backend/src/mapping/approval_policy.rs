use crate::{
    data,
    dto::{ApprovalPolicy, ListProjectApprovalPoliciesResponse},
};

pub fn map_list_project_approval_policies_response(
    policies: Vec<(data::Uuid, data::OperationType, data::ApprovalPolicy)>,
) -> ListProjectApprovalPoliciesResponse {
    policies
        .into_iter()
        .map(map_approval_policy_response)
        .collect()
}

pub fn map_approval_policy_response(
    (id, operation_type, policy): (data::Uuid, data::OperationType, data::ApprovalPolicy),
) -> ApprovalPolicy {
    ApprovalPolicy {
        id: id.to_string(),
        operation_type: format!("{:?}", operation_type),
        policy_type: format!("{:?}", policy.policy_type),
    }
}
