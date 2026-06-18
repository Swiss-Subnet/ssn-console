import { type ApiError } from '@ssn/backend-api';

export interface ApiSuccessResponse<T> {
  Ok: T;
}

// E defaults to ApiError but the extract helpers ignore the error shape, so a
// response carrying RejectionError (token-redemption endpoints) is accepted too.
export interface ApiErrorResponse<E = ApiError> {
  Err: E;
}

export type ApiResponse<T, E = ApiError> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse<E>;

export function extractErrResponse<T, E = ApiError>(
  response: ApiResponse<T, E>,
): E {
  if ('Err' in response) {
    return response.Err;
  }

  const err = new Error('Expected `err` response', { cause: response });
  console.error(err);
  throw err;
}

export type OkResponse<T> = T extends ApiSuccessResponse<infer U> ? U : never;

export function extractOkResponse<T, E = ApiError>(
  response: ApiResponse<T, E>,
): T {
  if ('Ok' in response) {
    return response.Ok;
  }

  const err = new Error('Expected `ok` response', { cause: response });
  console.error(err);
  throw err;
}
