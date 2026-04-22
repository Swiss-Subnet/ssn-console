import type { Principal } from '@icp-sdk/core/principal';
import { type ApiErrorResponse } from '@ssn/test-utils';

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

// Generic "project not found or no access" error. Returned whenever the
// caller is not allowed to learn whether a project id exists or which org
// it belongs to. Non-existent project ids and projects in orgs the caller
// can't see must share this exact error to prevent probing.
export function projectNotFoundOrNoAccessError(
  projectId: string,
): ApiErrorResponse {
  return {
    Err: {
      code: [{ ClientError: {} }],
      message: `Project with id ${projectId} does not exist or you do not have access.`,
    },
  };
}

// Generic "team not found or no access" error. Same pattern as the project
// variant above: collapses "non-existent team" and "team in another org"
// into a single response.
export function teamNotFoundOrNoAccessError(teamId: string): ApiErrorResponse {
  return {
    Err: {
      code: [{ ClientError: {} }],
      message: `Team with id ${teamId} does not exist or you do not have access.`,
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

// Returned when the caller is an org member but the aggregate of their team
// permissions does not include a required bit (e.g. TEAM_MANAGE,
// MEMBER_MANAGE). `permissions` must match the Display formatting of the
// required OrgPermissions value, e.g. "TEAM_MANAGE" or
// "MEMBER_MANAGE | TEAM_MANAGE".
export function lacksOrgPermissionError(
  userId: string,
  orgId: string,
  permissions: string,
): ApiErrorResponse {
  return {
    Err: {
      code: [{ Unauthorized: {} }],
      message: `User with id ${userId} lacks required permissions on org with id ${orgId}: ${permissions}`,
    },
  };
}

// Returned when the caller is an org member but none of the teams they
// belong to are linked to the project. Distinct from
// `projectNotFoundOrNoAccessError` — the project exists and is in the
// caller's org, but they have no team link granting access.
export function noProjectTeamLinkError(
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
