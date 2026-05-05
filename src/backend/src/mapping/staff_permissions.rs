use crate::{
    data,
    dto::{self, ListStaffResponse, StaffMember},
};
use canister_utils::Uuid;

use super::map_user_status_response;

pub fn map_list_staff_response(profiles: Vec<(Uuid, data::UserProfile)>) -> ListStaffResponse {
    profiles
        .into_iter()
        .filter_map(|(id, profile)| {
            let perms = profile.staff_permissions?;
            Some(StaffMember {
                user_id: id.to_string(),
                email: profile.email,
                email_verified: profile.email_verified,
                status: map_user_status_response(profile.status),
                permissions: map_staff_permissions(perms),
            })
        })
        .collect()
}

pub fn map_staff_permissions(perms: data::StaffPermissions) -> dto::StaffPermissions {
    dto::StaffPermissions {
        read_all_orgs: perms.contains(data::StaffPermissions::READ_ALL_ORGS),
        write_billing: perms.contains(data::StaffPermissions::WRITE_BILLING),
    }
}

pub fn map_staff_permissions_from_dto(perms: dto::StaffPermissions) -> data::StaffPermissions {
    let mut out = data::StaffPermissions::EMPTY;
    if perms.read_all_orgs {
        out = out.union(data::StaffPermissions::READ_ALL_ORGS);
    }
    if perms.write_billing {
        out = out.union(data::StaffPermissions::WRITE_BILLING);
    }
    out
}
