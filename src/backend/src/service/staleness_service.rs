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
