# User Management

Users are identified by their ICP Principal. A `UserProfile` stores
account-level information and is the entry point to the entity
hierarchy.

## Data Model

The `UserProfile` struct:

```rust
pub struct UserProfile {
    pub email: Option<String>,
    pub email_verified: bool,
    pub status: UserStatus,  // Active | Inactive
}
```

Default state on creation: no email, not verified, Inactive.

### Data Storage

| Store                             | Type                               | Purpose                   |
| --------------------------------- | ---------------------------------- | ------------------------- |
| `user_profiles`                   | `BTreeMap<Uuid, UserProfile>`      | Profile records           |
| `user_profile_principal_index`    | `BTreeMap<Principal, Uuid>`        | Principal -> user ID      |
| `user_profile_id_principal_index` | `BTreeMap<Uuid, Principal>`        | User ID -> principal      |
| `user_stats`                      | Counters (total, active, inactive) | Aggregate user statistics |

Memory IDs 0-2 and 7 in `memory_manager.rs`.

## Candid Interface

The API is split between self-service endpoints (caller acts on own
profile) and admin endpoints.

### Self-service Endpoints

| Endpoint                 | Type     | Description                               |
| ------------------------ | -------- | ----------------------------------------- |
| `get_my_user_profile`    | `query`  | Get caller's profile (returns `opt`)      |
| `create_my_user_profile` | `update` | Create profile + default org/team/project |
| `update_my_user_profile` | `update` | Update caller's email                     |
| `verify_my_email`        | `update` | Verify email via JWT token                |

### Admin Endpoints

| Endpoint              | Type     | Description                      |
| --------------------- | -------- | -------------------------------- |
| `list_user_profiles`  | `query`  | List all user profiles           |
| `update_user_profile` | `update` | Update a user's status           |
| `get_user_stats`      | `query`  | Get total/active/inactive counts |

### Candid Types

```candid
type UserProfile = record {
  id : text;
  email : opt text;
  email_verified : bool;
  status : UserStatus;
  is_admin : bool;
};

type UserStatus = variant {
  Active;
  Inactive;
};
```

The `is_admin` field is computed at query time (not stored) based on
whether the user's principal matches the canister controller.

## Signup Flow

`create_my_user_profile` is idempotent-guarded: it rejects if a
profile already exists for the caller's principal. On success it
creates the full default hierarchy:

1. `UserProfile` (Inactive, no email)
2. "Default Organization" (user added as member)
3. "Default Team" (user added as member, linked to org)
4. "Default Project" (linked to team and org)
5. Two `ApprovalPolicy` entries (AutoApprove for CreateCanister and
   AddCanisterController)

## Email Verification

Email verification uses a JWT-based flow:

1. User sets their email via `update_my_user_profile`.
2. The offchain service sends a verification email containing a
   signed JWT with the email address.
3. User calls `verify_my_email` with the JWT token.
4. The canister verifies the JWT signature (Ed25519), checks the
   token email matches the profile email, and sets
   `email_verified = true`.

The public key for JWT verification is stored as a runtime
environment variable (`PUBLIC_KEY`) on the canister.

## Frontend

- **Home page** (`/`) -- shows auth prompts and profile creation.
- **Admin page** (`/admin`) -- lists all users, shows stats, allows
  status changes.
- **Verify page** (`/verify`) -- handles email verification callback.

State is managed via the Zustand store slices `user-profile.ts`
(own profile) and `users.ts` (admin user list).

## Known Gaps

- **No user deletion.** There is no way to delete a user profile.
- **No profile metadata.** No display name, avatar, or other fields
  beyond email.
- **No principal migration.** If a user loses access to their
  principal, there is no recovery path.
