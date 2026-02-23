use serde::{de::DeserializeOwned, Serialize};

pub fn serialize_cbor<T: Serialize>(value: &T) -> Vec<u8> {
    let mut buffer = Vec::new();
    ciborium::into_writer(value, &mut buffer).unwrap();
    buffer
}

pub fn deserialize_cbor<T: DeserializeOwned>(bytes: &[u8]) -> T {
    ciborium::de::from_reader(bytes).unwrap()
}
