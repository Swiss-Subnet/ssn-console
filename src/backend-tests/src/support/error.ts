import type { Principal } from '@icp-sdk/core/principal';
import { type ApiError } from '@ssn/backend-api';

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

export const unauthenticatedError: ApiErrorResponse = {
  Err: {
    code: [{ Unauthenticated: {} }],
    message: 'Anonymous principals are not allowed to perform this action.',
  },
};

export const unauthorizedError: ApiErrorResponse = {
  Err: {
    code: [{ Unauthorized: {} }],
    message: 'Only controllers are allowed to perform this action.',
  },
};

export const latestTermsAndConditionsError = {
  Err: {
    code: [{ Unauthorized: {} }],
    message:
      'The latest terms and conditions must be accepted to perform this action.',
  },
};

export function notOwnedProjectError(
  userId: string,
  projectId: string,
): ApiErrorResponse {
  return {
    Err: {
      code: [{ Unauthorized: {} }],
      message: `User with id ${userId} does not have access to project with id ${projectId}`,
    },
  };
}

export function noProfileError(principal: Principal): ApiErrorResponse {
  return {
    Err: {
      code: [{ ClientError: {} }],
      message: `User profile for principal ${principal} does not exist.`,
    },
  };
}

export function inactiveUserError(): ApiErrorResponse {
  return {
    Err: {
      code: [{ Unauthorized: {} }],
      message: `Inactive users cannot perform this action.`,
    },
  };
}

export function noTermsAndConditionsError(id: string): ApiErrorResponse {
  return {
    Err: {
      code: [{ ClientError: {} }],
      message: `Terms and conditions with id ${id} does not exist.`,
    },
  };
}

export function noOrgError(userId: string, orgId: string): ApiErrorResponse {
  return {
    Err: {
      code: [{ Unauthorized: {} }],
      message: `User with id ${userId} does not belong to org with id ${orgId}`,
    },
  };
}
