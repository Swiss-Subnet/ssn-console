import { PocketIc, type Actor, type CanisterFixture } from '@dfinity/pic';
import { inject } from 'vitest';
import { type _SERVICE as BackendService, idlFactory } from '@ssn/backend-api';
import { resolve } from 'node:path';
import { Principal } from '@dfinity/principal';
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
  'backend',
  'backend.wasm.gz',
);

export class TestDriver {
  public get actor(): Actor<BackendService> {
    return this.fixture.actor;
  }

  public get canisterId(): Principal {
    return this.fixture.canisterId;
  }

  private constructor(
    public readonly pic: PocketIc,
    private readonly fixture: CanisterFixture<BackendService>,
  ) {}

  public static async create(initialDate = new Date()): Promise<TestDriver> {
    const pic = await PocketIc.create(inject('PIC_URL'));
    await pic.setTime(initialDate);
    const fixture = await this.setupBackendCanister(pic);

    return new TestDriver(pic, fixture);
  }

  private static async setupBackendCanister(
    pic: PocketIc,
  ): Promise<CanisterFixture<BackendService>> {
    return await pic.setupCanister<BackendService>({
      idlFactory,
      wasm: BACKEND_WASM_PATH,
      sender: controllerIdentity.getPrincipal(),
    });
  }

  public async resetBackendCanister(): Promise<void> {
    await this.pic.reinstallCode({
      canisterId: this.canisterId,
      wasm: BACKEND_WASM_PATH,
      sender: controllerIdentity.getPrincipal(),
    });
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }
}
