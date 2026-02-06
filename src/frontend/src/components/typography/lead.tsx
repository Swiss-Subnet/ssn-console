import { cn, type PC } from '@/lib/utils';

export type LeadProps = React.HTMLAttributes<HTMLParagraphElement>;

export const Lead: PC<LeadProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <p className={cn('text-muted-foreground text-xl', className)} {...props}>
      {children}
    </p>
  );
};
