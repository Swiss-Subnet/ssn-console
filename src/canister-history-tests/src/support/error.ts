import { type ApiError } from '@ssn/canister-history-api';

export interface ApiSuccessResponse<T> {
  Ok: T;
}

export interface ApiErrorResponse {
  Err: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function extractErrResponse<T>(response: ApiResponse<T>): ApiError {
  if ('Err' in response) {
    return response.Err;
  }

  const err = new Error('Expected `err` response', { cause: response });
  console.error(err);
  throw err;
}

export type OkResponse<T> = T extends ApiSuccessResponse<infer U> ? U : never;

export function extractOkResponse<T>(response: ApiResponse<T>): T {
  if ('Ok' in response) {
    return response.Ok;
  }

  const err = new Error('Expected `ok` response', { cause: response });
  console.error(err);
  throw err;
}
