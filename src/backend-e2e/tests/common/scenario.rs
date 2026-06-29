// Reusable setup flows built on the Env harness. Everything goes through the
// public candid surface, so these double as exercise of the happy paths.

use crate::common::bindings::*;
use crate::common::env::{reserved, Env};
use candid::Principal;
use std::ops::Deref;
use std::sync::{Mutex, OnceLock};

// A canister seeded with a known admin (owning an org) and a MANAGE_USERS
// service principal, snapshotted so a checkout restores to this world via
// reset() instead of reinstalling. Seeded identities use reserved() principals
// so they never collide with per-test principal(tag) callers.
pub struct Fixture {
    pub env: Env,
    pub admin: Principal,
    pub admin_org: Organization,
    pub staff: Principal,
}

impl Fixture {
    // Check out a seeded fixture, restored to its baseline. Reuses a pooled
    // instance when one is free, otherwise builds and seeds a new one; either
    // way the returned guard starts from the clean baseline. The guard returns
    // the instance to the pool on drop. Tests run in parallel up to the pool
    // size (driven by the number of concurrent test threads).
    pub fn get() -> FixtureGuard {
        // A pooled instance carries a previous test's state, so restore it. A
        // freshly seeded one is already at baseline, so skip the redundant load.
        let fixture = match pool().lock().unwrap().pop() {
            Some(reused) => {
                reused.env.reset();
                reused
            }
            None => Self::seed(),
        };
        FixtureGuard {
            fixture: Some(fixture),
        }
    }

    fn seed() -> Self {
        let env = Env::new();
        let admin = reserved(0xA1);
        let admin_org = bootstrap_org(&env, admin, "Baseline Org");

        let staff = reserved(0xA2);
        grant_service_principal(
            &env,
            staff,
            StaffPermissions {
                manage_users: true,
                ..no_staff_perms()
            },
        );

        env.snapshot_baseline();
        Fixture {
            env,
            admin,
            admin_org,
            staff,
        }
    }
}

// Free seeded instances. Grows on demand to the high-water mark of concurrent
// checkouts, i.e. the number of test threads (cargo --test-threads, default =
// CPUs); never shrinks. No explicit cap: parallelism bounds it.
fn pool() -> &'static Mutex<Vec<Fixture>> {
    static POOL: OnceLock<Mutex<Vec<Fixture>>> = OnceLock::new();
    POOL.get_or_init(|| Mutex::new(Vec::new()))
}

pub struct FixtureGuard {
    fixture: Option<Fixture>,
}

impl Drop for FixtureGuard {
    fn drop(&mut self) {
        if let Some(fixture) = self.fixture.take() {
            pool().lock().unwrap().push(fixture);
        }
    }
}

impl Deref for FixtureGuard {
    type Target = Fixture;
    fn deref(&self) -> &Fixture {
        self.fixture.as_ref().unwrap()
    }
}

impl Deref for Fixture {
    type Target = Env;
    fn deref(&self) -> &Env {
        &self.env
    }
}

pub fn no_org_perms() -> OrgPermissions {
    OrgPermissions {
        org_admin: false,
        member_manage: false,
        team_manage: false,
        project_create: false,
        billing_manage: false,
    }
}

pub fn no_staff_perms() -> StaffPermissions {
    StaffPermissions {
        read_all_orgs: false,
        write_billing: false,
        manage_users: false,
        read_metrics: false,
    }
}

// Grant staff permissions to a user account via the controller bootstrap path.
pub fn grant_staff(env: &Env, user_id: &str, perms: StaffPermissions) {
    env.update::<_, GrantStaffPermissionsResponse>(
        env.controller,
        method::ADMIN_GRANT_STAFF_PERMISSIONS,
        GrantStaffPermissionsRequest {
            user_id: user_id.to_string(),
            permissions: perms,
        },
    )
    .expect("grant staff permissions");
}

// Grant staff permissions to a service principal (no user account, not subject
// to the Active/Inactive guard) via the controller bootstrap path.
pub fn grant_service_principal(env: &Env, p: Principal, perms: StaffPermissions) {
    env.update::<_, GrantServicePrincipalPermissionsResponse>(
        env.controller,
        method::ADMIN_GRANT_SERVICE_PRINCIPAL_PERMISSIONS,
        GrantServicePrincipalPermissionsRequest {
            service_principal: p,
            permissions: perms,
        },
    )
    .expect("grant service principal permissions");
}

pub fn no_project_perms() -> ProjectPermissions {
    ProjectPermissions {
        project_admin: false,
        canister_manage: false,
        proposal_create: false,
        proposal_approve: false,
        canister_operate: false,
        canister_read: false,
        approval_policy_manage: false,
        project_settings: false,
    }
}

