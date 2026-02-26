use super::{
    memory::{
        init_approval_policies, init_project_operation_type_approval_policy_index,
        ApprovalPolicyMemory, ProjectOperationTypeApprovalPolicyIndexMemory,
    },
    ApprovalPolicy, OperationType,
};
use canister_utils::Uuid;
use std::cell::RefCell;

pub fn list_project_approval_policies(
    project_id: Uuid,
) -> Vec<(Uuid, OperationType, ApprovalPolicy)> {
    with_state(|s| {
        s.project_operation_type_approval_policy_index
            .range((project_id, OperationType::min())..=(project_id, OperationType::max()))
            .map(|val| val.into_pair())
            .filter_map(|((_, operation_type), policy_id)| {
                s.approval_policies
                    .get(&policy_id)
                    .map(|policy| (policy_id, operation_type, policy))
            })
            .collect()
    })
}

pub fn get_project_approval_policy_by_operation_type(
    project_id: Uuid,
    operation_type: OperationType,
) -> Option<ApprovalPolicy> {
    with_state(|s| {
        s.project_operation_type_approval_policy_index
            .get(&(project_id, operation_type))
            .and_then(|id| s.approval_policies.get(&id))
    })
}

pub fn upsert_approval_policy(
    project_id: Uuid,
    operation_type: OperationType,
    approval_policy: ApprovalPolicy,
) -> Uuid {
    mutate_state(|s| {
        let policy_id = s
            .project_operation_type_approval_policy_index
            .get(&(project_id, operation_type))
            .unwrap_or_else(Uuid::new);

        s.approval_policies.insert(policy_id, approval_policy);
        s.project_operation_type_approval_policy_index
            .insert((project_id, operation_type), policy_id);

        policy_id
    })
}

struct ApprovalPolicyState {
    approval_policies: ApprovalPolicyMemory,
    project_operation_type_approval_policy_index: ProjectOperationTypeApprovalPolicyIndexMemory,
}

impl Default for ApprovalPolicyState {
    fn default() -> Self {
        Self {
            approval_policies: init_approval_policies(),
            project_operation_type_approval_policy_index:
                init_project_operation_type_approval_policy_index(),
        }
    }
}

thread_local! {
    static STATE: RefCell<ApprovalPolicyState> = RefCell::new(ApprovalPolicyState::default());
}

fn with_state<R>(f: impl FnOnce(&ApprovalPolicyState) -> R) -> R {
    STATE.with(|s| f(&s.borrow()))
}

fn mutate_state<R>(f: impl FnOnce(&mut ApprovalPolicyState) -> R) -> R {
    STATE.with(|s| f(&mut s.borrow_mut()))
}
