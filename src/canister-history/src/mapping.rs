use crate::{
    dto,
    model::{
        CanisterChange, CanisterChangeDetails, CanisterChangeOrigin, CodeDeploymentMode,
        SnapshotSource,
    },
};
use candid::Principal;
use canister_utils::Uuid;
use ic_cdk::management_canister;

pub fn map_canister_change_response((id, change): (Uuid, CanisterChange)) -> dto::CanisterChange {
    dto::CanisterChange {
        id: id.to_string(),
        canister_id: change.canister_id,
        timestamp_nanos: change.timestamp_nanos,
        canister_version: change.canister_version,
        origin: match change.origin {
            CanisterChangeOrigin::FromCanister {
                canister_id,
                canister_version,
            } => Some(dto::CanisterChangeOrigin::FromCanister {
                canister_id,
                canister_version,
            }),
            CanisterChangeOrigin::FromUser { user_id } => {
                Some(dto::CanisterChangeOrigin::FromUser { user_id })
            }
        },

        details: change.details.clone().map(|details| match details {
            CanisterChangeDetails::Creation {
                controllers,
                environment_variables_hash,
            } => dto::CanisterChangeDetails::Creation {
                controllers,
                environment_variables_hash,
            },
            CanisterChangeDetails::CodeUninstall => dto::CanisterChangeDetails::CodeUninstall {},
            CanisterChangeDetails::CodeDeployment { mode, module_hash } => {
                dto::CanisterChangeDetails::CodeDeployment {
                    mode: match mode {
                        CodeDeploymentMode::Install => Some(dto::CodeDeploymentMode::Install {}),
                        CodeDeploymentMode::Reinstall => {
                            Some(dto::CodeDeploymentMode::Reinstall {})
                        }
                        CodeDeploymentMode::Upgrade => Some(dto::CodeDeploymentMode::Upgrade {}),
                    },
                    module_hash,
                }
            }
            CanisterChangeDetails::LoadSnapshot {
                canister_version,
                from_canister_id,
                snapshot_id,
                source,
                taken_at_timestamp,
            } => dto::CanisterChangeDetails::LoadSnapshot {
                from_canister_id,
                snapshot_id,
                canister_version,
                taken_at_timestamp,
                source: match source {
                    SnapshotSource::TakenFromCanister => {
                        Some(dto::SnapshotSource::TakenFromCanister {})
                    }
                    SnapshotSource::MetadataUpload => Some(dto::SnapshotSource::MetadataUpload {}),
                },
            },
            CanisterChangeDetails::ControllersChange { controllers } => {
                dto::CanisterChangeDetails::ControllersChange { controllers }
            }
        }),
    }
}

pub fn map_management_canister_change_response(
    canister_id: Principal,
    change: management_canister::Change,
) -> CanisterChange {
    CanisterChange {
        canister_id,
        timestamp_nanos: change.timestamp_nanos,
        canister_version: change.canister_version,
        origin: match change.origin {
            management_canister::ChangeOrigin::FromCanister(
                management_canister::FromCanisterRecord {
                    canister_id,
                    canister_version,
                },
            ) => CanisterChangeOrigin::FromCanister {
                canister_id,
                canister_version,
            },
            management_canister::ChangeOrigin::FromUser(management_canister::FromUserRecord {
                user_id,
            }) => CanisterChangeOrigin::FromUser { user_id },
        },
        details: change.details.clone().map(|details| match details {
            management_canister::ChangeDetails::Creation(management_canister::CreationRecord {
                controllers,
                environment_variables_hash,
            }) => CanisterChangeDetails::Creation {
                controllers,
                environment_variables_hash,
            },
            management_canister::ChangeDetails::CodeUninstall => {
                CanisterChangeDetails::CodeUninstall
            }
            management_canister::ChangeDetails::CodeDeployment(
                management_canister::CodeDeploymentRecord { mode, module_hash },
            ) => CanisterChangeDetails::CodeDeployment {
                mode: match mode {
                    management_canister::CodeDeploymentMode::Install => CodeDeploymentMode::Install,
                    management_canister::CodeDeploymentMode::Reinstall => {
                        CodeDeploymentMode::Reinstall
                    }
                    management_canister::CodeDeploymentMode::Upgrade => CodeDeploymentMode::Upgrade,
                },
                module_hash,
            },
            management_canister::ChangeDetails::LoadSnapshot(
                management_canister::LoadSnapshotRecord {
                    canister_version,
                    from_canister_id,
                    snapshot_id,
                    source,
                    taken_at_timestamp,
                },
            ) => CanisterChangeDetails::LoadSnapshot {
                from_canister_id,
                snapshot_id,
                canister_version,
                taken_at_timestamp,
                source: match source {
                    management_canister::SnapshotSource::TakenFromCanister(_) => {
                        SnapshotSource::TakenFromCanister
                    }
                    management_canister::SnapshotSource::MetadataUpload(_) => {
                        SnapshotSource::MetadataUpload
                    }
                },
            },
            management_canister::ChangeDetails::ControllersChange(
                management_canister::ControllersChangeRecord { controllers },
            ) => CanisterChangeDetails::ControllersChange { controllers },
        }),
    }
}
