use crate::utils::with_random_bytes;
use core::fmt::{Display, Formatter};
use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;
use uuid::{Builder, Uuid as UuidImpl};

const UUID_SIZE: usize = 16;

#[derive(Debug, Clone, Copy, Default, Ord, PartialOrd, PartialEq, Eq)]
pub struct Uuid(UuidImpl);

impl Uuid {
    pub fn new() -> Self {
        with_random_bytes(|bytes: [u8; UUID_SIZE]| Self::from_random_bytes(bytes))
    }

    fn from_random_bytes(bytes: [u8; UUID_SIZE]) -> Self {
        Self(Builder::from_random_bytes(bytes).into_uuid())
    }
}

impl TryFrom<&str> for Uuid {
    type Error = String;

    fn try_from(uuid: &str) -> Result<Uuid, Self::Error> {
        let uuid = UuidImpl::parse_str(uuid)
            .map_err(|_| format!("Failed to parse UUID from string: {}", uuid))?;

        Ok(Self(uuid))
    }
}

impl Display for Uuid {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Storable for Uuid {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Borrowed(self.0.as_bytes())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.into_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(UuidImpl::from_bytes(bytes.into_owned().try_into().unwrap()))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: UUID_SIZE as u32,
        is_fixed_size: true,
    };
}
