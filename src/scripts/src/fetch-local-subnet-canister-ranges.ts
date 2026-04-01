import { Principal } from '@icp-sdk/core/principal';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function getLocalSubnetRange(): [Principal, Principal] {
  const configPath = join(
    process.cwd(),
    '.dfx/network/local/replica-effective-config.json',
  );

  let configData: string;
  try {
    configData = readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to read replica config at ${configPath}. Make sure dfx is running.`,
    );
  }

  const config = JSON.parse(configData);
  const effectiveId = config.effective_canister_id;

  if (!effectiveId) {
    throw new Error('Could not find effective_canister_id in replica config.');
  }

  const startPrincipal = Principal.fromText(effectiveId);
  const startBytes = startPrincipal.toUint8Array();

  // The local dfx subnet assigns a /20 range (0xFFFFF).
  // Canister IDs are 10 bytes: 8 bytes payload + 0x01 0x01 suffix.
  // The 20-bit counter spans bytes 5, 6, and 7.
  const endBytes = new Uint8Array(startBytes);
  endBytes[5] = endBytes[5] | 0x0f; // Set lower 4 bits
  endBytes[6] = 0xff; // Set all 8 bits
  endBytes[7] = 0xff; // Set all 8 bits

  const endPrincipal = Principal.fromUint8Array(endBytes);

  return [startPrincipal, endPrincipal];
}

async function main() {
  try {
    const [start, end] = getLocalSubnetRange();
    console.log(`${start.toText()} ${end.toText()}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(errMsg);
    process.exit(1);
  }
}

main();
