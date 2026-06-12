import {
  mapCreateMyUserProfileResponse,
  mapGetMyUserProfileResponse,
  mapGetUserProfilesByPrincipalsRequest,
  mapGetUserProfilesByPrincipalsResponse,
  mapListStaleUsersResponse,
  mapListUserProfilesResponse,
  mapUpdateMyUserProfileRequest,
  mapUpdateUserProfileRequest,
  mapUserStatsResponse,
  type CreateMyUserProfileResponse,
  type GetMyUserProfileResponse,
  type GetUserProfilesByPrincipalsRequest,
  type GetUserProfilesByPrincipalsResponse,
  type ListStaleUsersResponse,
  type ListUserProfilesResponse,
  type UpdateMyUserProfileRequest,
  type UpdateUserProfileRequest,
  type UserProfile,
  type GetUserStatsResponse,
  mapOkResponse,
} from '@/lib/api-models';
import { isNotNil } from '@/lib/nil';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@ssn/backend-api';

export class UserProfileApi {
  constructor(private readonly actor: ActorSubclass<_SERVICE>) {}

  public async getMyUserProfile(): Promise<GetMyUserProfileResponse> {
    const res = await this.actor.get_my_user_profile();

    return mapGetMyUserProfileResponse(res);
  }

  public async createMyUserProfile(): Promise<CreateMyUserProfileResponse> {
    const res = await this.actor.create_my_user_profile();

    return mapCreateMyUserProfileResponse(res);
  }

  public async getOrCreateMyUserProfile(): Promise<UserProfile> {
    const userProfile = await this.getMyUserProfile();

    if (isNotNil(userProfile)) {
      return userProfile;
    }

    return this.createMyUserProfile();
  }

  public async listUserProfiles(): Promise<ListUserProfilesResponse> {
    const res = await this.actor.admin_list_user_profiles();

    return mapListUserProfilesResponse(res);
  }

  public async updateMyUserProfile(
    req: UpdateMyUserProfileRequest,
  ): Promise<void> {
    const res = await this.actor.update_my_user_profile(
      mapUpdateMyUserProfileRequest(req),
    );
    mapOkResponse(res);
  }

  public async updateUserProfile(req: UpdateUserProfileRequest): Promise<void> {
    const res = await this.actor.admin_update_user_profile(
      mapUpdateUserProfileRequest(req),
    );
    mapOkResponse(res);
  }

  public async getUserStats(): Promise<GetUserStatsResponse> {
    const res = await this.actor.admin_get_user_stats();
    return mapUserStatsResponse(res);
  }

  public async listStaleUsers(): Promise<ListStaleUsersResponse> {
    const res = await this.actor.admin_list_stale_users();
    return mapListStaleUsersResponse(res);
  }

  public async verifyMyEmail(token: string): Promise<void> {
    const res = await this.actor.verify_my_email({ token });
    mapOkResponse(res);
  }

  public async getUserProfilesByPrincipals(
    req: GetUserProfilesByPrincipalsRequest,
  ): Promise<GetUserProfilesByPrincipalsResponse> {
    const res = await this.actor.get_user_profiles_by_principals(
      mapGetUserProfilesByPrincipalsRequest(req),
    );
    return mapGetUserProfilesByPrincipalsResponse(res);
  }
}
