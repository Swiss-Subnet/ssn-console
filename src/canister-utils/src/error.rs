use candid::{CandidType, Deserialize};

#[derive(Debug, CandidType, Deserialize)]
pub enum ApiResultDto<T = ()> {
    Ok(T),
    Err(ApiError),
}

pub type ApiResult<T = ()> = Result<T, ApiError>;

#[derive(Debug, Clone, CandidType, Deserialize, PartialEq, Eq)]
pub struct ApiError {
    code: ApiErrorCode,
    message: String,
}

impl ApiError {
    pub fn unauthenticated(message: String) -> ApiError {
        Self::error(ApiErrorCode::Unauthenticated {}, message)
    }

    pub fn unauthorized(message: String) -> ApiError {
        Self::error(ApiErrorCode::Unauthorized {}, message)
    }

    pub fn dependency_error(message: String) -> ApiError {
        Self::error(ApiErrorCode::DependencyError {}, message)
    }

    pub fn internal_error(message: String) -> ApiError {
        Self::error(ApiErrorCode::InternalError {}, message)
    }

    pub fn client_error(message: String) -> ApiError {
        Self::error(ApiErrorCode::ClientError {}, message)
    }

    fn error(code: ApiErrorCode, message: String) -> ApiError {
        ApiError { code, message }
    }
}

#[derive(Debug, Clone, CandidType, Deserialize, PartialEq, Eq)]
pub enum ApiErrorCode {
    Unauthenticated {},
    Unauthorized {},
    DependencyError {},
    InternalError {},
    ClientError {},
}

impl<T> From<Result<T, ApiError>> for ApiResultDto<T> {
    fn from(result: Result<T, ApiError>) -> Self {
        match result {
            Ok(value) => ApiResultDto::Ok(value),
            Err(err) => ApiResultDto::Err(err),
        }
    }
}
