use crate::data::{
    canister_repository, invite_repository, organization_repository, project_repository,
    team_repository, OrgId, TeamId, UserId,
};

// Reasons a footprint is NOT safe to prune; empty Vec means prunable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StaleBlocker {
    HasCanisters,
    OrgHasOtherMembers,
    TeamHasOtherMembers,
    HasPendingInvites,
    IsStaff,
}

fn team_blockers(team_id: TeamId, owner: UserId, push: &mut impl FnMut(StaleBlocker)) {
    if team_repository::list_team_user_ids(team_id)
        .iter()
        .any(|m| *m != owner)
    {
        push(StaleBlocker::TeamHasOtherMembers);
    }
}

pub fn org_blockers(org_id: OrgId, owner: UserId, now_ns: u64) -> Vec<StaleBlocker> {
    let mut blockers = Vec::new();
    let mut push = |b| blockers.push(b);

    if organization_repository::list_org_users(org_id)
        .iter()
        .any(|m| *m != owner)
    {
        push(StaleBlocker::OrgHasOtherMembers);
    }

    for (team_id, _, _) in team_repository::list_org_teams_with_permissions(org_id) {
        team_blockers(team_id, owner, &mut push);
    }

    // Enumerate by org, not by team, to catch projects with no team assignment.
    for (project_id, _) in project_repository::list_org_projects(org_id) {
        if canister_repository::project_has_canisters(project_id) {
            push(StaleBlocker::HasCanisters);
        }
    }

    if invite_repository::count_pending_invites_for_org(org_id, now_ns) > 0 {
        push(StaleBlocker::HasPendingInvites);
    }

    blockers
}

pub fn user_blockers(user_id: UserId, now_ns: u64) -> Vec<StaleBlocker> {
    let mut blockers = Vec::new();

    if is_staff(user_id) {
        blockers.push(StaleBlocker::IsStaff);
    }

    for (org_id, _) in organization_repository::list_user_orgs(user_id) {
        blockers.extend(org_blockers(org_id, user_id, now_ns));
    }

    blockers
}

pub fn is_prunable_user(user_id: UserId, now_ns: u64) -> bool {
    user_blockers(user_id, now_ns).is_empty()
}

fn is_staff(user_id: UserId) -> bool {
    crate::data::user_profile_repository::get_user_profile_by_user_id(&user_id)
        .and_then(|p| p.staff_permissions)
        .is_some_and(|perms| perms != crate::data::StaffPermissions::EMPTY)
}

#[cfg(feature = "canbench-rs")]
mod benches {
    use super::is_prunable_user;
    use crate::data::{
        canister_repository, invite_repository, organization_repository, project_repository,
        team_repository, user_profile_repository, Canister, InviteStatus, InviteTarget, OrgInvite,
        Organization, UserProfile,
    };
    use canbench_rs::{bench, bench_fn, BenchResult};
    use candid::Principal;

    const NOW: u64 = 1_000;

    // Everything is derived from the user index: principals, population mix, and
    // footprint shape. No RNG and no fresh_principal() -- identical seed every
    // run, so instruction counts are stable for regression comparison.
    fn principal(i: u32) -> Principal {
        let mut bytes = [0u8; 29];
        bytes[25..29].copy_from_slice(&i.to_be_bytes());
        Principal::from_slice(&bytes)
    }

    // A realistic-ish population, assigned deterministically by index:
    //   i % 10 in 0..=6  -> thin prunable user (1 org/team/project, no canister)
    //   i % 10 == 7      -> blocked by a canister (still walks the full fanout)
    //   i % 10 == 8      -> blocked by a pending invite
    //   i % 10 == 9      -> multi-org footprint (3 orgs), prunable -> widest scan
    fn seed_user(i: u32) {
        let user_id =
            user_profile_repository::create_user_profile(principal(i), UserProfile::default());
        let org_id = organization_repository::add_default_org(user_id);
        let team_id = team_repository::add_default_team(user_id, org_id);
        let project_id = project_repository::add_default_project(team_id, org_id);

        match i % 10 {
            7 => {
                canister_repository::create_canister(
                    project_id,
                    Canister {
                        // Distinct from the user's own principal; index-derived.
                        principal: principal(i.wrapping_add(1_000_000)),
                        name: None,
                        deleted_at: None,
                    },
                );
            }
            8 => {
                invite_repository::create_invite(OrgInvite {
                    org_id,
                    created_by: user_id,
                    created_at_ns: NOW,
                    expires_at_ns: NOW + 1,
                    target: InviteTarget::Email(format!("u{i}@example.com")),
                    status: InviteStatus::Pending,
                });
            }
            9 => {
                for n in 0..2 {
                    let extra_org = organization_repository::create_org(
                        user_id,
                        Organization {
                            name: format!("org-{i}-{n}"),
                        },
                    );
                    let extra_team = team_repository::add_default_team(user_id, extra_org);
                    project_repository::add_default_project(extra_team, extra_org);
                }
            }
            _ => {}
        }
    }

