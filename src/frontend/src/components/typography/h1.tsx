import { cn, type PC } from '@/lib/utils';

export type H1Props = React.HTMLAttributes<HTMLHeadingElement>;

export const H1: PC<H1Props> = ({ children, className, ...props }) => (
  <h1
    className={cn(
      'scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance',
      className,
    )}
    {...props}
  >
    {children}
  </h1>
);
