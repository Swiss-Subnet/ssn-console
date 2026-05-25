import { Container } from '@/components/layout/container';
import { H1 } from '@/components/typography/h1';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanTier, type MyOrgBillingPlan } from '@/lib/api-models';
import { selectOrgMap, useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { Sparkles } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';

const TIER_LABEL: Record<PlanTier, string> = {
  [PlanTier.Free]: 'Free',
  [PlanTier.Pro]: 'Pro',
  [PlanTier.Enterprise]: 'Enterprise',
};

const Billing: FC = () => {
  const { loadMyOrgBillingPlans } = useAppStore();
  const orgMap = useAppStore(selectOrgMap);

  const [plans, setPlans] = useState<MyOrgBillingPlan[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMyOrgBillingPlans()
      .then(p => {
        if (!cancelled) setPlans(p);
      })
      .catch(err => {
        if (cancelled) return;
        showErrorToast('Failed to load billing plans', err);
        // Leaving `plans` as null keeps the "Loading..." state visible so
        // the user can retry by reloading rather than seeing a misleading
        // "no organizations" placeholder.
      });
    return () => {
      cancelled = true;
    };
  }, [loadMyOrgBillingPlans]);

  return (
    <Container>
      <H1>Billing</H1>

      <Alert className="mt-6">
        <Sparkles />
        <AlertTitle>Purchase flow coming soon</AlertTitle>
        <AlertDescription>
          Plan upgrades and invoices will be available here. For now you can
          review your organizations' current plans and usage below.
        </AlertDescription>
      </Alert>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {plans === null ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : plans.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You don't belong to any organizations yet.
            </p>
          ) : (
            <ul className="divide-y">
              {plans.map(plan => {
                const org = orgMap.get(plan.orgId);
                const atLimit = plan.canistersUsed >= plan.maxCanisters;
                return (
                  <li
                    key={plan.orgId}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {org?.name ?? plan.orgId}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {TIER_LABEL[plan.tier]} plan
                      </div>
                    </div>
                    <span
                      className={
                        atLimit ? 'text-destructive font-medium' : 'font-medium'
                      }
                    >
                      {plan.canistersUsed} / {plan.maxCanisters} canisters
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Billing;
