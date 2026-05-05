import { AdminLayout } from '@/components/layout/admin-layout';
import { AdminRoute } from '@/components/layout/admin-route';
import { DefaultLayout } from '@/components/layout/default-layout';
import { ProjectLayout } from '@/components/layout/project-layout';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { lazy, type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const Home = lazy(() => import('@/routes/home/home'));
const TermsAndConditions = lazy(
  () => import('@/routes/terms-and-conditions/terms-and-conditions'),
);
const Canisters = lazy(() => import('@/routes/canisters/canisters'));
const CanisterDetail = lazy(() => import('@/routes/canisters/canister-detail'));
const ProposalList = lazy(() => import('@/routes/proposals/proposal-list'));
const ProposalDetail = lazy(() => import('@/routes/proposals/proposal-detail'));
const RedirectToProjectCanisters = lazy(
  () =>
    import('@/routes/redirect-to-project-canisters/redirect-to-project-canisters'),
);
const OverviewTab = lazy(() => import('@/routes/admin/overview-tab'));
const UsersTab = lazy(() => import('@/routes/admin/users-tab'));
const TrustedPartnersTab = lazy(
  () => import('@/routes/admin/trusted-partners-tab'),
);
const TermsAndConditionsTab = lazy(
  () => import('@/routes/admin/terms-and-conditions-tab'),
);
const StaffTab = lazy(() => import('@/routes/admin/staff-tab'));
const Verify = lazy(() => import('@/routes/verify/verify'));
const Dashboard = lazy(() => import('@/routes/dashboard/dashboard'));
const Billing = lazy(() => import('@/routes/billing/billing'));
const CreateOrganization = lazy(
  () => import('@/routes/organizations/create-organization'),
);
const OrganizationSettings = lazy(
  () => import('@/routes/organizations/organization-settings'),
);
const TeamList = lazy(() => import('@/routes/organizations/teams/team-list'));
const CreateTeam = lazy(
  () => import('@/routes/organizations/teams/create-team'),
);
const TeamSettings = lazy(
  () => import('@/routes/organizations/teams/team-settings'),
);
const UserCanisters = lazy(() => import('@/routes/admin/user-canisters'));
const ProjectList = lazy(
  () => import('@/routes/organizations/projects/project-list'),
);
const CreateProject = lazy(
  () => import('@/routes/organizations/projects/create-project'),
);
const ProjectSettings = lazy(
  () => import('@/routes/organizations/projects/project-settings'),
);
const MyInvitations = lazy(() => import('@/routes/invitations/my-invitations'));

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Home />} />
        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="verify" element={<Verify />} />

        <Route element={<ProtectedRoute />}>
          <Route path="canisters" element={<RedirectToProjectCanisters />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="billing" element={<Billing />} />
          <Route path="organizations/new" element={<CreateOrganization />} />
          <Route
            path="organizations/:orgId/settings"
            element={<OrganizationSettings />}
          />
          <Route path="organizations/:orgId/teams" element={<TeamList />} />
          <Route
            path="organizations/:orgId/teams/new"
            element={<CreateTeam />}
          />
          <Route
            path="organizations/:orgId/teams/:teamId/settings"
            element={<TeamSettings />}
          />
          <Route
            path="organizations/:orgId/projects"
            element={<ProjectList />}
          />
          <Route
            path="organizations/:orgId/projects/new"
            element={<CreateProject />}
          />
          <Route
            path="organizations/:orgId/projects/:projectId/settings"
            element={<ProjectSettings />}
          />
          <Route path="invitations" element={<MyInvitations />} />

          <Route path="projects/:projectId" element={<ProjectLayout />}>
            <Route path="canisters" element={<Canisters />} />
            <Route path="canisters/:canisterId" element={<CanisterDetail />} />
            <Route path="proposals" element={<ProposalList />} />
            <Route path="proposals/:proposalId" element={<ProposalDetail />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<OverviewTab />} />
            <Route path="users" element={<UsersTab />} />
            <Route path="trusted-partners" element={<TrustedPartnersTab />} />
            <Route
              path="terms-and-conditions"
              element={<TermsAndConditionsTab />}
            />
            <Route path="staff" element={<StaffTab />} />
          </Route>
          <Route
            path="admin/users/:userId/canisters"
            element={<UserCanisters />}
          />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
