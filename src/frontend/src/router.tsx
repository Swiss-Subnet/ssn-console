import { DefaultLayout } from '@/components/layout/default-layout';
import { lazy, type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const Home = lazy(() => import('@/routes/home/home'));
const TermsAndConditions = lazy(
  () => import('@/routes/terms-and-conditions/terms-and-conditions'),
);
const Canisters = lazy(() => import('@/routes/canisters/canisters'));
const Admin = lazy(() => import('@/routes/admin/admin'));

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Home />} />
        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="canisters" element={<Canisters />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
