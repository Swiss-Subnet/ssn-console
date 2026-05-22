use candid::{CandidType, Nat};
use serde::Deserialize;

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetMetricsRequest {}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct GetMetricsResponse {
    pub entry_counts: Vec<EntryCount>,
    pub memory_regions: Vec<MemoryRegion>,
    pub total_stable_pages: u64,
    pub total_stable_bytes: u64,
    pub cycles_balance: Nat,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct EntryCount {
    pub name: String,
    pub count: u64,
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct MemoryRegion {
    pub name: String,
    pub memory_id: u8,
    pub pages: u64,
    pub bytes: u64,
}
