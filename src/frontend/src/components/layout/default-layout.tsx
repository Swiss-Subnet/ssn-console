import { Container } from '@/components/layout/container';
import { Header } from '@/components/layout/header';
import { type FC } from 'react';
import { Outlet } from 'react-router';

export const DefaultLayout: FC = () => (
  <main className="flex w-full flex-col">
    <Header />

    <Container>
      <Outlet />
    </Container>
  </main>
);
