/// This number should not exceed the length of the canister output queue, which
/// is currently 500.
pub const MAX_CALLS_PER_BATCH: usize = 490;

// the number of nanoseconds in a second
pub const NS_PER_S: u64 = 1_000_000_000;
