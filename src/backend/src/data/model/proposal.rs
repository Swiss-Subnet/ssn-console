use crate::data::{ProjectId, UserId};
use candid::Principal;
use canister_utils::{deserialize_cbor, serialize_cbor, Id};
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

pub type ProposalId = Id<Proposal>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub project_id: ProjectId,
    // `#[serde(default)]` so proposals serialized before proposer_id was
    // introduced still deserialize post-upgrade. Legacy rows decode as the
    // nil UUID; `migrate_proposals_proposer_id` normalizes on-disk CBOR and
    // the FE maps nil to "—".
    #[serde(default)]
    pub proposer_id: UserId,
    pub status: ProposalStatus,
    pub operation: ProposalOperation,
    #[serde(default)]
    pub created_at_nanos: Option<u64>,
    #[serde(default)]
    pub updated_at_nanos: Option<u64>,
}

// Decode shape for rows persisted before approvals were re-keyed from Principal
// to UserId, whose `status` no longer matches ProposalStatus. `status` accepts
// any CBOR and is discarded; from_bytes resets such proposals to Open.
#[derive(Deserialize)]
struct LegacyProposal {
    project_id: ProjectId,
    proposer_id: UserId,
    #[allow(dead_code)]
    status: ciborium::value::Value,
    operation: ProposalOperation,
    created_at_nanos: Option<u64>,
    updated_at_nanos: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalStatus {
    Open,
    PendingApproval {
        threshold: u32,
        approvers: Vec<UserId>,
        votes: Vec<(UserId, Vote)>,
    },
    Rejected,
    Cancelled,
    Executing,
    Executed,
    Failed(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Vote {
    Approve,
    Reject,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalOperation {
    CreateCanister,
    AddCanisterController {
        canister_id: Principal,
        controller_id: Principal,
    },
}

impl Storable for Proposal {
    fn into_bytes(self) -> Vec<u8> {
        serialize_cbor(&self)
    }

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(serialize_cbor(&self))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        if let Ok(proposal) = ciborium::de::from_reader::<Proposal, _>(&*bytes) {
            return proposal;
        }
        // Legacy principal-keyed PendingApproval: reset to Open, drop votes.
        let legacy: LegacyProposal = deserialize_cbor(&bytes);
        Proposal {
            project_id: legacy.project_id,
            proposer_id: legacy.proposer_id,
            status: ProposalStatus::Open,
            operation: legacy.operation,
            created_at_nanos: legacy.created_at_nanos,
            updated_at_nanos: legacy.updated_at_nanos,
        }
    }

    const BOUND: Bound = Bound::Unbounded;
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Principal;

    // Serialize-side mirror of the pre-re-key Proposal: principal-keyed
    // PendingApproval. Variant name matches the current model so the CBOR tag
    // lines up; only the payload type differs.
    #[derive(Serialize)]
    enum LegacyStatus {
        PendingApproval {
            threshold: u32,
            approvers: Vec<Principal>,
            votes: Vec<(Principal, Vote)>,
        },
    }

    #[derive(Serialize)]
    struct LegacyRow {
        project_id: ProjectId,
        proposer_id: UserId,
        status: LegacyStatus,
        operation: ProposalOperation,
        created_at_nanos: Option<u64>,
        updated_at_nanos: Option<u64>,
    }

    #[test]
    fn legacy_principal_keyed_pending_approval_resets_to_open() {
        let project_id = ProjectId::new();
        let proposer_id = UserId::new();
        let p = Principal::anonymous();
        let bytes = serialize_cbor(&LegacyRow {
            project_id,
            proposer_id,
            status: LegacyStatus::PendingApproval {
                threshold: 2,
                approvers: vec![p],
                votes: vec![(p, Vote::Approve)],
            },
            operation: ProposalOperation::CreateCanister,
            created_at_nanos: Some(7),
            updated_at_nanos: Some(8),
        });

        let decoded = Proposal::from_bytes(Cow::Owned(bytes));
        assert!(matches!(decoded.status, ProposalStatus::Open));
        assert_eq!(decoded.project_id, project_id);
        assert_eq!(decoded.proposer_id, proposer_id);
        assert_eq!(decoded.created_at_nanos, Some(7));
    }

    #[test]
    fn user_keyed_pending_approval_round_trips() {
        let proposal = Proposal {
            project_id: ProjectId::new(),
            proposer_id: UserId::new(),
            status: ProposalStatus::PendingApproval {
                threshold: 2,
                approvers: vec![UserId::new()],
                votes: vec![(UserId::new(), Vote::Approve)],
            },
            operation: ProposalOperation::CreateCanister,
            created_at_nanos: Some(1),
            updated_at_nanos: Some(2),
        };
        let decoded = Proposal::from_bytes(proposal.to_bytes());
        assert!(matches!(
            decoded.status,
            ProposalStatus::PendingApproval { threshold: 2, .. }
        ));
    }
}
