import type { ApiErrorResponse } from '@ssn/test-utils';

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
