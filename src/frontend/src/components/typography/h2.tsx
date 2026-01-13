import { cn, type PC } from '@/lib/utils';

export type H2Props = React.HTMLAttributes<HTMLHeadingElement>;

export const H2: PC<H2Props> = ({ children, className, ...props }) => {
  return (
    <h2
      className={cn(
        'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
};
