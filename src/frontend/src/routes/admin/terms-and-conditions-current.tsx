import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import type { FC } from 'react';
import { Link } from 'react-router';
import { TermsAndConditionsContent } from '@/routes/admin/terms-and-conditions-content';

export type TermsAndConditionsCurrentProps = {
  className?: string;
};

export const TermsAndConditionsCurrent: FC<TermsAndConditionsCurrentProps> = ({
  className,
}) => {
  const { termsAndConditions } = useAppStore();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Current Terms and Conditions</CardTitle>
        {termsAndConditions && (
          <Link
            to="/terms-and-conditions"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Open page
          </Link>
        )}
      </CardHeader>

      <CardContent>
        {termsAndConditions ? (
          <>
            <p>
              <span className="mr-2 font-bold">Effective from:</span>
              {termsAndConditions.createdAt.toLocaleDateString()}
            </p>

            <p className="mt-3">
              <span className="mr-2 font-bold">Comment:</span>
              {termsAndConditions.comment}
            </p>

            <TermsAndConditionsContent
              value={termsAndConditions.content}
              className="mt-6"
            />
          </>
        ) : (
          <p className="text-muted-foreground">
            No terms and conditions have been published yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
