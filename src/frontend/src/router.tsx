import { DefaultLayout } from '@/components/layout/default-layout';
import { ProjectLayout } from '@/components/layout/project-layout';
import { lazy, type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const Home = lazy(() => import('@/routes/home/home'));
const TermsAndConditions = lazy(
  () => import('@/routes/terms-and-conditions/terms-and-conditions'),
);
const Canisters = lazy(() => import('@/routes/canisters/canisters'));
const CanisterDetail = lazy(() => import('@/routes/canisters/canister-detail'));
const RedirectToProjectCanisters = lazy(
  () =>
    import('@/routes/redirect-to-project-canisters/redirect-to-project-canisters'),
);
const Admin = lazy(() => import('@/routes/admin/admin'));
const Verify = lazy(() => import('@/routes/verify/verify'));
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

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Home />} />
        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="canisters" element={<RedirectToProjectCanisters />} />
        <Route path="admin" element={<Admin />} />
        <Route
          path="admin/users/:userId/canisters"
          element={<UserCanisters />}
        />
        <Route path="verify" element={<Verify />} />
        <Route path="organizations/new" element={<CreateOrganization />} />
        <Route
          path="organizations/:orgId/settings"
          element={<OrganizationSettings />}
        />
        <Route path="organizations/:orgId/teams" element={<TeamList />} />
        <Route path="organizations/:orgId/teams/new" element={<CreateTeam />} />
        <Route
          path="organizations/:orgId/teams/:teamId/settings"
          element={<TeamSettings />}
        />

        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route path="canisters" element={<Canisters />} />
          <Route path="canisters/:canisterId" element={<CanisterDetail />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
