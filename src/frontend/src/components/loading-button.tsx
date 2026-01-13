import { Button, type ButtonProps } from '@/components/ui/button';
import { cn, type PC } from '@/lib/utils';
import { LoaderIcon } from 'lucide-react';

export type LoadingButtonProps = ButtonProps & {
  isLoading: boolean;
};

export const LoadingButton: PC<LoadingButtonProps> = ({
  isLoading,
  children,
  ...props
}) => (
  <Button disabled={isLoading} {...props}>
    <span
      className={cn(
        'absolute',
        isLoading ? 'visible-interactive' : 'hidden-inert',
      )}
    >
      <LoaderIcon className="animate-spin" />
    </span>

    <span className={cn(isLoading ? 'hidden-inert' : 'visible-interactive')}>
      {children}
    </span>
  </Button>
);
