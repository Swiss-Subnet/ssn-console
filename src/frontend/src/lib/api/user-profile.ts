import {
  mapCreateMyUserProfileResponse,
  mapGetMyUserProfileResponse,
  mapListUserProfilesResponse,
  mapUpdateMyUserProfileRequest,
  mapUpdateUserProfileRequest,
  type CreateMyUserProfileResponse,
  type GetMyUserProfileResponse,
  type ListUserProfilesResponse,
  type UpdateMyUserProfileRequest,
  type UpdateUserProfileRequest,
  type UserProfile,
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
    const res = await this.actor.list_user_profiles();

    return mapListUserProfilesResponse(res);
  }

  public async updateMyUserProfile(
    req: UpdateMyUserProfileRequest,
  ): Promise<void> {
    await this.actor.update_my_user_profile(mapUpdateMyUserProfileRequest(req));
  }

  public async updateUserProfile(req: UpdateUserProfileRequest): Promise<void> {
    await this.actor.update_user_profile(mapUpdateUserProfileRequest(req));
  }
}
