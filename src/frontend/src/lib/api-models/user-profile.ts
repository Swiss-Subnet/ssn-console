import { mapOkResponse } from '@/lib/api-models/error';
import { isNotNil } from '@/lib/nil';
import { fromCandidOpt, toCandidOpt } from '@/lib/utils';
import { Principal } from '@icp-sdk/core/principal';
import type {
  UserProfile as ApiUserProfile,
  UserProfileBrief as ApiUserProfileBrief,
  UserStatus as ApiUserStatus,
  ListUserProfilesResponse as ApiListUserProfilesResponse,
  GetMyUserProfileResponse as ApiGetMyUserProfileResponse,
  CreateMyUserProfileResponse as ApiCreateMyUserProfileResponse,
  UpdateMyUserProfileRequest as ApiUpdateMyUserProfileRequest,
  UpdateUserProfileRequest as ApiUpdateUserProfileRequest,
  GetUserStatsResponse as ApiGetUserStatsResponse,
  GetUserProfilesByPrincipalsRequest as ApiGetUserProfilesByPrincipalsRequest,
  GetUserProfilesByPrincipalsResponse as ApiGetUserProfilesByPrincipalsResponse,
} from '@ssn/backend-api';

export type ListUserProfilesResponse = UserProfile[];

export type GetMyUserProfileResponse = UserProfile | null;

export type CreateMyUserProfileResponse = UserProfile;

export type UpdateMyUserProfileRequest = {
  email?: string | null;
};

export type UpdateUserProfileRequest = {
  userId: string;
  status?: UserStatus | null;
};

export type UserProfile = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  status: UserStatus;
  isAdmin: boolean;
};

export enum UserStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export function mapListUserProfilesResponse(
  res: ApiListUserProfilesResponse,
): ListUserProfilesResponse {
  return mapOkResponse(res).map(mapUserProfileResponse);
}

export function mapGetMyUserProfileResponse(
  res: ApiGetMyUserProfileResponse,
): GetMyUserProfileResponse {
  const userProfile = fromCandidOpt(mapOkResponse(res));

  if (isNotNil(userProfile)) {
    return mapUserProfileResponse(userProfile);
  }

  return null;
}

export function mapCreateMyUserProfileResponse(
  res: ApiCreateMyUserProfileResponse,
): CreateMyUserProfileResponse {
  return mapUserProfileResponse(mapOkResponse(res));
}

export function mapUserProfileResponse(res: ApiUserProfile): UserProfile {
  return {
    id: res.id,
    email: fromCandidOpt(res.email),
    emailVerified: res.email_verified,
    status: mapUserStatusResponse(res.status),
    isAdmin: res.is_admin,
  };
}

export function mapUpdateMyUserProfileRequest(
  req: UpdateMyUserProfileRequest,
): ApiUpdateMyUserProfileRequest {
  return {
    email: toCandidOpt(req.email),
  };
}

export function mapUpdateUserProfileRequest(
  req: UpdateUserProfileRequest,
): ApiUpdateUserProfileRequest {
  return {
    user_id: req.userId,
    status: req.status ? [mapUserStatusRequest(req.status)] : [],
  };
}

export function mapUserStatusRequest(status: UserStatus): ApiUserStatus {
  switch (status) {
    case UserStatus.Active:
      return { Active: null };
    case UserStatus.Inactive:
      return { Inactive: null };
    default:
      throw new Error('Unknown user status request');
  }
}

export function mapUserStatusResponse(status: ApiUserStatus): UserStatus {
  if ('Active' in status) {
    return UserStatus.Active;
  }

  if ('Inactive' in status) {
    return UserStatus.Inactive;
  }

  throw new Error('Unknown user status response');
}

export type GetUserStatsResponse = {
  total: number;
  active: number;
  inactive: number;
};

export function mapUserStatsResponse(
  res: ApiGetUserStatsResponse,
): GetUserStatsResponse {
  const okRes = mapOkResponse(res);
  return {
    total: Number(okRes.total),
    active: Number(okRes.active),
    inactive: Number(okRes.inactive),
  };
}

export type UserProfileBrief = {
  id: string;
  email: string | null;
  emailVerified: boolean;
};

export type GetUserProfilesByPrincipalsRequest = {
  projectId: string;
  principals: string[];
};

export type UserProfileByPrincipal = {
  principal: string;
  profile: UserProfileBrief | null;
};

export type GetUserProfilesByPrincipalsResponse = UserProfileByPrincipal[];

export function mapGetUserProfilesByPrincipalsRequest(
  req: GetUserProfilesByPrincipalsRequest,
): ApiGetUserProfilesByPrincipalsRequest {
  return {
    project_id: req.projectId,
    principals: req.principals.map(p => Principal.fromText(p)),
  };
}

export function mapGetUserProfilesByPrincipalsResponse(
  res: ApiGetUserProfilesByPrincipalsResponse,
): GetUserProfilesByPrincipalsResponse {
  return mapOkResponse(res).profiles.map(entry => ({
    principal: entry.subject_principal.toText(),
    profile: mapUserProfileBriefOpt(entry.profile),
  }));
}

function mapUserProfileBriefOpt(
  opt: [] | [ApiUserProfileBrief],
): UserProfileBrief | null {
  const brief = fromCandidOpt(opt);
  return brief
    ? {
        id: brief.id,
        email: fromCandidOpt(brief.email),
        emailVerified: brief.email_verified,
      }
    : null;
}
