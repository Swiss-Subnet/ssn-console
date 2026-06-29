// Black-box PocketIC tests for FixedQuorum approval counting.

mod common;

use common::bindings::*;
use common::scenario::*;
use common::{principal, Fixture};

const MEMBER: u8 = 1;
const ADMIN_DEVICE2: u8 = 2;

// A FixedQuorum counts distinct approving users, not principals. One user with
// several linked principals must not satisfy an N-of-M quorum alone.
#[test]
fn one_user_with_many_principals_cannot_satisfy_quorum_alone() {
    let f = Fixture::get();
    let admin = f.admin;
    let admin_device2 = principal(ADMIN_DEVICE2);
    let member = principal(MEMBER);

    let project = default_project(&f, admin);

    // A second approver user, so a threshold of 2 is legitimately reachable.
    let member_uid = create_user(&f, member);
    invite_and_accept(&f, admin, &f.admin_org.id, member);
    let team = create_team_with_perms(&f, admin, &f.admin_org.id, "Approvers", no_org_perms());
    add_member_to_team(&f, admin, &team, &member_uid);
    add_team_to_project(&f, admin, &project.id, &team);
    set_team_project_perms(
        &f,
        admin,
        &project.id,
        &team,
        ProjectPermissions {
            proposal_approve: true,
            ..no_project_perms()
        },
    );

    // Admin links a second device to its own account: one user, two approver
    // principals.
    link_principal(&f, admin, admin_device2, "DEVICE02");

    set_approval_policy(
        &f,
        admin,
        &project.id,
        OperationType::AddCanisterController {},
        PolicyType::FixedQuorum { threshold: 2 },
    );

    let proposal = create_proposal(
        &f,
        admin,
        &project.id,
        ProposalOperation::AddCanisterController {
            canister_id: principal(0x10),
            controller_id: principal(0x11),
        },
    );

    // The admin approves from one device; the second device is the same user,
    // so its vote is rejected rather than counted twice.
    vote(&f, admin, &proposal.id, Vote::Approve {}).expect("first device approves");
    let second_device = vote(&f, admin_device2, &proposal.id, Vote::Approve {});
    assert!(
        second_device.is_err(),
        "a second principal of the same user must not cast a second vote",
    );

    let after_self = get_proposal(&f.env, admin, &proposal.id);
    assert!(
        matches!(
            after_self.status,
            Some(ProposalStatus::PendingApproval { .. })
        ),
        "one user must not satisfy a 2-quorum alone; status was {:?}",
        after_self.status,
    );

    // A genuine second user pushes it over the threshold.
    vote(&f, member, &proposal.id, Vote::Approve {}).expect("second user approves");
    let after_second_user = get_proposal(&f.env, admin, &proposal.id);
    assert!(
        !matches!(
            after_second_user.status,
            Some(ProposalStatus::PendingApproval { .. })
        ),
        "two distinct users must satisfy the 2-quorum; status was {:?}",
        after_second_user.status,
    );
}
