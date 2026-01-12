import { DefaultLayout } from '@/components/layout/default-layout';
import { lazy, type FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const Home = lazy(() => import('@/routes/home'));
const Dashboard = lazy(() => import('@/routes/dashboard'));
const Admin = lazy(() => import('@/routes/admin'));

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
