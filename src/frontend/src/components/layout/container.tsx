import type { PC } from '@/lib/utils';

export const Container: PC = ({ children }) => (
  <div className="container mx-auto max-w-4xl p-3">{children}</div>
);
