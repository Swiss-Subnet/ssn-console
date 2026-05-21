import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanTier, type OrgBillingPlan } from '@/lib/api-models';
import type { FC } from 'react';
import { useNavigate } from 'react-router';

interface OrganizationBillingPlanProps {
  plan: OrgBillingPlan;
}

const TIER_LABEL: Record<PlanTier, string> = {
  [PlanTier.Free]: 'Free',
  [PlanTier.Pro]: 'Pro',
  [PlanTier.Enterprise]: 'Enterprise',
};

export const OrganizationBillingPlan: FC<OrganizationBillingPlanProps> = ({
  plan,
}) => {
  const navigate = useNavigate();
  const atLimit = plan.canistersUsed >= plan.maxCanisters;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Billing Plan</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">Current plan</span>
          <span className="font-medium">{TIER_LABEL[plan.tier]}</span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">Canisters</span>
          <span
            className={atLimit ? 'text-destructive font-medium' : 'font-medium'}
          >
            {plan.canistersUsed} / {plan.maxCanisters}
          </span>
        </div>

        {plan.tier === PlanTier.Free && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/billing')}
          >
            Upgrade Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
