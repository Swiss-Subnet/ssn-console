import { type FC } from 'react';
import { type ProjectUsage } from '@/lib/api-models';
import {
  formatBytes,
  formatCycles,
  formatNumber,
  formatDuration,
} from '@/lib/format';

interface UsageMetricsGridProps {
  usage: ProjectUsage;
}

export const UsageMetricsGrid: FC<UsageMetricsGridProps> = ({ usage }) => {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">Memory</span>
        <span className="text-right font-medium">
          {formatCycles(usage.memory)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">
          Memory (Byte Seconds)
        </span>
        <span className="text-right font-medium">
          {formatNumber(usage.memoryBytes)} byte-s
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">
          Compute Allocation
        </span>
        <span className="text-right font-medium">
          {formatCycles(usage.computeAllocation)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">
          Compute Allocation (Percent Seconds)
        </span>
        <span className="text-right font-medium">
          {formatNumber(usage.computeAllocationPercent)} %-s
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">Ingress Induction</span>
        <span className="text-right font-medium">
          {formatCycles(usage.ingressInduction)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">
          Ingress Induction (Bytes)
        </span>
        <span className="text-right font-medium">
          {formatBytes(usage.ingressInductionBytesTotal)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">
          Req/Res Transmission
        </span>
        <span className="text-right font-medium">
          {formatCycles(usage.requestAndResponseTransmission)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">
          Transmission (Bytes)
        </span>
        <span className="text-right font-medium">
          {formatBytes(usage.transmissionBytesTotal)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">Uninstall</span>
        <span className="text-right font-medium">
          {formatCycles(usage.uninstall)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">Uninstalls Total</span>
        <span className="text-right font-medium">
          {formatNumber(usage.uninstallsTotal)} times
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">Instructions</span>
        <span className="text-right font-medium">
          {formatCycles(usage.instructions)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">Compute Time</span>
        <span className="text-right font-medium">
          {formatDuration(usage.computeTimeSecondsTotal)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">Burned Cycles</span>
        <span className="text-right font-medium">
          {formatCycles(usage.burnedCycles)}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm">HTTP Outcalls</span>
        <span className="text-right font-medium">
          {formatCycles(usage.httpOutcalls)}
        </span>
      </div>
    </div>
  );
};
