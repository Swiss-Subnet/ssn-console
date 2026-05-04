import { Actor, type HttpAgent } from '@icp-sdk/core/agent';
import {
  idlFactory,
  type _SERVICE,
  type Cursor,
  type CyclesMetricsSnapshotDto,
  type ListMetricsAfterResponse,
} from '@ssn/cycles-monitor-api';
import { pushMetrics, toHrTime } from './otlp';
import { ValueType, type Attributes } from '@opentelemetry/api';
import {
  AggregationTemporality,
  DataPointType,
  type DataPoint,
  type ResourceMetrics,
  type MetricData,
} from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { env } from './env';
import { Principal } from '@icp-sdk/core/principal';

const TIMESTAMP_FILE = '/data/.last-cycles-monitor-timestamp';

export async function syncCyclesMonitorMetrics(agent: HttpAgent) {
  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: env.CANISTER_ID_CYCLES_MONITOR,
  });

  console.log(
    '🚀 Fetching canister cycles metrics batches from the cycles monitor canister...',
  );

  let startTimestampNs: bigint;
  try {
    const content = await Bun.file(TIMESTAMP_FILE).text();
    startTimestampNs = BigInt(content.trim());
  } catch {
    const oneHourAgoMs = Date.now() - 60 * 60 * 1_000;
    startTimestampNs = BigInt(oneHourAgoMs) * 1_000_000n;
  }

  const minPrincipal = Principal.fromUint8Array(new Uint8Array(29));
  let cursor: Cursor = [startTimestampNs, minPrincipal];
  let totalPushed = 0;
  const previousSnapshots = new Map<string, CyclesMetricsSnapshotDto>();

  while (true) {
    const metricsRes: ListMetricsAfterResponse = await actor.list_metrics_after(
      {
        cursor: cursor ? [cursor] : [],
      },
    );
    if ('Err' in metricsRes) {
      throw new Error(metricsRes.Err.message);
    }

    if (metricsRes.Ok.snapshots.length > 0) {
      console.log(
        `🏗️ Retrieved ${metricsRes.Ok.snapshots.length} data points. Constructing OTLP payload...`,
      );
      const otlpPayload = buildOtlpPayload(
        metricsRes.Ok.snapshots,
        previousSnapshots,
      );

      console.log(`✉️ Pushing metrics to Grafana Alloy...`);
      await pushMetrics(otlpPayload);
      totalPushed += metricsRes.Ok.snapshots.length;
    }

    const nextCursor: Cursor | undefined = metricsRes.Ok.next_cursor[0];
    if (!nextCursor) {
      break;
    }
    cursor = nextCursor;
    await Bun.write(TIMESTAMP_FILE, nextCursor[0].toString());
  }

  if (totalPushed === 0) {
    console.log('😵 No new metrics to push.');
  } else {
    console.log(`✅ Successfully pushed ${totalPushed} metrics to Alloy.`);
  }
}

type MetricKey = Exclude<
  keyof CyclesMetricsSnapshotDto,
  'timestamp_ns' | 'canister_id'
>;

type BaseMetricBucket = {
  name: string;
  description: string;
  dataPoints: DataPoint<number>[];
};

type DerivedMetricBucket = {
  name: string;
  description: string;
  unit: string;
  valueType: ValueType;
  dataPoints: DataPoint<number>[];
};

type CounterDerivedMetricBucket = DerivedMetricBucket & {
  type: DataPointType.SUM;
  formula: (cycles: bigint) => bigint;
};

type GaugeDerivedMetricBucket = DerivedMetricBucket & {
  type: DataPointType.GAUGE;
  formula: (deltaCycles: bigint, deltaSeconds: bigint) => bigint;
};

type MetricBucket = {
  base: BaseMetricBucket;
  derived?: CounterDerivedMetricBucket | GaugeDerivedMetricBucket;
};

type BaseMetrics = Record<MetricKey, MetricBucket>;

