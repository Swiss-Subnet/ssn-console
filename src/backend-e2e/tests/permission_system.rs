// Black-box PocketIC tests for permission-system enforcement.

mod common;

use common::bindings::*;
use common::scenario::*;
use common::{principal, Fixture};

const MEMBER: u8 = 1;
const TARGET: u8 = 2;
const SCRAPER: u8 = 3;

// A member holding only MEMBER_MANAGE must not be able to add a member (incl.
// themselves) to a team that holds permissions beyond the caller's own. Adding
// to the ALL-perm Default Team would otherwise grant ORG_ADMIN on the next
// request.
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
        "add_user_to_team",
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
        "update_organization",
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

// READ_METRICS is documented as aggregate-only, with no per-record contents.
// A principal holding only READ_METRICS must not be able to enumerate a named
// user's canister principals cross-org.
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
        "admin_list_user_readable_canister_principals",
        ListUserReadableCanisterPrincipalsRequest {
            user_principal: target,
        },
    );
    assert!(
        res.is_err(),
        "READ_METRICS alone must not expose per-user canister principals",
    );
}

// admin_link_principal_to_user must not let a MANAGE_USERS staff member attach
// a principal to a target holding staff permissions beyond the caller's own:
// the new principal would inherit the target's full staff set.
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
        "admin_link_principal_to_user",
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

// PROJECT_ADMIN is a single bit, deliberately not the project ceiling. A member
// holding only PROJECT_ADMIN must not be able to grant their own team a
// permission they do not themselves hold (here CANISTER_MANAGE).
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
        "update_team_project_permissions",
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
