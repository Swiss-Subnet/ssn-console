import { type FC } from 'react';

type Props = {
  message?: string;
  className?: string;
};

export const LoadingSpinner: FC<Props> = ({ message, className = '' }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />

      {message ? (
        <p className="text-muted-foreground text-sm">{message}</p>
      ) : null}
    </div>
  );
};

export default LoadingSpinner;
