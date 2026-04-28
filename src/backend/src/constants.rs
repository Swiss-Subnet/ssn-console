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

// Organization invites expire 7 days after creation. Expired invites are
// filtered on read and swept lazily when a new invite is created on the
// same org.
pub const INVITE_TTL_NS: u64 = 7 * 24 * 60 * 60 * 1_000_000_000;

// Maximum number of pending (non-expired) invites a single org may have.
// Bounds per-org storage and prevents invite spam.
pub const MAX_PENDING_INVITES_PER_ORG: usize = 10;

// Principal of the Swiss subnet. Linked canisters are expected to reside here,
// but the link flow does not yet enforce this — see TODO in
// canister_service::link_my_canister.
#[allow(dead_code)]
pub const SWISS_SUBNET_ID: &str = "3zsyy-cnoqf-tvlun-ymf55-tkpca-ox7uw-kfxoh-7khwq-2gz43-wafem-lqe";
