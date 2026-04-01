use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use canister_utils::{ApiError, ApiResult};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BaseClaims {
    pub exp: u64,
}

pub fn verify_jwt<T: DeserializeOwned>(token: &str, public_key_bytes: &[u8; 32]) -> ApiResult<T> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err(ApiError::client_error(
            "Invalid JWT token format".to_string(),
        ));
    }

    let message = format!("{}.{}", parts[0], parts[1]);
    let sig_bytes = URL_SAFE_NO_PAD
        .decode(parts[2])
        .map_err(|_| ApiError::client_error("Invalid JWT signature base64 encoding".to_string()))?;

    let signature = Signature::from_slice(&sig_bytes)
        .map_err(|_| ApiError::client_error("Invalid JWT signature length".to_string()))?;
    let verifying_key = VerifyingKey::from_bytes(public_key_bytes)
        .map_err(|_| ApiError::client_error("Invalid JWT public key".to_string()))?;

    verifying_key
        .verify(message.as_bytes(), &signature)
        .map_err(|_| ApiError::client_error("JWT signature verification failed".to_string()))?;

    let payload_bytes = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| ApiError::client_error("Invalid JWT payload base64 encoding".to_string()))?;
    let base_claims: BaseClaims = serde_json::from_slice(&payload_bytes)
        .map_err(|_| ApiError::client_error("Failed to parse JWT base claims".to_string()))?;

    let current_time_sec = ic_cdk::api::time() / 1_000_000_000;
    if current_time_sec > base_claims.exp {
        return Err(ApiError::client_error("JWT has expired".to_string()));
    }

    let claims: T = serde_json::from_slice(&payload_bytes)
        .map_err(|_| ApiError::client_error("Failed to parse JSON claims".to_string()))?;

    Ok(claims)
}

pub fn extract_ed25519_public_key_from_pem(pem: &str) -> Result<[u8; 32], String> {
    let b64 = pem
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replace(['\n', '\r'], "");

    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let der = STANDARD
        .decode(&b64)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    if der.len() != 44 {
        return Err(format!(
            "Expected DER length of 44 for Ed25519 public key, got {}",
            der.len()
        ));
    }

    let mut pub_key = [0u8; 32];
    pub_key.copy_from_slice(&der[12..]);
    Ok(pub_key)
}
