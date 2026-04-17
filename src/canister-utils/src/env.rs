use crate::{ApiError, ApiResult};
use ic_cdk::api::{env_var_name_exists, env_var_value};

pub fn load_runtime_env(env_name: &str) -> ApiResult<String> {
    if !env_var_name_exists(env_name) {
        return Err(ApiError::internal_error(format!(
            "{env_name} environment variable is not set"
        )));
    }

    Ok(env_var_value(env_name))
}
