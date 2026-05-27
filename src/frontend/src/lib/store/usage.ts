import type { AppStateCreator, UsageSlice } from '@/lib/store/model';
import { type ProjectUsage } from '@/lib/api-models';
import { showErrorToast } from '@/lib/toast';

export const createUsageSlice: AppStateCreator<UsageSlice> = (_set, get) => ({
  loadProjectUsage: async (projectId: string, billingMonth?: string) => {
    const { usageApi } = get();
    return usageApi.getUsage({ projectId, billingMonth: billingMonth ?? null });
  },

  loadOrgUsage: async (orgId: string, billingMonth?: string) => {
    const { loadOrgProjects, loadProjectUsage } = get();
    const projects = await loadOrgProjects(orgId);

    const aggregatedUsage: ProjectUsage = {
      memory: 0n,
      memoryBytes: 0n,
      computeAllocation: 0n,
      computeAllocationPercent: 0n,
      ingressInduction: 0n,
      ingressInductionBytesTotal: 0n,
      instructions: 0n,
      computeTimeSecondsTotal: 0n,
      requestAndResponseTransmission: 0n,
      transmissionBytesTotal: 0n,
      uninstall: 0n,
      uninstallsTotal: 0n,
      httpOutcalls: 0n,
      burnedCycles: 0n,
    };

    const projectUsagePromises = projects.map(async project => {
      try {
        const usage = await loadProjectUsage(project.id, billingMonth);
        aggregatedUsage.memory += usage.project.memory;
        aggregatedUsage.memoryBytes += usage.project.memoryBytes;
        aggregatedUsage.computeAllocation += usage.project.computeAllocation;
        aggregatedUsage.computeAllocationPercent +=
          usage.project.computeAllocationPercent;
        aggregatedUsage.ingressInduction += usage.project.ingressInduction;
        aggregatedUsage.ingressInductionBytesTotal +=
          usage.project.ingressInductionBytesTotal;
        aggregatedUsage.instructions += usage.project.instructions;
        aggregatedUsage.computeTimeSecondsTotal +=
          usage.project.computeTimeSecondsTotal;
        aggregatedUsage.requestAndResponseTransmission +=
          usage.project.requestAndResponseTransmission;
        aggregatedUsage.transmissionBytesTotal +=
          usage.project.transmissionBytesTotal;
        aggregatedUsage.uninstall += usage.project.uninstall;
        aggregatedUsage.uninstallsTotal += usage.project.uninstallsTotal;
        aggregatedUsage.httpOutcalls += usage.project.httpOutcalls;
        aggregatedUsage.burnedCycles += usage.project.burnedCycles;
      } catch (err) {
        showErrorToast(`Failed to load usage for project ${project.id}`, err);
      }
    });

    await Promise.all(projectUsagePromises);

    return aggregatedUsage;
  },
});
