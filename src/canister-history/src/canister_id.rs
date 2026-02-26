use candid::Principal;

const U64_LENGTH: usize = std::mem::size_of::<u64>();

// The number of bytes in a canister id principal is the bytes for a u64,
// plus one additional reserved byte and another byte for the id class.
const CANISTER_ID_LENGTH: usize = U64_LENGTH + 2;

#[derive(Debug, PartialEq, Clone, Copy)]
pub struct CanisterId(Principal);

impl CanisterId {}

impl TryFrom<Principal> for CanisterId {
    type Error = String;

    fn try_from(value: Principal) -> Result<Self, Self::Error> {
        let byte_len = value.as_slice().len();

        if byte_len != CANISTER_ID_LENGTH {
            return Err(format!("Principal must have length {CANISTER_ID_LENGTH} to be a valid canister id, but it has length: {byte_len}"));
        }

        Ok(Self(value))
    }
}

impl From<CanisterId> for Principal {
    fn from(val: CanisterId) -> Self {
        val.0
    }
}

impl From<u64> for CanisterId {
    fn from(value: u64) -> Self {
        let value_bytes: [u8; U64_LENGTH] = value.to_be_bytes();

        let mut principal = [0_u8; CANISTER_ID_LENGTH];
        principal[..U64_LENGTH].copy_from_slice(&value_bytes[..U64_LENGTH]);

        // Even though not defined in the interface spec, add another 0x1 to the array
        // to create a sub category that could be used in future.
        principal[U64_LENGTH] = 0x01;

        // Add the opaque id class
        principal[U64_LENGTH + 1] = 0x01;

        Self(Principal::from_slice(&principal))
    }
}

impl From<CanisterId> for u64 {
    fn from(value: CanisterId) -> Self {
        let value_bytes = value.0.as_slice();

        let mut principal = [0; U64_LENGTH];
        principal[..U64_LENGTH].copy_from_slice(&value_bytes[..U64_LENGTH]);

        u64::from_be_bytes(principal)
    }
}

pub struct CanisterIdRange {
    current: CanisterId,
    end: CanisterId,
    finished: bool,
}

impl CanisterIdRange {
    pub fn new((start, end): (CanisterId, CanisterId)) -> Self {
        Self {
            current: start,
            end,
            finished: false,
        }
    }
}

impl Iterator for CanisterIdRange {
    type Item = CanisterId;

    fn next(&mut self) -> Option<Self::Item> {
        if self.finished {
            return None;
        }

        if self.current == self.end {
            self.finished = true;
            return Some(self.current);
        }

        let current_uint = u64::from(self.current);
        let Some(next) = current_uint.checked_add(1).map(Into::into) else {
            self.finished = true;
            return Some(self.current);
        };

        let current = self.current;
        self.current = next;

        Some(current)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_principal_range() {
        let start = CanisterId::from(0);
        let end = CanisterId::from(0);
        let mut range = CanisterIdRange::new((start, end));

        assert_eq!(range.current, start);
        assert_eq!(range.end, end);
        assert!(!range.finished);

        let first = range.next();
        assert!(first.is_some());
        assert_eq!(first.unwrap(), start);

        let second = range.next();
        assert!(second.is_none());
    }

    #[test]
    fn test_two_principal_range() {
        let start = CanisterId::from(0);
        let end = CanisterId::from(1);
        let range = CanisterIdRange::new((start, end));

        let canister_ids = range.into_iter().collect::<Vec<_>>();

        assert_eq!(canister_ids.len(), 2);
        assert_eq!(canister_ids[0], start);
        assert_eq!(canister_ids[1], end);
    }

    #[test]
    fn test_large_principal_range() {
        let first_id = 10;
        let range_size = 100_000;

        let start = CanisterId::from(first_id);
        let end = CanisterId::from(first_id + range_size - 1);

        let range = CanisterIdRange::new((start, end));

        let mut id_offset = 0;
        for canister_id in range {
            assert_eq!(canister_id, CanisterId::from(first_id + id_offset));
            id_offset += 1;
        }

        assert_eq!(id_offset, range_size);
    }

    #[test]
    fn test_canister_id_from_large_principal() {
        let id: u128 = (u64::MAX as u128) + 1;
        let id_bytes = id.to_be_bytes();

        let mut principal = [0_u8; CANISTER_ID_LENGTH + 1];
        principal[..U64_LENGTH + 1].copy_from_slice(&id_bytes[..U64_LENGTH + 1]);
        principal[U64_LENGTH + 1] = 0x01;
        principal[U64_LENGTH + 2] = 0x01;

        let result = CanisterId::try_from(Principal::from_slice(&principal)).unwrap_err();
        assert_eq!(result, format!("Principal must have length {CANISTER_ID_LENGTH} to be a valid canister id, but it has length: {}", CANISTER_ID_LENGTH + 1))
    }

    #[test]
    fn test_canister_id_from_small_principal() {
        const U32_LENGTH: usize = std::mem::size_of::<u32>();
        let id = u32::MAX;
        let id_bytes = id.to_be_bytes();

        let mut principal = [0_u8; U32_LENGTH + 2];
        principal[..U32_LENGTH].copy_from_slice(&id_bytes[..U32_LENGTH]);
        principal[U32_LENGTH] = 0x01;
        principal[U32_LENGTH + 1] = 0x01;

        let result = CanisterId::try_from(Principal::from_slice(&principal)).unwrap_err();
        assert_eq!(result, format!("Principal must have length {CANISTER_ID_LENGTH} to be a valid canister id, but it has length: {}", U32_LENGTH + 2))
    }
}
