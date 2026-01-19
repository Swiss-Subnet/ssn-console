use crate::env;
use ic_asset_certification::{Asset, AssetConfig, AssetEncoding, AssetFallbackConfig, AssetRouter};
use ic_cdk::{
    api::{certified_data_set, data_certificate},
    *,
};
use ic_http_certification::{HeaderField, HttpRequest, HttpResponse, StatusCode};
use include_dir::{include_dir, Dir};
use std::cell::RefCell;

#[init]
fn init() {
    certify_all_assets();
}

#[post_upgrade]
fn post_upgrade() {
    init();
}

#[query]
fn http_request(req: HttpRequest) -> HttpResponse {
    serve_asset(&req)
}

thread_local! {
    static ASSET_ROUTER: RefCell<AssetRouter<'static>> = Default::default();
}

static ASSETS_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../frontend/dist");
const IMMUTABLE_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
const NO_CACHE_ASSET_CACHE_CONTROL: &str = "public, no-cache, no-store";

fn collect_assets<'content, 'path>(
    dir: &'content Dir<'path>,
    assets: &mut Vec<Asset<'content, 'path>>,
) {
    for file in dir.files() {
        assets.push(Asset::new(file.path().to_string_lossy(), file.contents()));
    }

    for dir in dir.dirs() {
        collect_assets(dir, assets);
    }
}

fn certify_all_assets() {
    let encodings = vec![
        AssetEncoding::Brotli.default_config(),
        AssetEncoding::Gzip.default_config(),
    ];

    let asset_configs = vec![
        AssetConfig::File {
            path: "index.html".to_string(),
            content_type: Some("text/html".to_string()),
            headers: get_asset_headers(vec![(
                "cache-control".to_string(),
                NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            fallback_for: vec![AssetFallbackConfig {
                scope: "/".to_string(),
                status_code: Some(StatusCode::OK),
            }],
            aliased_by: vec!["/".to_string()],
            encodings: encodings.clone(),
        },
        AssetConfig::Pattern {
            pattern: "**/*.js".to_string(),
            content_type: Some("text/javascript".to_string()),
            headers: get_asset_headers(vec![(
                "cache-control".to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: encodings.clone(),
        },
        AssetConfig::Pattern {
            pattern: "**/*.css".to_string(),
            content_type: Some("text/css".to_string()),
            headers: get_asset_headers(vec![(
                "cache-control".to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings,
        },
        AssetConfig::Pattern {
            pattern: "**/*.ico".to_string(),
            content_type: Some("image/x-icon".to_string()),
            headers: get_asset_headers(vec![(
                "cache-control".to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: vec![],
        },
        AssetConfig::File {
            path: ".well-known/ii-alternative-origins".to_string(),
            content_type: Some("application/json".to_string()),
            headers: get_asset_headers(vec![(
                "cache-control".to_string(),
                NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            fallback_for: vec![],
            aliased_by: vec![],
            encodings: vec![],
        },
        AssetConfig::File {
            path: ".well-known/ic-domains".to_string(),
            content_type: Some("text/plain".to_string()),
            headers: get_asset_headers(vec![(
                "cache-control".to_string(),
                NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            fallback_for: vec![],
            aliased_by: vec![],
            encodings: vec![],
        },
    ];

    let mut assets = Vec::new();
    collect_assets(&ASSETS_DIR, &mut assets);

    ASSET_ROUTER.with_borrow_mut(|asset_router| {
        if let Err(err) = asset_router.certify_assets(assets, asset_configs) {
            ic_cdk::trap(&format!("Failed to certify assets: {}", err));
        }

        certified_data_set(&asset_router.root_hash());
    });
}

fn serve_asset(req: &HttpRequest) -> HttpResponse<'static> {
    ASSET_ROUTER.with_borrow(|asset_router| {
        if let Ok(response) = asset_router.serve_asset(
            &data_certificate().expect("No data certificate available"),
            req,
        ) {
            response
        } else {
            ic_cdk::trap("Failed to serve asset");
        }
    })
}

fn get_asset_headers(additional_headers: Vec<HeaderField>) -> Vec<HeaderField> {
    let mut connect_src = vec!["'self'"];
    if env::is_local() {
        connect_src.push("localhost:8000");
    } else {
        connect_src.push("icp0.io");
    }
    let connect_src = connect_src.join(" ");

    let mut headers = vec![
        ("strict-transport-security".to_string(), "max-age=31536000; includeSubDomains".to_string()),
        ("x-frame-options".to_string(), "DENY".to_string()),
        ("x-content-type-options".to_string(), "nosniff".to_string()),
        ("content-security-policy".to_string(), format!("default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src {connect_src}; img-src 'self' data:; form-action 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests; block-all-mixed-content")),
        ("referrer-policy".to_string(), "no-referrer".to_string()),
        ("permissions-policy".to_string(), "accelerometer=(),ambient-light-sensor=(),autoplay=(),battery=(),camera=(),display-capture=(),document-domain=(),encrypted-media=(),fullscreen=(),gamepad=(),geolocation=(),gyroscope=(),layout-animations=(self),legacy-image-formats=(self),magnetometer=(),microphone=(),midi=(),oversized-images=(self),payment=(),picture-in-picture=(),publickey-credentials-get=(),speaker-selection=(),sync-xhr=(self),unoptimized-images=(self),unsized-media=(self),usb=(),screen-wake-lock=(),web-share=(),xr-spatial-tracking=()".to_string()),
    ];
    headers.extend(additional_headers);

    headers
}
