import { DefaultLayout } from '@/components/layout/default-layout';
import { lazy, type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const Home = lazy(() => import('@/routes/home/home'));
const Canisters = lazy(() => import('@/routes/canisters/canisters'));
const Admin = lazy(() => import('@/routes/admin/admin'));

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Home />} />
        <Route path="canisters" element={<Canisters />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
