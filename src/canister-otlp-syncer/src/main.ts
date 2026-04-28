import { HttpAgent } from '@icp-sdk/core/agent';
import { syncCyclesMonitorMetrics } from './sync-cycles-monitor-metrics';
import { env } from './env';

async function main() {
  console.log(
    `🚀 Starting one-shot metrics worker at ${new Date().toISOString()}`,
  );
  const agent = HttpAgent.createSync({ host: env.HTTP_GATEWAY });

  try {
    await syncCyclesMonitorMetrics(agent);
  } catch (error) {
    console.error('💢 Error syncing cycles monitor metrics', error);
    process.exit(1);
  }
}

main();