    // Mirrors user_profile_service::list_stale_users' scan: every profile run
    // through is_prunable_user. The service wrapper only adds the auth gate and
    // DTO mapping, neither of which scales with user count.
    fn bench_list_stale_users(num_users: u32) -> BenchResult {
        for i in 0..num_users {
            seed_user(i);
        }

        bench_fn(|| {
            user_profile_repository::list_user_profiles()
                .into_iter()
                .filter(|(user_id, _, _)| is_prunable_user(*user_id, NOW))
                .count();
        })
    }

    #[bench(raw)]
    pub fn bench_list_stale_users_10() -> BenchResult {
        bench_list_stale_users(10)
    }

    #[bench(raw)]
    pub fn bench_list_stale_users_100() -> BenchResult {
        bench_list_stale_users(100)
    }

    #[bench(raw)]
    pub fn bench_list_stale_users_1000() -> BenchResult {
        bench_list_stale_users(1000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::{
        approval_policy_repository, canister_repository, organization_repository,
        project_repository, team_repository, user_profile_repository, ApprovalPolicy, Canister,
        OperationType, PolicyType, Project, StaffPermissions, Team, UserProfile,
    };
    use crate::test_support::fresh_principal;

    const NOW: u64 = 1_000;

    // Mirrors create_my_user_profile's scaffold.
    fn fresh_user() -> UserId {
        let user_id =
            user_profile_repository::create_user_profile(fresh_principal(), UserProfile::default());
        let org_id = organization_repository::add_default_org(user_id);
        let team_id = team_repository::add_default_team(user_id, org_id);
        let project_id = project_repository::add_default_project(team_id, org_id);
        approval_policy_repository::upsert_approval_policy(
            project_id,
            OperationType::CreateCanister,
            ApprovalPolicy {
                policy_type: PolicyType::AutoApprove,
            },
        );
        user_id
    }

    fn org_of(user_id: UserId) -> OrgId {
        organization_repository::list_user_orgs(user_id)[0].0
    }

    fn project_of(user_id: UserId) -> crate::data::ProjectId {
        let team_id = team_repository::list_user_team_ids(user_id)[0];
        project_repository::list_team_project_ids(team_id)[0]
    }

    #[test]
    fn fresh_user_is_prunable() {
        let user_id = fresh_user();
        assert_eq!(user_blockers(user_id, NOW), vec![]);
        assert!(is_prunable_user(user_id, NOW));
    }

    #[test]
    fn user_with_canister_is_not_prunable() {
        let user_id = fresh_user();
        let project_id = project_of(user_id);
        canister_repository::create_canister(
            project_id,
            Canister {
                principal: fresh_principal(),
                name: None,
                deleted_at: None,
            },
        );

        assert!(user_blockers(user_id, NOW).contains(&StaleBlocker::HasCanisters));
        assert!(!is_prunable_user(user_id, NOW));
    }

    #[test]
    fn user_with_soft_deleted_canister_is_not_prunable() {
        let user_id = fresh_user();
        let project_id = project_of(user_id);
        let canister_id = canister_repository::create_canister(
            project_id,
            Canister {
                principal: fresh_principal(),
                name: None,
                deleted_at: None,
            },
        );
        canister_repository::soft_delete_canister(project_id, canister_id, NOW);

        assert!(user_blockers(user_id, NOW).contains(&StaleBlocker::HasCanisters));
    }

    // Empty scaffolding never blocks, however much of it there is: a user who
    // clicked "new org / team / project" but never deployed is exactly who we
    // want to prune.
    #[test]
    fn empty_second_org_does_not_block() {
        let user_id = fresh_user();
        let org_id = organization_repository::create_org(
            user_id,
            crate::data::Organization {
                name: "Second".to_string(),
            },
        );
        let team_id = team_repository::add_default_team(user_id, org_id);
        project_repository::add_default_project(team_id, org_id);

        assert_eq!(user_blockers(user_id, NOW), vec![]);
    }

    #[test]
    fn empty_extra_team_does_not_block() {
        let user_id = fresh_user();
        let org_id = org_of(user_id);
        team_repository::create_team(
            user_id,
            org_id,
            Team {
                org_id,
                name: "Extra".to_string(),
            },
        );

        assert_eq!(user_blockers(user_id, NOW), vec![]);
    }

    #[test]
    fn empty_extra_project_does_not_block() {
        let user_id = fresh_user();
        let org_id = org_of(user_id);
        project_repository::create_project(
            org_id,
            Project {
                org_id,
                name: "Extra".to_string(),
            },
        );

        assert_eq!(user_blockers(user_id, NOW), vec![]);
    }

    // A canister anywhere in the footprint -- even in an extra empty-looking
    // org -- blocks pruning.
    #[test]
    fn canister_in_second_org_blocks_pruning() {
        let user_id = fresh_user();
        let org_id = organization_repository::create_org(
            user_id,
            crate::data::Organization {
                name: "Second".to_string(),
            },
        );
        let team_id = team_repository::add_default_team(user_id, org_id);
        let project_id = project_repository::add_default_project(team_id, org_id);
        canister_repository::create_canister(
            project_id,
            Canister {
                principal: fresh_principal(),
                name: None,
                deleted_at: None,
            },
        );

        assert!(user_blockers(user_id, NOW).contains(&StaleBlocker::HasCanisters));
    }

    #[test]
    fn org_with_other_member_blocks_pruning() {
        let user_id = fresh_user();
        let other = fresh_user();
        let org_id = org_of(user_id);
        organization_repository::add_user_to_org(other, org_id);

        assert!(user_blockers(user_id, NOW).contains(&StaleBlocker::OrgHasOtherMembers));
    }

    #[test]
    fn team_with_other_member_blocks_pruning() {
        let user_id = fresh_user();
        let other = fresh_user();
        let team_id = team_repository::list_user_team_ids(user_id)[0];
        team_repository::add_user_to_team(other, team_id);

        assert!(user_blockers(user_id, NOW).contains(&StaleBlocker::TeamHasOtherMembers));
    }

    #[test]
    fn pending_invite_blocks_pruning() {
        let user_id = fresh_user();
        let org_id = org_of(user_id);
        invite_repository::create_invite(crate::data::OrgInvite {
            org_id,
            created_by: user_id,
            created_at_ns: NOW,
            expires_at_ns: NOW + 1,
            target: crate::data::InviteTarget::Email("x@example.com".to_string()),
            status: crate::data::InviteStatus::Pending,
        });

        assert!(user_blockers(user_id, NOW).contains(&StaleBlocker::HasPendingInvites));
    }

    #[test]
    fn staff_user_is_never_prunable() {
        let user_id = fresh_user();
        let mut profile = user_profile_repository::get_user_profile_by_user_id(&user_id).unwrap();
        profile.staff_permissions = Some(StaffPermissions::SUPPORT);
        user_profile_repository::update_user_profile(user_id, profile).unwrap();

        assert!(user_blockers(user_id, NOW).contains(&StaleBlocker::IsStaff));
    }

    #[test]
    fn empty_staff_permissions_do_not_block() {
        let user_id = fresh_user();
        let mut profile = user_profile_repository::get_user_profile_by_user_id(&user_id).unwrap();
        profile.staff_permissions = Some(StaffPermissions::EMPTY);
        user_profile_repository::update_user_profile(user_id, profile).unwrap();

        assert!(!user_blockers(user_id, NOW).contains(&StaleBlocker::IsStaff));
    }
}
