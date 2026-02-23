import {
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

  public async setSubnetCanisterRanges(): Promise<void> {
    const subnet = await this.getSubnet();
    const canisterRanges = subnet.canisterRanges.map<[Principal, Principal]>(
      ({ start, end }) => [start, end],
    );

    await this.actor.update_subnet_canister_ranges({
      canister_ranges: canisterRanges,
    });
  }

  public async getSubnet(): Promise<SubnetTopology> {
    const subnets = await this.pic.getApplicationSubnets();
    const firstSubnet = subnets.at(0);
    if (!firstSubnet) {
      throw new Error('An application subnet was not created by pocket ic');
    }

    return firstSubnet;
  }
}
