// Black-box PocketIC harness. All interaction goes through the candid surface
// via the typed call helpers below: the harness never reaches into canister
// state, because the point is to test the deployed interface, not the
// implementation. A baseline snapshot is taken after seeding (see Fixture) so
// each test restores to a known world instead of reinstalling.

use candid::{decode_one, encode_one, CandidType, Principal};
use ic_management_canister_types::{CanisterSettings, EnvironmentVariable};
use pocket_ic::common::rest::{CanisterCyclesCostSchedule, ExtendedSubnetConfigSet, SubnetSpec};
use pocket_ic::{PocketIc, PocketIcBuilder};
use serde::Deserialize;
use std::sync::OnceLock;

// Canonical local-dev env the backend wasm reads at init via load_runtime_env.
// PUBLIC_KEY is the public RFC 8032 Test 1 vector from .env.local; the others
// mirror the local install (icp.yaml + set-canister-env.sh). No real canister-
// history canister exists in this suite, so its id is just a valid principal.
const PUBLIC_KEY: &str = "MCowBQYDK2VwAyEA11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=";
const AUTH_SERVICE_URL: &str = "http://localhost:3000";
const CANISTER_HISTORY_ID: &str = "aaaaa-aa";

fn wasm_bytes() -> &'static [u8] {
    static WASM: OnceLock<Vec<u8>> = OnceLock::new();
    WASM.get_or_init(|| {
        let path = std::env::var("BACKEND_WASM").expect(
            "BACKEND_WASM env var not set. Run the suite via `just test-backend-e2e`, which \
             builds backend.wasm and points BACKEND_WASM at it.",
        );
        std::fs::read(&path).unwrap_or_else(|e| panic!("failed to read BACKEND_WASM ({path}): {e}"))
    })
}

pub struct Env {
    pub pic: PocketIc,
    pub backend: Principal,
    pub controller: Principal,
    baseline: std::cell::RefCell<Option<Vec<u8>>>,
}

impl Env {
    pub fn new() -> Self {
        // Cycles-free application subnet so a balance can't mask a code path
        // that wrongly depends on one.
        let config = ExtendedSubnetConfigSet {
            application: vec![
                SubnetSpec::default().with_cost_schedule(CanisterCyclesCostSchedule::Free)
            ],
            ..Default::default()
        };
        let pic = PocketIcBuilder::new_with_config(config).build();

        let controller = CONTROLLER;
        let settings = CanisterSettings {
            controllers: Some(vec![controller]),
            environment_variables: Some(vec![
                EnvironmentVariable {
                    name: "PUBLIC_KEY".to_string(),
                    value: PUBLIC_KEY.to_string(),
                },
                EnvironmentVariable {
                    name: "AUTH_SERVICE_URL".to_string(),
                    value: AUTH_SERVICE_URL.to_string(),
                },
                EnvironmentVariable {
                    name: "CANISTER_HISTORY_ID".to_string(),
                    value: CANISTER_HISTORY_ID.to_string(),
                },
            ]),
            ..Default::default()
        };
        let backend = pic.create_canister_with_settings(Some(controller), Some(settings));
        pic.install_canister(
            backend,
            wasm_bytes().to_vec(),
            encode_one(()).unwrap(),
            Some(controller),
        );

        Env {
            pic,
            backend,
            controller,
            baseline: std::cell::RefCell::new(None),
        }
    }

    // Snapshot the current state as the baseline that reset() restores to.
    pub fn snapshot_baseline(&self) {
        let snapshot = self
            .pic
            .take_canister_snapshot(self.backend, Some(self.controller), None)
            .expect("take baseline snapshot");
        *self.baseline.borrow_mut() = Some(snapshot.id);
    }

    // Restore the baseline taken by snapshot_baseline().
    pub fn reset(&self) {
        let id = self
            .baseline
            .borrow()
            .clone()
            .expect("snapshot_baseline() must be called before reset()");
        self.pic
            .load_canister_snapshot(self.backend, Some(self.controller), id)
            .expect("restore baseline snapshot");
    }

    // Update call with a single candid argument. Returns the decoded response
    // type, typically a generated `variant { Ok; Err }`.
    pub fn update<Req, Resp>(&self, sender: Principal, method: &str, req: Req) -> Resp
    where
        Req: CandidType,
        Resp: CandidType + for<'de> Deserialize<'de>,
    {
        let bytes = self
            .pic
            .update_call(self.backend, sender, method, encode_one(req).unwrap())
            .unwrap_or_else(|e| panic!("{method} rejected by replica: {e:?}"));
        decode_one(&bytes)
            .unwrap_or_else(|e| panic!("{method} response did not match generated binding: {e}"))
    }

    pub fn query<Req, Resp>(&self, sender: Principal, method: &str, req: Req) -> Resp
    where
        Req: CandidType,
        Resp: CandidType + for<'de> Deserialize<'de>,
    {
        let bytes = self
            .pic
            .query_call(self.backend, sender, method, encode_one(req).unwrap())
            .unwrap_or_else(|e| panic!("{method} rejected by replica: {e:?}"));
        decode_one(&bytes)
            .unwrap_or_else(|e| panic!("{method} response did not match generated binding: {e}"))
    }
}

pub fn principal(tag: u8) -> Principal {
    let mut bytes = [0u8; 29];
    bytes[0] = tag;
    bytes[28] = tag;
    Principal::from_slice(&bytes)
}

// Reserved principals built from a full-byte fill, which principal(tag) (which
// sets only bytes[0] and bytes[28]) can never produce, so seeded/fixed
// identities never collide with per-test callers.
pub const fn reserved(fill: u8) -> Principal {
    match Principal::try_from_slice(&[fill; 29]) {
        Ok(p) => p,
        Err(_) => unreachable!(),
    }
}

pub const CONTROLLER: Principal = reserved(0xCC);
