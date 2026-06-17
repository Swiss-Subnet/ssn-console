// Prints the local Application subnet's canister range as `START END` textual
// principals, read from pocket-ic's topology API. Used by
// scripts/update-local-history-ranges.sh to seed canister-history locally
// (image-mode networks don't write the launcher-mode topology.json on the host).

import { Principal } from '@icp-sdk/core/principal';

const GATEWAY = process.env.LOCAL_GATEWAY ?? 'http://127.0.0.1:8000';

type Topology = {
  subnet_configs: Record<
    string,
    {
      subnet_kind: string;
      canister_ranges: {
        start: { canister_id: string };
        end: { canister_id: string };
      }[];
    }
  >;
};

const toPrincipal = (b64: string): string =>
  Principal.fromUint8Array(Uint8Array.from(Buffer.from(b64, 'base64'))).toText();

const res = await fetch(`${GATEWAY}/_/topology`);
if (!res.ok) {
  console.error(`failed to fetch topology: ${res.status}`);
  process.exit(1);
}
const topology = (await res.json()) as Topology;

const app = Object.values(topology.subnet_configs).find(
  c => c.subnet_kind === 'Application',
);
if (!app || app.canister_ranges.length === 0) {
  console.error('no Application subnet range in topology');
  process.exit(1);
}

const start = toPrincipal(app.canister_ranges[0]!.start.canister_id);
const end = toPrincipal(app.canister_ranges.at(-1)!.end.canister_id);
console.log(`${start} ${end}`);