// Onboard a principal: create its user profile and return its user_id.
pub fn create_user(env: &Env, p: Principal) -> String {
    env.update::<_, CreateMyUserProfileResponse>(p, method::CREATE_MY_USER_PROFILE, ())
        .expect("create user profile")
        .id
}

// Bootstrap an org owned by `owner` (profile created here). The org bootstrap
// also creates a "Default Team" (ALL org perms, owner as sole member) and a
// default project.
pub fn bootstrap_org(env: &Env, owner: Principal, name: &str) -> Organization {
    create_user(env, owner);
    env.update::<_, CreateOrganizationResponse>(
        owner,
        method::CREATE_ORGANIZATION,
        CreateOrganizationRequest {
            name: name.to_string(),
        },
    )
    .expect("create org")
    .organization
}

// The org bootstrap creates exactly one team with ORG_ADMIN (the Default Team).
pub fn org_admin_team_id(env: &Env, caller: Principal, org_id: &str) -> String {
    list_org_teams(env, caller, org_id)
        .into_iter()
        .find(|t| t.permissions.org_admin)
        .expect("an ORG_ADMIN team must exist")
        .id
}

pub fn list_org_teams(env: &Env, caller: Principal, org_id: &str) -> Vec<OrgTeam> {
    env.query::<_, ListOrgTeamsResponse>(
        caller,
        method::LIST_ORG_TEAMS,
        ListOrgTeamsRequest {
            org_id: org_id.to_string(),
        },
    )
    .expect("list org teams")
}

// Create a team in `org_id` and set its org permissions.
pub fn create_team_with_perms(
    env: &Env,
    caller: Principal,
    org_id: &str,
    name: &str,
    perms: OrgPermissions,
) -> String {
    let team_id = env
        .update::<_, CreateTeamResponse>(
            caller,
            method::CREATE_TEAM,
            CreateTeamRequest {
                org_id: org_id.to_string(),
                name: name.to_string(),
            },
        )
        .expect("create team")
        .team
        .id;

    env.update::<_, UpdateTeamOrgPermissionsResponse>(
        caller,
        method::UPDATE_TEAM_ORG_PERMISSIONS,
        UpdateTeamOrgPermissionsRequest {
            team_id: team_id.clone(),
            permissions: perms,
        },
    )
    .expect("set team org permissions");

    team_id
}

// Add an existing org member (by principal) onto a team. `admin` must hold the
// permissions required to do so.
pub fn add_member_to_team(env: &Env, admin: Principal, team_id: &str, member_user_id: &str) {
    env.update::<_, AddUserToTeamResponse>(
        admin,
        method::ADD_USER_TO_TEAM,
        AddUserToTeamRequest {
            team_id: team_id.to_string(),
            user_id: member_user_id.to_string(),
        },
    )
    .expect("add user to team");
}

pub fn create_project(env: &Env, caller: Principal, org_id: &str, name: &str) -> Project {
    env.update::<_, CreateProjectResponse>(
        caller,
        method::CREATE_PROJECT,
        CreateProjectRequest {
            org_id: org_id.to_string(),
            name: name.to_string(),
        },
    )
    .expect("create project")
    .project
}

pub fn add_team_to_project(env: &Env, caller: Principal, project_id: &str, team_id: &str) {
    env.update::<_, AddTeamToProjectResponse>(
        caller,
        method::ADD_TEAM_TO_PROJECT,
        AddTeamToProjectRequest {
            team_id: team_id.to_string(),
            project_id: project_id.to_string(),
        },
    )
    .expect("add team to project");
}

pub fn set_team_project_perms(
    env: &Env,
    caller: Principal,
    project_id: &str,
    team_id: &str,
    perms: ProjectPermissions,
) {
    env.update::<_, UpdateTeamProjectPermissionsResponse>(
        caller,
        method::UPDATE_TEAM_PROJECT_PERMISSIONS,
        UpdateTeamProjectPermissionsRequest {
            project_id: project_id.to_string(),
            team_id: team_id.to_string(),
            permissions: perms,
        },
    )
    .expect("set team project permissions");
}

// Invite `invitee` (already onboarded) into `org_id` and accept on their behalf.
pub fn invite_and_accept(env: &Env, admin: Principal, org_id: &str, invitee: Principal) {
    let invite_id = env
        .update::<_, CreateOrgInviteResponse>(
            admin,
            method::CREATE_ORG_INVITE,
            CreateOrgInviteRequest {
                org_id: org_id.to_string(),
                target: InviteTarget::Principal(invitee),
            },
        )
        .expect("create invite")
        .invite
        .id;

    env.update::<_, AcceptOrgInviteResponse>(
        invitee,
        method::ACCEPT_ORG_INVITE,
        AcceptOrgInviteRequest { invite_id },
    )
    .expect("accept invite");
}
