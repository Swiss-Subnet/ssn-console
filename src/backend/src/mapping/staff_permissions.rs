use crate::{data, dto};

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
