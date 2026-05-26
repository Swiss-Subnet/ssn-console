import { HttpAgent } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import * as crypto from 'node:crypto';
import { syncCyclesMonitorMetrics } from './sync-cycles-monitor-metrics';
import { syncCanisterUsage } from './sync-canister-usage';
import { env } from './env';

async function main() {
  console.log(
    `🚀 Starting one-shot metrics worker at ${new Date().toISOString()}`,
  );

  const nodeKey = crypto.createPrivateKey(
    env.PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
  );

  const jwk = nodeKey.export({ format: 'jwk' });
  if (!jwk.d) {
    throw new Error(
      'Failed to extract secret seed from private key. Is it a valid Ed25519 key?',
    );
  }
  const seed = Buffer.from(jwk.d, 'base64url');

  const identity = Ed25519KeyIdentity.generate(seed);

  const agent = HttpAgent.createSync({ host: env.HTTP_GATEWAY, identity });

  try {
    const usages = await syncCyclesMonitorMetrics(agent);
    await syncCanisterUsage(agent, usages);
    console.log('✅ Metrics successfully synced!');
  } catch (error) {
    console.error('💢 Error syncing metrics', error);
    process.exit(1);
  }
}

main();
