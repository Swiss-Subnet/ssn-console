import { isNotNil } from '@/lib/nil';
import { fromCandidOpt, toCandidOpt } from '@/lib/utils';
import type {
  UserProfile as ApiUserProfile,
  UserStatus as ApiUserStatus,
  ListUserProfilesResponse as ApiListUserProfilesResponse,
  GetMyUserProfileResponse as ApiGetMyUserProfileResponse,
  CreateMyUserProfileResponse as ApiCreateMyUserProfileResponse,
  UpdateMyUserProfileRequest as ApiUpdateMyUserProfileRequest,
  UpdateUserProfileRequest as ApiUpdateUserProfileRequest,
  GetUserStatsResponse,
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
  return res.map(mapUserProfileResponse);
}

export function mapGetMyUserProfileResponse(
  res: ApiGetMyUserProfileResponse,
): GetMyUserProfileResponse {
  const userProfile = fromCandidOpt(res);

  if (isNotNil(userProfile)) {
    return mapUserProfileResponse(userProfile);
  }

  return null;
}

export function mapCreateMyUserProfileResponse(
  res: ApiCreateMyUserProfileResponse,
): CreateMyUserProfileResponse {
  return mapUserProfileResponse(res);
}

export function mapUserProfileResponse(res: ApiUserProfile): UserProfile {
  return {
    id: res.id,
    email: fromCandidOpt(res.email),
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

export type UserStats = {
  total: number;
  active: number;
  inactive: number;
};

export function mapUserStatsResponse(res: GetUserStatsResponse): UserStats {
  return {
    total: Number(res.total),
    active: Number(res.active),
    inactive: Number(res.inactive),
  };
}
