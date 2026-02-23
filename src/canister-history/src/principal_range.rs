use candid::Principal;

pub struct PrincipalRange {
    current: Principal,
    end: Principal,
    finished: bool,
}

impl PrincipalRange {
    pub fn new((start, end): (Principal, Principal)) -> Self {
        Self {
            current: start,
            end,
            finished: false,
        }
    }
}

impl Iterator for PrincipalRange {
    type Item = Principal;

    fn next(&mut self) -> Option<Self::Item> {
        if self.finished {
            return None;
        }

        let result = self.current;

        if self.current == self.end {
            self.finished = true;
            return Some(result);
        }

        let next_u64 = principal_to_u64(self.current).saturating_add(1);
        let next_principal = u64_to_principal(next_u64);

        self.current = next_principal;

        Some(result)
    }
}

const U64_LENGTH: usize = std::mem::size_of::<u64>();

fn principal_to_u64(principal: Principal) -> u64 {
    let principal_bytes = principal.as_slice();

    let mut principal = [0; U64_LENGTH];
    principal[..U64_LENGTH].copy_from_slice(&principal_bytes[..U64_LENGTH]);

    u64::from_be_bytes(principal)
}

fn u64_to_principal(principal: u64) -> Principal {
    let principal_bytes: [u8; U64_LENGTH] = principal.to_be_bytes();

    let mut principal = [0_u8; U64_LENGTH + 2];
    principal[..U64_LENGTH].copy_from_slice(&principal_bytes[..U64_LENGTH]);

    // Even though not defined in the interface spec, add another 0x1 to the array
    // to create a sub category that could be used in future.
    principal[U64_LENGTH] = 0x01;

    // Add the opaque id class
    principal[U64_LENGTH + 1] = 0x01;

    Principal::from_slice(&principal)
}
