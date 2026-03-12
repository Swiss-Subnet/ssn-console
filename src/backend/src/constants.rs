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

/// This number should not exceed the length of the canister output queue, which
/// is currently 500.
pub const MAX_CALLS_PER_BATCH: usize = 490;
