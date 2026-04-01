import { isNil } from '@/lib/nil';
import { type ApiError, type ApiErrorCode } from '@ssn/backend-api';

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

  const [codeObj] = response.Err.code;
  const code = codeObjToString(codeObj);

  throw new Error(`[${code ?? ''}]: ${response.Err.message}`);
}

function codeObjToString(codeObj: ApiErrorCode | undefined): string {
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
