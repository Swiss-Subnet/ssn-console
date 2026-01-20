use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::management_canister::CanisterSettings;

pub type BlockIndex = Nat;

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CreateCanisterArgs {
    pub from_subaccount: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
    pub amount: Nat,
    pub creation_args: Option<CmcCreateCanisterArgs>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CmcCreateCanisterArgs {
    pub settings: Option<CanisterSettings>,
    pub subnet_selection: Option<SubnetSelection>,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct CreateCanisterSuccess {
    pub block_id: BlockIndex,
    pub canister_id: Principal,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum CreateCanisterError {
    InsufficientFunds {
        balance: u64,
    },
    TooOld,
    CreatedInFuture {
        ledger_time: u64,
    },
    TemporarilyUnavailable,
    Duplicate {
        duplicate_of: u64,
        canister_id: Option<Principal>,
    },
    FailedToCreate {
        fee_block: Option<BlockIndex>,
        refund_block: Option<BlockIndex>,
        error: String,
    },
    GenericError {
        message: String,
        error_code: u64,
    },
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum CreateCanisterResult {
    Ok(CreateCanisterSuccess),
    Err(CreateCanisterError),
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum SubnetSelection {
    /// Choose a specific subnet
    Subnet { subnet: Principal },
    /// Choose a random subnet that satisfies the specified properties
    Filter(SubnetFilter),
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct SubnetFilter {
    pub subnet_type: Option<String>,
}
