import { Button, type ButtonProps } from '@/components/ui/button';
import type { PC } from '@/lib/utils';
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
      className={`absolute ${isLoading ? 'visible-interactive' : 'hidden-inert'}`}
    >
      {isLoading && <LoaderIcon className="animate-spin" />}
    </span>

    <span className={`${isLoading ? 'hidden-inert' : 'visible-interactive'}`}>
      {children}
    </span>
  </Button>
);
