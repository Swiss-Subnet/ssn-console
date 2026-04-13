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

// Organization invites expire 7 days after creation. Expired invites are
// filtered on read and swept lazily when a new invite is created on the
// same org.
pub const INVITE_TTL_NS: u64 = 7 * 24 * 60 * 60 * 1_000_000_000;

// Maximum number of pending (non-expired) invites a single org may have.
// Bounds per-org storage and prevents invite spam.
pub const MAX_PENDING_INVITES_PER_ORG: usize = 10;
