import { type ApiError } from '@ssn/backend-api';

export interface ApiSuccessResponse<T> {
  Ok: T;
}

export interface ApiErrorResponse {
  Err: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type OkResponse<T> = T extends ApiSuccessResponse<infer U> ? U : never;

export function mapOkResponse<T>(response: ApiResponse<T>): T {
  if ('Ok' in response) {
    return response.Ok;
  }

  const [code] = response.Err.code;

  throw new Error(`[${code ?? ''}]: ${response.Err.message}`);
}
