import { Button } from '@/components/ui/button';
import { type FC } from 'react';

export type LinkCanisterButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
};

export const LinkCanisterButton: FC<LinkCanisterButtonProps> = ({
  isOpen,
  onToggle,
  className,
}) => {
  return (
    <Button
      variant="outline"
      {...(className !== undefined ? { className } : {})}
      onClick={onToggle}
    >
      {isOpen ? 'Cancel' : 'Link Existing Canister'}
    </Button>
  );
};
