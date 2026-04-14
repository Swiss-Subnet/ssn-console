import { Container } from '@/components/layout/container';
import type { FC } from 'react';
import { Outlet } from 'react-router';

export const ProjectLayout: FC = () => {
  return (
    <Container>
      <Outlet />
    </Container>
  );
};
