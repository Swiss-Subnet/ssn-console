import { Container } from '@/components/layout/container';
import { Header } from '@/components/layout/header';
import type { PC } from '@/lib/utils';
import { Outlet } from 'react-router';

export const DefaultLayout: PC = () => (
  <main className="flex w-full flex-col">
    <Header />

    <Container>
      <Outlet />
    </Container>
  </main>
);
