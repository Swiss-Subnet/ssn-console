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
  type SumMetricData,
} from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { env } from './env';
import { Principal } from '@icp-sdk/core/principal';

export async function syncCyclesMonitorMetrics(agent: HttpAgent) {
  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: env.CANISTER_ID_CYCLES_MONITOR,
  });

  console.log(
    '🚀 Fetching canister cycles metrics batches from the cycles monitor canister...',
  );

  const oneHourAgoMs = Date.now() - 60 * 60 * 1_000;
  const oneHourAgoNs = BigInt(oneHourAgoMs) * 1_000_000n;
  const minPrincipal = Principal.fromUint8Array(new Uint8Array(29));

  let cursor: Cursor = [oneHourAgoNs, minPrincipal];
  let totalPushed = 0;

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
      const otlpPayload = buildOtlpPayload(metricsRes.Ok.snapshots);

      console.log(`✉️ Pushing metrics to Grafana Alloy...`);
      await pushMetrics(otlpPayload);
      totalPushed += metricsRes.Ok.snapshots.length;
    }

    const nextCursor: Cursor | undefined = metricsRes.Ok.next_cursor[0];
    if (!nextCursor) {
      break;
    }
    cursor = nextCursor;
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
type MetricBucket = {
  name: string;
  description: string;
  dataPoints: DataPoint<number>[];
};

function buildOtlpPayload(
  snapshots: CyclesMetricsSnapshotDto[],
): ResourceMetrics {
  const metricBuckets: Record<MetricKey, MetricBucket> = {
    memory: {
      name: 'ic_canister_memory_cycles_total',
      description: 'Cumulative cycles burned for memory',
      dataPoints: [],
    },
    compute_allocation: {
      name: 'ic_canister_compute_allocation_cycles_total',
      description: 'Cumulative cycles burned for compute allocation',
      dataPoints: [],
    },
    ingress_induction: {
      name: 'ic_canister_ingress_induction_cycles_total',
      description: 'Cumulative cycles burned for ingress induction',
      dataPoints: [],
    },
    instructions: {
      name: 'ic_canister_instructions_cycles_total',
      description: 'Cumulative cycles burned for instructions',
      dataPoints: [],
    },
    request_and_response_transmission: {
      name: 'ic_canister_request_response_transmission_cycles_total',
      description:
        'Cumulative cycles burned for request and response transmission',
      dataPoints: [],
    },
    uninstall: {
      name: 'ic_canister_uninstall_cycles_total',
      description: 'Cumulative cycles burned for uninstall',
      dataPoints: [],
    },
    http_outcalls: {
      name: 'ic_canister_http_outcalls_cycles_total',
      description: 'Cumulative cycles burned for HTTP outcalls',
      dataPoints: [],
    },
    burned_cycles: {
      name: 'ic_canister_burned_cycles_total',
      description: 'Total cumulative burned cycles',
      dataPoints: [],
    },
  };

  for (const point of snapshots) {
    const startTime = toHrTime(0n);
    const endTime = toHrTime(point.timestamp_ns);
    const attributes: Attributes = {
      canister_id: point.canister_id.toString(),
    };

    for (const [key, bucket] of objectEntries(metricBuckets)) {
      bucket.dataPoints.push({
        startTime,
        endTime,
        attributes,
        value: Number(point[key]),
      });
    }
  }

  const generatedMetrics = Object.values(metricBuckets).map<SumMetricData>(
    ({ dataPoints, name, description }) => ({
      dataPointType: DataPointType.SUM,
      aggregationTemporality: AggregationTemporality.CUMULATIVE,
      isMonotonic: true,
      dataPoints,
      descriptor: {
        name,
        description,
        unit: 'cycles',
        valueType: ValueType.INT,
      },
    }),
  );

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