// https://docs.internetcomputer.org/references/cycles-costs
const CYCLES_PER_GB_PER_SECOND = 127_000n;
const CYCLES_PER_PERCENT_COMPUTE_PER_SECOND = 10_000_000n;

// 1_200_000 is the base price for an ingress message, this is included in the
// bytes calculation so there is a 600 "byte" base price per ingress message.
const CYCLES_PER_INGRESS_BYTE = 2_000n;

// 260_000 is the base price for an xnet message, this is included in the
// bytes calculation so there is a 260 "byte" base price per xnet message.
const CYCLES_PER_TRANSMISSION_BYTE = 1_000n;

// The Internet Computer executes about 2 billion instructions per second.
// At a cost of 1 cycle per instruction, 1 second of compute costs 2,000,000,000 cycles.
const CYCLES_PER_SECOND_OF_COMPUTE = 2_000_000_000n;

const CYCLES_PER_UNINSTALL = 5_000_000n;

const BYTES_PER_GB = 1_024n * 1_024n * 1_024n;

function buildOtlpPayload(
  snapshots: CyclesMetricsSnapshotDto[],
  previousSnapshots: Map<string, CyclesMetricsSnapshotDto>,
): ResourceMetrics {
  const metricBuckets: BaseMetrics = {
    memory: {
      base: {
        name: 'ic_canister_memory_cycles_total',
        description: 'Cumulative cycles burned for memory',
        dataPoints: [],
      },
      derived: {
        name: 'ic_canister_memory_bytes',
        description: 'Canister memory in bytes',
        type: DataPointType.GAUGE,
        unit: 'By',
        valueType: ValueType.INT,
        dataPoints: [],
        formula: (deltaCycles, deltaSeconds) =>
          (deltaCycles * BYTES_PER_GB) /
          (deltaSeconds * CYCLES_PER_GB_PER_SECOND),
      },
    },
    compute_allocation: {
      base: {
        name: 'ic_canister_compute_allocation_cycles_total',
        description: 'Cumulative cycles burned for compute allocation',
        dataPoints: [],
      },
      derived: {
        name: 'ic_canister_compute_allocation_percent',
        description: 'Canister compute allocation percentage',
        type: DataPointType.GAUGE,
        unit: '%',
        valueType: ValueType.INT,
        dataPoints: [],
        formula: (deltaCycles, deltaSeconds) =>
          deltaCycles / (deltaSeconds * CYCLES_PER_PERCENT_COMPUTE_PER_SECOND),
      },
    },
    ingress_induction: {
      base: {
        name: 'ic_canister_ingress_induction_cycles_total',
        description: 'Cumulative cycles burned for ingress induction',
        dataPoints: [],
      },
      derived: {
        name: 'ic_canister_ingress_induction_bytes_total',
        description:
          'Total bytes of ingress induction including the base price represented as bytes',
        type: DataPointType.SUM,
        unit: 'By',
        valueType: ValueType.INT,
        dataPoints: [],
        formula: cycles => cycles / CYCLES_PER_INGRESS_BYTE,
      },
    },
    instructions: {
      base: {
        name: 'ic_canister_instructions_cycles_total',
        description: 'Cumulative cycles burned for instructions',
        dataPoints: [],
      },
      derived: {
        name: 'ic_canister_compute_time_seconds_total',
        description: 'Total compute time in seconds (2b instructions = 1s)',
        type: DataPointType.SUM,
        unit: 's',
        valueType: ValueType.INT,
        dataPoints: [],
        formula: cycles => cycles / CYCLES_PER_SECOND_OF_COMPUTE,
      },
    },
    request_and_response_transmission: {
      base: {
        name: 'ic_canister_request_response_transmission_cycles_total',
        description:
          'Cumulative cycles burned for request and response transmission',
        dataPoints: [],
      },
      derived: {
        name: 'ic_canister_transmission_bytes_total',
        description:
          'Total bytes of request and response transmission including the base price represented as bytes',
        type: DataPointType.SUM,
        unit: 'By',
        valueType: ValueType.INT,
        dataPoints: [],
        formula: cycles => cycles / CYCLES_PER_TRANSMISSION_BYTE,
      },
    },
    uninstall: {
      base: {
        name: 'ic_canister_uninstall_cycles_total',
        description: 'Cumulative cycles burned for uninstall',
        dataPoints: [],
      },
      derived: {
        name: 'ic_canister_uninstalls_total',
        description: 'Total uninstalls',
        type: DataPointType.SUM,
        unit: '{uninstalls}',
        valueType: ValueType.INT,
        dataPoints: [],
        formula: cycles => cycles / CYCLES_PER_UNINSTALL,
      },
    },
    http_outcalls: {
      base: {
        name: 'ic_canister_http_outcalls_cycles_total',
        description: 'Cumulative cycles burned for HTTP outcalls',
        dataPoints: [],
      },
    },
    burned_cycles: {
      base: {
        name: 'ic_canister_burned_cycles_total',
        description: 'Total cumulative burned cycles',
        dataPoints: [],
      },
    },
  };

  for (const point of snapshots) {
    const canisterId = point.canister_id.toString();
    const prev = previousSnapshots.get(canisterId);

    const startTime = toHrTime(0n);
    const endTime = toHrTime(point.timestamp_ns);
    const attributes: Attributes = { canister_id: canisterId };

    for (const [key, bucket] of objectEntries(metricBuckets)) {
      const cycles = BigInt(point[key]);
      const cyclesNum = Number(cycles);

      bucket.base.dataPoints.push({
        startTime,
        endTime,
        attributes,
        value: cyclesNum,
      });

      if (bucket.derived) {
        if (bucket.derived.type === DataPointType.SUM) {
          bucket.derived.dataPoints.push({
            startTime,
            endTime,
            attributes,
            value: Number(bucket.derived.formula(cycles)),
          });
        } else {
          // this results in one 5-minute metric missing per sync
          // for low frequency polling (currently one hour), this results in
          // very low data loss that will be imperceptible on a monthly basis
          if (prev) {
            const deltaNs = point.timestamp_ns - prev.timestamp_ns;
            const deltaSeconds = deltaNs / 1_000_000_000n;

            if (deltaSeconds > 0) {
              const prevCycles = prev[key];
              const deltaCycles = cycles - prevCycles;

              bucket.derived.dataPoints.push({
                startTime: toHrTime(prev.timestamp_ns),
                endTime,
                attributes,
                value: Number(
                  bucket.derived.formula(deltaCycles, deltaSeconds),
                ),
              });
            }
          }
        }
      }
    }

    previousSnapshots.set(canisterId, point);
  }

  const generatedMetrics: MetricData[] = [];

  Object.values(metricBuckets).forEach(({ base, derived }) => {
    generatedMetrics.push({
      dataPointType: DataPointType.SUM,
      aggregationTemporality: AggregationTemporality.CUMULATIVE,
      isMonotonic: true,
      dataPoints: base.dataPoints,
      descriptor: {
        name: base.name,
        description: base.description,
        unit: 'cycles',
        valueType: ValueType.INT,
      },
    });

    if (derived) {
      generatedMetrics.push({
        dataPointType: derived.type,
        aggregationTemporality: AggregationTemporality.CUMULATIVE,
        isMonotonic: derived.type === DataPointType.SUM,
        dataPoints: derived.dataPoints,
        descriptor: {
          name: derived.name,
          description: derived.description,
          unit: derived.unit,
          valueType: derived.valueType,
        },
      });
    }
  });

  return {
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAMESPACE]: 'ssn',
      [ATTR_SERVICE_NAME]: 'canister-otlp-syncer',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env['GRAFANA_ENVIRONMENT'],
    }),
    scopeMetrics: [
      {
        scope: { name: 'canister-otlp-syncer' },
        metrics: generatedMetrics,
      },
    ],
  };
}

function objectEntries<T extends {}, K extends keyof T = keyof T>(
  value: T,
): [K, T[K]][] {
  return Object.entries(value) as [K, T[K]][];
}
