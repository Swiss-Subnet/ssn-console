import type { ParentComponent } from '@/lib/utils';

export const Container: ParentComponent = ({ children }) => (
  <div className="container mx-auto max-w-3xl p-3">{children}</div>
);
