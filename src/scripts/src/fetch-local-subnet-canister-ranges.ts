import { PocketIc } from '@dfinity/pic';
import { Principal } from '@icp-sdk/core/principal';
import { execSync } from 'node:child_process';

async function getLocalDfxUrl(): Promise<string> {
  try {
    const port = execSync('dfx info pocketic-config-port', {
      encoding: 'utf8',
    }).trim();
    return `http://localhost:${port}`;
  } catch (error) {
    throw new Error(
      'Failed to get local DFX URL. Make sure dfx is running and the command is available.',
    );
  }
}

async function getSubnetCanisterRanges(
  pic: PocketIc,
): Promise<[Principal, Principal][]> {
  const subnet = await pic.getApplicationSubnets();
  const firstSubnet = subnet.at(0);
  if (!firstSubnet) {
    throw new Error('An application subnet was not created by pocket ic');
  }

  return firstSubnet.canisterRanges.map<[Principal, Principal]>(
    ({ start, end }) => [start, end],
  );
}

async function main() {
  try {
    const dfxUrl = await getLocalDfxUrl();
    console.log(`Using local DFX URL: ${dfxUrl}`);

    const pic = await PocketIc.create(dfxUrl);

    const ranges = await getSubnetCanisterRanges(pic);

    console.log('\n✅ Successfully retrieved canister ranges:');
    console.table(ranges.map(([start, end]) => [start.toText(), end.toText()]));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error fetching canister ranges:', errMsg);
  }
}

main();
