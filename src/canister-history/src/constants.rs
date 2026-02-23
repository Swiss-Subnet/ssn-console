// The maximum allowed limit for pagination
pub const MAX_LIMIT: u64 = 50;

// The default limit used for pagination, if unspecified
pub const DEFAULT_LIMIT: u64 = 10;

// The default page used for pagination, if unspecified
pub const DEFAULT_PAGE: u64 = 0;

/// This number should not exceed the length of the canister output queue, which
/// is currently 500.
pub const CALLS_PER_BATCH: usize = 490;
