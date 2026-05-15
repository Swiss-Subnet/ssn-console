mod email;
mod name;

pub use email::Email;
pub use name::{validate_optional_principal_name, CanisterName, OrgName, ProjectName, TeamName};
