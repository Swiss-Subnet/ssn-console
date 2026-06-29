// Black-box PocketIC tests for permission-system enforcement.

mod common;

use common::bindings::*;
use common::scenario::*;
use common::{principal, Fixture};

const MEMBER: u8 = 1;
const TARGET: u8 = 2;
const SCRAPER: u8 = 3;

// MEMBER_MANAGE cannot add a member to a team whose perms exceed the caller's
// own; otherwise adding into the ALL-perm Default Team would confer ORG_ADMIN.
#[test]
fn member_manage_cannot_add_to_higher_privileged_team() {
    let f = Fixture::get();
    let member = principal(MEMBER);

    let member_uid = create_user(&f, member);
    let mm_team = create_team_with_perms(
        &f,
        f.admin,
        &f.admin_org.id,
        "Member managers",
        OrgPermissions {
            member_manage: true,
            ..no_org_perms()
        },
    );

    invite_and_accept(&f, f.admin, &f.admin_org.id, member);
    add_member_to_team(&f, f.admin, &mm_team, &member_uid);

    let default_team = org_admin_team_id(&f, f.admin, &f.admin_org.id);

    let escalation = f.update::<_, AddUserToTeamResponse>(
        member,
        method::ADD_USER_TO_TEAM,
        AddUserToTeamRequest {
            team_id: default_team,
            user_id: member_uid.clone(),
        },
    );
    assert!(
        escalation.is_err(),
        "MEMBER_MANAGE holder must not add a member to a team whose perms exceed its own",
    );

    // The member must not have gained ORG_ADMIN: an ORG_ADMIN-gated call must
    // still be rejected.
    let admin_action = f.update::<_, UpdateOrganizationResponse>(
        member,
        method::UPDATE_ORGANIZATION,
        UpdateOrganizationRequest {
            org_id: f.admin_org.id.clone(),
            name: "Renamed".to_string(),
        },
    );
    assert!(
        admin_action.is_err(),
        "MEMBER_MANAGE holder must not reach ORG_ADMIN via team self-add",
    );
}

// READ_METRICS is aggregate-only: it must not expose a named user's canister
// principals cross-org.
#[test]
fn read_metrics_cannot_enumerate_user_canisters() {
    let f = Fixture::get();
    let scraper = principal(SCRAPER);
    let target = principal(TARGET);

    grant_service_principal(
        &f,
        scraper,
        StaffPermissions {
            read_metrics: true,
            ..no_staff_perms()
        },
    );
    create_user(&f, target);

    let res = f.query::<_, ListUserReadableCanisterPrincipalsResponse>(
        scraper,
        method::ADMIN_LIST_USER_READABLE_CANISTER_PRINCIPALS,
        ListUserReadableCanisterPrincipalsRequest {
            user_principal: target,
        },
    );
    assert!(
        res.is_err(),
        "READ_METRICS alone must not expose per-user canister principals",
    );
}

// Linking grants the new principal the target's full staff set, so MANAGE_USERS
// cannot link onto an account whose staff perms exceed the caller's own.
#[test]
fn manage_users_cannot_link_onto_higher_privileged_staff() {
    let f = Fixture::get();
    let target = principal(TARGET);
    let fresh = principal(MEMBER);

    let target_uid = create_user(&f, target);
    grant_staff(
        &f,
        &target_uid,
        StaffPermissions {
            read_all_orgs: true,
            write_billing: true,
            manage_users: true,
            read_metrics: true,
        },
    );

    let res = f.update::<_, AdminLinkPrincipalResponse>(
        f.staff,
        method::ADMIN_LINK_PRINCIPAL_TO_USER,
        AdminLinkPrincipalRequest {
            user_id: target_uid.clone(),
            principal: fresh,
        },
    );
    assert!(
        res.is_err(),
        "MANAGE_USERS must not link a principal onto a more-privileged staff account",
    );
}

// PROJECT_ADMIN is one bit, not the project ceiling: it cannot grant a
// permission the caller does not hold (here CANISTER_MANAGE).
#[test]
fn project_admin_cannot_grant_beyond_own_perms() {
    let f = Fixture::get();
    let member = principal(MEMBER);

    let member_uid = create_user(&f, member);
    invite_and_accept(&f, f.admin, &f.admin_org.id, member);

    // A team for the member with no org-level powers.
    let team = create_team_with_perms(&f, f.admin, &f.admin_org.id, "Builders", no_org_perms());
    add_member_to_team(&f, f.admin, &team, &member_uid);

    // Admin (ALL on the new project) links the team and downgrades it to
    // PROJECT_ADMIN only.
    let project = create_project(&f, f.admin, &f.admin_org.id, "Service");
    add_team_to_project(&f, f.admin, &project.id, &team);
    set_team_project_perms(
        &f,
        f.admin,
        &project.id,
        &team,
        ProjectPermissions {
            project_admin: true,
            ..no_project_perms()
        },
    );

    // Member, via the PROJECT_ADMIN-only team, tries to self-grant CANISTER_MANAGE.
    let res = f.update::<_, UpdateTeamProjectPermissionsResponse>(
        member,
        method::UPDATE_TEAM_PROJECT_PERMISSIONS,
        UpdateTeamProjectPermissionsRequest {
            project_id: project.id.clone(),
            team_id: team.clone(),
            permissions: ProjectPermissions {
                project_admin: true,
                canister_manage: true,
                ..no_project_perms()
            },
        },
    );
    assert!(
        res.is_err(),
        "PROJECT_ADMIN must not grant a permission the caller does not hold",
    );
}
