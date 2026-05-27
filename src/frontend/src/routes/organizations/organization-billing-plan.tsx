import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PlanTier,
  type OrgBillingPlan,
  type ProjectUsage,
} from '@/lib/api-models';
import { type FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '@/lib/store';
import { formatBytes } from '@/lib/format';
import { Loader2 } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';
import { UsageMetricsGrid } from '@/components/usage-metrics-grid';

interface OrganizationBillingPlanProps {
  plan: OrgBillingPlan;
  orgId: string;
}

const TIER_LABEL: Record<PlanTier, string> = {
  [PlanTier.Free]: 'Free',
  [PlanTier.Pro]: 'Pro',
  [PlanTier.Enterprise]: 'Enterprise',
};

export const OrganizationBillingPlan: FC<OrganizationBillingPlanProps> = ({
  plan,
  orgId,
}) => {
  const navigate = useNavigate();
  const atLimit = plan.canistersUsed >= plan.maxCanisters;

  const { loadOrgUsage } = useAppStore();
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  useEffect(() => {
    setIsLoadingUsage(true);

    loadOrgUsage(orgId)
      .then(setUsage)
      .catch(err => {
        showErrorToast('Failed to load org usage:', err);
      })
      .finally(() => {
        setIsLoadingUsage(false);
      });
  }, [orgId, loadOrgUsage]);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Billing Plan</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoadingUsage ? (
          <div className="flex justify-center py-4">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : usage ? (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Plan Summary</h3>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">
                Current plan
              </span>
              <span className="font-medium">{TIER_LABEL[plan.tier]}</span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Canisters</span>
              <span
                className={
                  atLimit ? 'text-destructive font-medium' : 'font-medium'
                }
              >
                {plan.canistersUsed} / {plan.maxCanisters}
              </span>
            </div>

            {plan.maxStorageBytes !== null && (
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-sm">
                  Storage Capacity
                </span>
                <span
                  className={
                    usage.memoryBytes >= plan.maxStorageBytes
                      ? 'text-destructive font-medium'
                      : 'font-medium'
                  }
                >
                  {formatBytes(usage.memoryBytes)} /{' '}
                  {formatBytes(plan.maxStorageBytes)}
                </span>
              </div>
            )}

            <div className="mt-8 space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Usage Metrics</h3>
              <p className="text-muted-foreground mb-4 text-xs">
                Note: Some metrics are measured over time. For example, "Byte
                Seconds" represents the number of bytes stored multiplied by the
                duration they were stored (in seconds). "Percent Seconds" works
                similarly for resource allocation percentages over time.
              </p>

              <UsageMetricsGrid usage={usage} />
            </div>
          </div>
        ) : null}

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
