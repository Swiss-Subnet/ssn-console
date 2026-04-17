import {
  generateRandomIdentity,
  PocketIc,
  type Actor,
  type CanisterFixture,
  type SubnetTopology,
} from '@dfinity/pic';
import { inject } from 'vitest';
import { type _SERVICE, idlFactory } from '@ssn/canister-history-api';
import { resolve } from 'node:path';
import { Principal } from '@icp-sdk/core/principal';
import { controllerIdentity } from './identity';

export const BACKEND_WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'canister-history',
  'canister-history.wasm.gz',
);

export class TestDriver {
  public get actor(): Actor<_SERVICE> {
    return this.fixture.actor;
  }

  public get canisterId(): Principal {
    return this.fixture.canisterId;
  }

  private constructor(
    public readonly pic: PocketIc,
    private readonly fixture: CanisterFixture<_SERVICE>,
  ) {}

  public static async create(initialDate = new Date()): Promise<TestDriver> {
    const pic = await PocketIc.create(inject('PIC_URL'));
    await pic.setTime(initialDate);
    const fixture = await this.setupCanister(pic);

    return new TestDriver(pic, fixture);
  }

  private static async setupCanister(
    pic: PocketIc,
  ): Promise<CanisterFixture<_SERVICE>> {
    return await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: BACKEND_WASM_PATH,
      sender: controllerIdentity.getPrincipal(),
    });
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }

  public async setSubnetCanisterRanges(
    rangeSize = 10,
  ): Promise<[Principal, Principal][]> {
    const subnet = await this.getSubnet();

    const canisterRanges = subnet.canisterRanges.map<[Principal, Principal]>(
      ({ start }) => {
        const stepsToTake = Math.max(0, rangeSize - 1);
        return [start, incrementCanisterId(start, stepsToTake)];
      },
    );

    await this.actor.update_subnet_canister_ranges({
      canister_ranges: canisterRanges,
    });

    return canisterRanges;
  }

  public async getSubnet(): Promise<SubnetTopology> {
    const subnets = await this.pic.getApplicationSubnets();
    const firstSubnet = subnets.at(0);
    if (!firstSubnet) {
      throw new Error('An application subnet was not created by pocket ic');
    }

    return firstSubnet;
  }

  public async createCanisters(numCanisters = 1): Promise<Principal[]> {
    const canisterIds = [];

    for (let i = 0; i < numCanisters; i++) {
      const canisterId = await this.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });
      canisterIds.push(canisterId);
    }

    return canisterIds;
  }

  public async createControllerChanges(
    canisterId: Principal,
    numChanges = 1,
    controllers = [controllerIdentity.getPrincipal()],
  ): Promise<void> {
    for (let i = 0; i < numChanges; i++) {
      const additionalController = generateRandomIdentity();

      await this.pic.updateCanisterSettings({
        canisterId,
        sender: controllerIdentity.getPrincipal(),
        controllers: [...controllers, additionalController.getPrincipal()],
      });
    }
  }
}

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
