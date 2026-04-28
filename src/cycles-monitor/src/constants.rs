use canister_utils::NS_PER_S;

pub const MAX_TIME_BETWEEN_SYNCS_NANOS: u64 = 5 * 60 * NS_PER_S; // 5 minutes
pub const MIN_TIME_BETWEEN_SYNCS_NANOS: u64 = 60 * NS_PER_S; // 1 minute

pub const TARGET_RETENTION_PERIOD_NANOS: u64 = 24 * 60 * 60 * NS_PER_S; // 24 hours

/*
 * Size breakdown of Candid serialized DTO:
 * - principal: ~29 bytes
 * - nat64: 8 bytes
 * - nat (x8): ~7-16 bytes each (LEB128 encoded), ~128 bytes total
 * Total estimated size per record is ~165-200 bytes.
 *
 * 2,000,000 bytes / 200 bytes = 10,000 records max.
 * Using 5,000 as a "safe" bet and to leave headroom for instruction limits.
 */
pub const MAX_SNAPSHOTS_PER_RESPONSE: usize = 5_000;
