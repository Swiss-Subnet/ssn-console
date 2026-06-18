import { isNil } from '@/lib/nil';
import {
  type ApiError,
  type ApiErrorCode,
  type RejectionError,
  type RejectionReason,
} from '@ssn/backend-api';

export interface ApiSuccessResponse<T> {
  Ok: T;
}

export interface ApiErrorResponse {
  Err: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type OkResponse<T> = T extends ApiSuccessResponse<infer U> ? U : never;

export type ApiErrorCodeName =
  | 'ClientError'
  | 'Unauthorized'
  | 'DependencyError'
  | 'InternalError'
  | 'Unauthenticated'
  | 'Unknown';

// Carries the structured code alongside the message so callers can branch on
// the variant instead of parsing the formatted string. reason is the generated
// RejectionReason union, set only for the token-redemption endpoints.
export class ApiCallError extends Error {
  constructor(
    readonly code: ApiErrorCodeName,
    readonly apiMessage: string,
    readonly reason: RejectionReason | null = null,
  ) {
    super(`[${code}]: ${apiMessage}`);
    this.name = 'ApiCallError';
  }
}

export function mapOkResponse<T>(response: ApiResponse<T>): T {
  if ('Ok' in response) {
    return response.Ok;
  }

  const [codeObj] = response.Err.code;
  throw new ApiCallError(codeObjToString(codeObj), response.Err.message);
}

export type RejectionResponse<T> =
  | ApiSuccessResponse<T>
  | { Err: RejectionError };

// The token-redemption endpoints (email verification, account recovery) return
// RejectionError, which has no ApiErrorCode but a typed reason. Map to the same
// ApiCallError so callers branch on .reason.
export function mapRejectionResponse<T>(response: RejectionResponse<T>): T {
  if ('Ok' in response) {
    return response.Ok;
  }

  const [reason] = response.Err.reason;
  throw new ApiCallError('ClientError', response.Err.message, reason ?? null);
}

function codeObjToString(codeObj: ApiErrorCode | undefined): ApiErrorCodeName {
  if (isNil(codeObj)) {
    return 'Unknown';
  }

  if ('ClientError' in codeObj) {
    return 'ClientError';
  }

  if ('Unauthorized' in codeObj) {
    return 'Unauthorized';
  }

  if ('DependencyError' in codeObj) {
    return 'DependencyError';
  }

  if ('InternalError' in codeObj) {
    return 'InternalError';
  }

  if ('Unauthenticated' in codeObj) {
    return 'Unauthenticated';
  }

  return 'Unknown';
}
