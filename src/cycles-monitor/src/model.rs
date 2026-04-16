use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CyclesMetricsSnapshot {
    pub memory: u128,
    pub compute_allocation: u128,
    pub ingress_induction: u128,
    pub instructions: u128,
    pub request_and_response_transmission: u128,
    pub uninstall: u128,
    pub http_outcalls: u128,
    pub burned_cycles: u128,
}

impl Storable for CyclesMetricsSnapshot {
    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().into_owned()
    }

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let mut bytes = Vec::with_capacity(128);
        bytes.extend_from_slice(&self.memory.to_le_bytes());
        bytes.extend_from_slice(&self.compute_allocation.to_le_bytes());
        bytes.extend_from_slice(&self.ingress_induction.to_le_bytes());
        bytes.extend_from_slice(&self.instructions.to_le_bytes());
        bytes.extend_from_slice(&self.request_and_response_transmission.to_le_bytes());
        bytes.extend_from_slice(&self.uninstall.to_le_bytes());
        bytes.extend_from_slice(&self.http_outcalls.to_le_bytes());
        bytes.extend_from_slice(&self.burned_cycles.to_le_bytes());
        Cow::Owned(bytes)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut buff = [0u8; 16];

        buff.copy_from_slice(&bytes[0..16]);
        let memory = u128::from_le_bytes(buff);

        buff.copy_from_slice(&bytes[16..32]);
        let compute_allocation = u128::from_le_bytes(buff);

        buff.copy_from_slice(&bytes[32..48]);
        let ingress_induction = u128::from_le_bytes(buff);

        buff.copy_from_slice(&bytes[48..64]);
        let instructions = u128::from_le_bytes(buff);

        buff.copy_from_slice(&bytes[64..80]);
        let request_and_response_transmission = u128::from_le_bytes(buff);

        buff.copy_from_slice(&bytes[80..96]);
        let uninstall = u128::from_le_bytes(buff);

        buff.copy_from_slice(&bytes[96..112]);
        let http_outcalls = u128::from_le_bytes(buff);

        buff.copy_from_slice(&bytes[112..128]);
        let burned_cycles = u128::from_le_bytes(buff);

        Self {
            memory,
            compute_allocation,
            ingress_induction,
            instructions,
            request_and_response_transmission,
            uninstall,
            http_outcalls,
            burned_cycles,
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 8 * size_of::<u128>() as u32,
        is_fixed_size: true,
    };
}
