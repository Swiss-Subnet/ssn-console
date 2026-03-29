import { DefaultLayout } from '@/components/layout/default-layout';
import { ProjectLayout } from '@/components/layout/project-layout';
import { lazy, type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const Home = lazy(() => import('@/routes/home/home'));
const TermsAndConditions = lazy(
  () => import('@/routes/terms-and-conditions/terms-and-conditions'),
);
const Canisters = lazy(() => import('@/routes/canisters/canisters'));
const RedirectToProjectCanisters = lazy(
  () =>
    import('@/routes/redirect-to-project-canisters/redirect-to-project-canisters'),
);
const Admin = lazy(() => import('@/routes/admin/admin'));
const Verify = lazy(() => import('@/routes/verify/verify'));

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Home />} />
        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="canisters" element={<RedirectToProjectCanisters />} />
        <Route path="admin" element={<Admin />} />
        <Route path="verify" element={<Verify />} />

        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route path="canisters" element={<Canisters />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
