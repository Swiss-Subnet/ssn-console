// Generate Rust candid type bindings from the authoritative backend.did at
// compile time. backend.did is the source of truth; nothing is hand-written or
// committed, so the types can never drift from the deployed interface.

use std::path::PathBuf;

fn main() {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let did = manifest.join("../backend-api/backend.did");
    let template = manifest.join("bindings.hbs");

    println!("cargo:rerun-if-changed={}", template.display());
    // backend.did imports the per-service .did files; rerun if any change.
    println!(
        "cargo:rerun-if-changed={}",
        manifest.join("../backend-api/candid").display()
    );
    println!("cargo:rerun-if-changed={}", did.display());

    let (env, actor, prog) = candid_parser::pretty_check_file(&did)
        .unwrap_or_else(|e| panic!("failed to parse {}: {e}", did.display()));

    let configs = "".parse::<candid_parser::configs::Configs>().unwrap();
    let config = candid_parser::bindings::rust::Config::new(configs);
    let mut external = candid_parser::bindings::rust::ExternalConfig::default();
    external
        .0
        .insert("target".to_string(), "custom".to_string());
    external.0.insert(
        "template".to_string(),
        template.to_string_lossy().to_string(),
    );

    let (output, _unused) =
        candid_parser::bindings::rust::compile(&config, &env, &actor, &prog, external);

    // bindgen derives only CandidType + Deserialize; tests need Debug for
    // .expect() on the decoded Result and Clone for reusing ids across calls.
    let mut output = output.replace(
        "#[derive(CandidType, Deserialize)]",
        "#[derive(CandidType, Deserialize, Debug, Clone)]",
    );

    output.push_str(&method_consts(&env, &actor));

    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("bindings.rs");
    std::fs::write(&out, output).expect("write bindings.rs");
}

// Emit a `pub mod method` of `&str` consts, one per service method, so tests
// reference endpoints by const instead of a string literal that can silently
// drift from the .did.
fn method_consts(
    env: &candid_parser::TypeEnv,
    actor: &Option<candid_parser::types::Type>,
) -> String {
    let actor = actor.as_ref().expect("backend.did defines a service");
    let methods = env.as_service(actor).expect("actor is a service");

    let mut out = String::from("\npub mod method {\n");
    for (name, _) in methods {
        out.push_str(&format!(
            "    pub const {}: &str = \"{name}\";\n",
            name.to_uppercase().replace(['-', '.'], "_"),
        ));
    }
    out.push_str("}\n");
    out
}
