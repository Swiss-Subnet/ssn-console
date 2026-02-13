use crate::data::{
    memory::{
        get_memory, Memory, APPROVAL_POLICY_MEMORY_ID,
        PROJECT_OPERATION_TYPE_APPROVAL_POLICY_INDEX_MEMORY_ID,
    },
    ApprovalPolicy, OperationType, Uuid,
};
use ic_stable_structures::BTreeMap;

pub type ApprovalPolicyMemory = BTreeMap<Uuid, ApprovalPolicy, Memory>;
pub type ProjectOperationTypeApprovalPolicyIndexMemory =
    BTreeMap<(Uuid, OperationType), Uuid, Memory>;

pub fn init_approval_policies() -> ApprovalPolicyMemory {
    ApprovalPolicyMemory::init(get_approval_policy_memory())
}

pub fn init_project_operation_type_approval_policy_index(
) -> ProjectOperationTypeApprovalPolicyIndexMemory {
    ProjectOperationTypeApprovalPolicyIndexMemory::init(
        get_project_operation_type_approval_policy_index_memory(),
    )
}

fn get_approval_policy_memory() -> Memory {
    get_memory(APPROVAL_POLICY_MEMORY_ID)
}

fn get_project_operation_type_approval_policy_index_memory() -> Memory {
    get_memory(PROJECT_OPERATION_TYPE_APPROVAL_POLICY_INDEX_MEMORY_ID)
}
