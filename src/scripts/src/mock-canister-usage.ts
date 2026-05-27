import { HttpAgent, Actor } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import * as crypto from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import * as dotenv from 'dotenv';
import {
  idlFactory,
  type _SERVICE,
  type CanisterUsage,
} from '@ssn/backend-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../../..');

dotenv.config({ path: join(ROOT_DIR, '.env.local') });

function getEnvVar(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Could not find ${name} in .env.local`);
  }
  return val.replace(/\\n/g, '\n');
}

function getBackendCanisterId(): string {
  try {
    const output = execSync('dfx canister id backend --network local', {
      encoding: 'utf8',
      cwd: ROOT_DIR,
    });
    return output.trim();
  } catch (error) {
    throw new Error(
      'Failed to get backend canister ID from dfx. Is dfx running?',
    );
  }
}

function getLocalNetworkUrl(): string {
  try {
    const port = execSync('dfx info webserver-port', {
      encoding: 'utf8',
      cwd: ROOT_DIR,
    });
    return `http://127.0.0.1:${port.trim()}`;
  } catch (error) {
    throw new Error('Failed to get webserver port from dfx. Is dfx running?');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: bun run mock-canister-usage <canister-id-1> [canister-id-2 ...]',
    );
    process.exit(1);
  }

  const canisterIds = args.map(arg => Principal.fromText(arg));

  const privateKeyString = getEnvVar('PRIVATE_KEY');
  const nodeKey = crypto.createPrivateKey(privateKeyString);

  const jwk = nodeKey.export({ format: 'jwk' });
  if (!jwk.d) {
    throw new Error(
      'Failed to extract secret seed from private key. Is it a valid Ed25519 key?',
    );
  }
  const seed = Buffer.from(jwk.d, 'base64url');
  const identity = Ed25519KeyIdentity.generate(seed);

  const agent = HttpAgent.createSync({
    host: getLocalNetworkUrl(),
    identity,
  });
  await agent.fetchRootKey();

  const backendCanisterId = getBackendCanisterId();
  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: backendCanisterId,
  });

  const now = BigInt(Date.now());
  const elapsedSeconds = now / 1000n; // Use elapsed seconds to linearly increase values

  // Some mock base values
  const baseBurnedCyclesPerSecond = 10_000_000n;
  const baseInstructionsPerSecond = 5_000_000n;
  const baseMemoryBytes = 10_000_000n;

  const usages: CanisterUsage[] = canisterIds.map(canister_id => ({
    canister_id,
    memory: baseMemoryBytes * 2n, // Mock cycles cost
    memory_bytes: baseMemoryBytes,
    compute_allocation: 0n,
    compute_allocation_percent: 0n,
    ingress_induction: elapsedSeconds * 5000n,
    ingress_induction_bytes_total: elapsedSeconds * 5n,
    instructions: elapsedSeconds * baseInstructionsPerSecond,
    compute_time_seconds_total: elapsedSeconds / 20n,
    request_and_response_transmission: elapsedSeconds * 2000n,
    transmission_bytes_total: elapsedSeconds * 2n,
    uninstall: 0n,
    uninstalls_total: 0n,
    http_outcalls: 0n,
    burned_cycles: elapsedSeconds * baseBurnedCyclesPerSecond,
  }));

  console.log(`🚀 Syncing ${usages.length} mock canister usages to backend...`);

  const res = await actor.record_usage({ usages });
  if ('Err' in res) {
    throw new Error(`Failed to upsert usage: ${res.Err.message}`);
  }

  console.log('✅ Successfully synced mock canister usages to backend.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
