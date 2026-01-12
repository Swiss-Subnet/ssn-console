import { isNotNil } from '@/lib/nil';
import { fromCandidOpt, toCandidOpt } from '@/lib/utils';
import type {
  UserProfile as ApiUserProfile,
  MyUserProfile as ApiMyUserProfile,
  UserStatus as ApiUserStatus,
  ListUserProfilesResponse as ApiListUserProfilesResponse,
  GetMyUserProfileResponse as ApiGetMyUserProfileResponse,
  CreateMyUserProfileResponse as ApiCreateMyUserProfileResponse,
  UpdateMyUserProfileRequest as ApiUpdateMyUserProfileRequest,
  UpdateUserProfileRequest as ApiUpdateUserProfileRequest,
} from '@ssn/backend-api';

export type ListUserProfilesResponse = UserProfile[];

export type GetMyUserProfileResponse = MyUserProfile | null;

export type CreateMyUserProfileResponse = MyUserProfile;

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
};

export type MyUserProfile = {
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
    return mapMyUserProfileResponse(userProfile);
  }

  return null;
}

export function mapCreateMyUserProfileResponse(
  res: ApiCreateMyUserProfileResponse,
): CreateMyUserProfileResponse {
  return mapMyUserProfileResponse(res);
}

export function mapUserProfileResponse(res: ApiUserProfile): UserProfile {
  return {
    id: res.id,
    email: fromCandidOpt(res.email),
    status: mapUserStatusResponse(res.status),
  };
}

export function mapMyUserProfileResponse(res: ApiMyUserProfile): MyUserProfile {
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
