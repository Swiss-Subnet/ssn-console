import { DefaultLayout } from '@/components/layout/default-layout';
import { Dashboard } from '@/routes/dashboard';
import { Home } from '@/routes/home';
import type { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
