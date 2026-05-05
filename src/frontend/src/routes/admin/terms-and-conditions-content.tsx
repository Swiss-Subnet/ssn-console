import DOMPurify from 'dompurify';
import { useMemo, type FC } from 'react';
import { micromark } from 'micromark';

export type TermsAndConditionsContentProps = {
  value: string;
  className?: string;
};

export const TermsAndConditionsContent: FC<TermsAndConditionsContentProps> = ({
  value,
  className,
}) => {
  const sanitized = useMemo(
    () => DOMPurify.sanitize(micromark(value)),
    [value],
  );

  return (
    <div
      className={`prose dark:prose-invert min-w-full ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
