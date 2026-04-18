// The minimum allowed limit for pagination
pub const MIN_PAGINATION_LIMIT: u64 = 1;

// The maximum allowed limit for pagination
pub const MAX_PAGINATION_LIMIT: u64 = 50;

// The default limit used for pagination, if unspecified
pub const DEFAULT_PAGINATION_LIMIT: u64 = 10;

// The minimum allowed page for pagination
pub const MIN_PAGINATION_PAGE: u64 = 1;

// The default page used for pagination, if unspecified
pub const DEFAULT_PAGINATION_PAGE: u64 = 1;

/// Number of changes to request from the management canister in each call
pub const CHANGES_TO_REQUEST: Option<u64> = Some(200);

pub const MAX_TIME_BETWEEN_SYNCS_NANOS: u64 = 300_000_000_000; // 5 minutes

pub const MIN_TIME_BETWEEN_SYNCS_NANOS: u64 = 60_000_000_000; // 1 minute
