import DOMPurify from 'dompurify';
import { useMemo, type FC } from 'react';
import { micromark } from 'micromark';

export type TermsAndConditionsContentProps = {
  // The HTML to render. Pass already-rendered HTML (as the API mappers
  // produce) or set `raw` to true to treat the value as markdown source
  // and run it through micromark first - used for the live preview pane.
  value: string;
  raw?: boolean;
  className?: string;
};

export const TermsAndConditionsContent: FC<TermsAndConditionsContentProps> = ({
  value,
  raw,
  className,
}) => {
  const sanitized = useMemo(() => {
    const html = raw ? micromark(value) : value;
    return DOMPurify.sanitize(html);
  }, [value, raw]);

  return (
    <div
      className={`prose dark:prose-invert min-w-full ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
