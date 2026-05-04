import { HttpAgent } from '@icp-sdk/core/agent';
import { ECDSAKeyIdentity } from '@icp-sdk/core/identity';
import * as crypto from 'node:crypto';
import { syncCyclesMonitorMetrics } from './sync-cycles-monitor-metrics';
import { env } from './env';

async function main() {
  console.log(
    `🚀 Starting one-shot metrics worker at ${new Date().toISOString()}`,
  );

  const nodeKey = crypto.createPrivateKey(
    env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  );

  const privateKeyDer = nodeKey.export({ format: 'der', type: 'pkcs8' });
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyDer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );

  const publicKeyDer = crypto
    .createPublicKey(nodeKey)
    .export({ format: 'der', type: 'spki' });
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyDer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );

  const identity = await ECDSAKeyIdentity.fromKeyPair({
    privateKey,
    publicKey,
  });

  const agent = HttpAgent.createSync({ host: env.HTTP_GATEWAY, identity });

  try {
    await syncCyclesMonitorMetrics(agent);
  } catch (error) {
    console.error('💢 Error syncing cycles monitor metrics', error);
    process.exit(1);
  }
}

main();
