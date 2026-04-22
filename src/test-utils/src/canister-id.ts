import { Principal } from '@icp-sdk/core/principal';

// turns a canister id into a u64 and increments it
export function incrementCanisterId(
  canisterId: Principal,
  steps: number,
): Principal {
  const bytes = canisterId.toUint8Array();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const currentU64 = view.getBigUint64(0, false);
  const nextU64 = currentU64 + BigInt(steps);

  const endBytes = new Uint8Array(10);
  const endView = new DataView(endBytes.buffer);

  endView.setBigUint64(0, nextU64, false);
  // reserved byte
  endBytes[8] = 0x01;
  // opaque id class
  endBytes[9] = 0x01;

  return Principal.fromUint8Array(endBytes);
}
