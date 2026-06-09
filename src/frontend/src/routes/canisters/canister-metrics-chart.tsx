import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MetricRange, MetricSlug } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useEffect, useMemo, useState, type FC } from 'react';

type MetricOption = {
  slug: MetricSlug;
  label: string;
};

const METRIC_OPTIONS: MetricOption[] = [
  { slug: 'memory-bytes', label: 'Memory' },
  { slug: 'compute-time-seconds', label: 'Compute Time' },
  { slug: 'burned-cycles', label: 'Burned Cycles' },
];

type RangeOption = {
  label: string;
  durationMs: number;
  step: string;
};

const RANGE_OPTIONS = [
  { label: '1h', durationMs: 60 * 60 * 1000, step: '1m' },
  { label: '6h', durationMs: 6 * 60 * 60 * 1000, step: '5m' },
  { label: '24h', durationMs: 24 * 60 * 60 * 1000, step: '15m' },
  { label: '7d', durationMs: 7 * 24 * 60 * 60 * 1000, step: '1h' },
] as const satisfies readonly RangeOption[];

type Props = {
  canisterPrincipal: string;
};

export const CanisterMetricsChart: FC<Props> = ({ canisterPrincipal }) => {
  const metricsProxyApi = useAppStore(s => s.metricsProxyApi);
  const identity = useAppStore(s => s.identity);
  const [metric, setMetric] = useState<MetricSlug>('memory-bytes');
  const [range, setRange] = useState<RangeOption>(RANGE_OPTIONS[0]);
  const [data, setData] = useState<MetricRange | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    const to = new Date();
    const from = new Date(to.getTime() - range.durationMs);

    setIsLoading(true);
    setData(null);
    setIsUnavailable(false);
    metricsProxyApi
      .queryRange({
        canisterId: canisterPrincipal,
        metric,
        from,
        to,
        step: range.step,
        identity,
        signal: controller.signal,
      })
      .then(res => {
        if (controller.signal.aborted) return;
        setData(res);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('metrics-proxy queryRange failed:', err);
        setIsUnavailable(true);
        setIsLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [canisterPrincipal, metric, range, metricsProxyApi, identity]);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Metrics</span>
            <div className="flex flex-wrap gap-1">
              {RANGE_OPTIONS.map(opt => (
                <Button
                  key={opt.label}
                  variant={opt.label === range.label ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRange(opt)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-1">
          {METRIC_OPTIONS.map(opt => (
            <Button
              key={opt.slug}
              variant={opt.slug === metric ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMetric(opt.slug)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <MetricSparkline
          data={data}
          isLoading={isLoading}
          isUnavailable={isUnavailable}
        />
      </CardContent>
    </Card>
  );
};

type SparklineProps = {
  data: MetricRange | null;
  isLoading: boolean;
  isUnavailable: boolean;
};

const CHART_WIDTH = 600;
const CHART_HEIGHT = 180;
const PADDING = { top: 8, right: 8, bottom: 22, left: 56 };

const MetricSparkline: FC<SparklineProps> = ({
  data,
  isLoading,
  isUnavailable,
}) => {
  const computed = useMemo(() => {
    if (!data || data.points.length === 0) return null;
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const p of data.points) {
      const x = p.ts.getTime();
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (p.value < yMin) yMin = p.value;
      if (p.value > yMax) yMax = p.value;
    }
    const yPad = (yMax - yMin) * 0.1 || 1;
    const yLow = yMin - yPad;
    const yHigh = yMax + yPad;
    const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const sx = (x: number) =>
      PADDING.left +
      (xMax === xMin ? innerW / 2 : ((x - xMin) / (xMax - xMin)) * innerW);
    const sy = (y: number) =>
      PADDING.top +
      (yHigh === yLow ? innerH / 2 : ((yHigh - y) / (yHigh - yLow)) * innerH);
    const path = data.points
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.ts.getTime())} ${sy(p.value)}`,
      )
      .join(' ');
    return { path, sx, sy, xMin, xMax, yLow, yHigh };
  }, [data]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-xs">
        Loading...
      </div>
    );
  }
  if (isUnavailable) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-xs">
        Metrics are not available right now.
      </div>
    );
  }
  if (!data || !computed) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-xs">
        No data.
      </div>
    );
  }

  const yTicks = [
    computed.yLow,
    (computed.yLow + computed.yHigh) / 2,
    computed.yHigh,
  ];
  const xTicks = [
    new Date(computed.xMin),
    new Date((computed.xMin + computed.xMax) / 2),
    new Date(computed.xMax),
  ];

  return (
    <div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        {yTicks.map((v, i) => {
          const y = computed.sy(v);
          return (
            <g key={i}>
              <line
                x1={PADDING.left}
                x2={CHART_WIDTH - PADDING.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <text
                x={PADDING.left - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatAxisValue(v, data.unit)}
              </text>
            </g>
          );
        })}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={
              i === 0
                ? PADDING.left
                : i === xTicks.length - 1
                  ? CHART_WIDTH - PADDING.right
                  : PADDING.left +
                    (CHART_WIDTH - PADDING.left - PADDING.right) / 2
            }
            y={CHART_HEIGHT - 6}
            textAnchor={
              i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'
            }
            className="fill-muted-foreground text-[10px]"
          >
            {formatAxisTime(t)}
          </text>
        ))}
        <path
          d={computed.path}
          className="stroke-primary fill-none"
          strokeWidth={1.5}
        />
      </svg>
      <p className="text-muted-foreground mt-2 text-xs">{data.description}</p>
    </div>
  );
};

function formatAxisValue(v: number, unit: string): string {
  if (unit === 'bytes') {
    return formatBytesShort(v);
  }
  if (unit === 'cycles') {
    return formatCyclesShort(v);
  }
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return v.toFixed(0);
}

// Cycles are large integers (a 1B-cycle call is small), so the useful
// range is M..T. Below 1M we render the raw count so dev/idle values
// still read sensibly.
function formatCyclesShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  return v.toFixed(0);
}

function formatBytesShort(v: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = Math.abs(v);
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return n.toFixed(n < 10 && i > 0 ? 1 : 0) + units[i];
}

function formatAxisTime(t: Date): string {
  const today = new Date();
  if (
    t.getFullYear() === today.getFullYear() &&
    t.getMonth() === today.getMonth() &&
    t.getDate() === today.getDate()
  ) {
    return t.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
