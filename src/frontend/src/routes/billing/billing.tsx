import { Container } from '@/components/layout/container';
import { H1 } from '@/components/typography/h1';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PlanTier,
  type MyOrgBillingPlan,
  type Project,
  type ProjectUsage,
} from '@/lib/api-models';
import { selectOrgMap, useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { formatBytes } from '@/lib/format';
import { Loader2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { UsageMetricsGrid } from '@/components/usage-metrics-grid';

const TIER_LABEL: Record<PlanTier, string> = {
  [PlanTier.Free]: 'Free',
  [PlanTier.Pro]: 'Pro',
  [PlanTier.Enterprise]: 'Enterprise',
};

const OrgBillingListItem: FC<{ plan: MyOrgBillingPlan }> = ({ plan }) => {
  const { loadOrgProjects, loadProjectUsage, loadOrgUsage } = useAppStore();
  const orgMap = useAppStore(selectOrgMap);
  const org = orgMap.get(plan.orgId);
  const atLimit = plan.canistersUsed >= plan.maxCanisters;

  const [isExpanded, setIsExpanded] = useState(false);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectUsages, setProjectUsages] = useState<
    Record<string, ProjectUsage | null>
  >({});
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [totalOrgUsage, setTotalOrgUsage] = useState<ProjectUsage | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      setIsLoadingUsage(true);
      try {
        const [projs, orgUsage] = await Promise.all([
          loadOrgProjects(plan.orgId),
          loadOrgUsage(plan.orgId),
        ]);

        setProjects(projs);
        setTotalOrgUsage(orgUsage);

        const usages: Record<string, ProjectUsage | null> = {};
        const usagePromises = projs.map(async project => {
          try {
            const usageRes = await loadProjectUsage(project.id);
            usages[project.id] = usageRes.project;
          } catch (err) {
            showErrorToast(
              `Failed to load usage for project ${project.id}`,
              err,
            );
            usages[project.id] = null;
          }
        });

        await Promise.all(usagePromises);

        setProjectUsages(usages);
      } catch (err) {
        showErrorToast('Failed to load org projects:', err);
      } finally {
        setIsLoadingUsage(false);
      }
    }

    if (isExpanded && projects === null && !isLoadingUsage) {
      fetchUsage();
    }
  }, [isExpanded, plan.orgId, loadOrgProjects, loadProjectUsage, loadOrgUsage]);

  return (
    <div className="space-y-2 py-4">
      <div
        className="group flex cursor-pointer items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div>
            <div className="font-medium">{org?.name ?? plan.orgId}</div>
            <div className="text-muted-foreground text-xs">
              {TIER_LABEL[plan.tier]} plan
            </div>
          </div>
        </div>

        <div className="flex gap-6 text-right text-sm">
          {totalOrgUsage && plan.maxStorageBytes !== null && (
            <div>
              <div className="text-muted-foreground text-xs">Memory</div>
              <span
                className={
                  totalOrgUsage.memoryBytes >= plan.maxStorageBytes
                    ? 'text-destructive font-medium'
                    : 'font-medium'
                }
              >
                {formatBytes(totalOrgUsage.memoryBytes)} /{' '}
                {formatBytes(plan.maxStorageBytes)}
              </span>
            </div>
          )}
          <div>
            <div className="text-muted-foreground text-xs">Canisters</div>
            <span
              className={
                atLimit ? 'text-destructive font-medium' : 'font-medium'
              }
            >
              {plan.canistersUsed} / {plan.maxCanisters}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-2 pr-2 pb-1 pl-10">
          {isLoadingUsage && projects === null ? (
            <div className="flex justify-center py-4">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : projects && projects.length === 0 ? (
            <div className="text-muted-foreground py-2 text-sm">
              No projects found.
            </div>
          ) : (
            projects && (
              <div className="space-y-4">
                <div className="space-y-4">
                  {projects.map(proj => {
                    const usage = projectUsages[proj.id];
                    return (
                      <div
                        key={proj.id}
                        className="overflow-hidden rounded-md border"
                      >
                        <div className="bg-muted/50 flex items-center justify-between border-b p-3 font-medium">
                          <span>{proj.name}</span>
                          <span className="text-muted-foreground text-sm font-normal">
                            {usage ? formatBytes(usage.memoryBytes) : '-'}{' '}
                            stored
                          </span>
                        </div>
                        {usage ? (
                          <div className="bg-background p-4">
                            <UsageMetricsGrid usage={usage} />
                          </div>
                        ) : (
                          <div className="text-muted-foreground p-4 text-sm">
                            Usage data not available
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

const Billing: FC = () => {
  const { loadMyOrgBillingPlans } = useAppStore();
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
            <div className="divide-y">
              {plans.map(plan => (
                <OrgBillingListItem key={plan.orgId} plan={plan} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Billing;
