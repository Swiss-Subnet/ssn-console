import { type Actor, type CanisterFixture, PocketIc } from '@dfinity/pic';
import { inject } from 'vitest';
import {
  type _SERVICE as BackendService,
  idlFactory,
  type Project,
} from '@ssn/backend-api';
import { resolve } from 'node:path';
import { Principal } from '@icp-sdk/core/principal';
import { controllerIdentity } from './identity';
import { ProposalDriver } from './proposal-driver';
import { extractOkResponse } from './error';
import * as crypto from 'node:crypto';

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

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
export const PUBLIC_KEY = publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString()
  .trim();
export const PRIVATE_KEY = privateKey;

export class TestDriver {
  public readonly proposals: ProposalDriver;

  public get actor(): Actor<BackendService> {
    return this.fixture.actor;
  }

  public get canisterId(): Principal {
    return this.fixture.canisterId;
  }

  private constructor(
    public readonly pic: PocketIc,
    private readonly fixture: CanisterFixture<BackendService>,
  ) {
    this.proposals = new ProposalDriver(pic, fixture.canisterId);
  }

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
      environmentVariables: [
        { name: 'PUBLIC_KEY', value: PUBLIC_KEY },
        { name: 'OFFCHAIN_SERVICE_URL', value: 'localhost:3000' },
      ],
    });
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }

  public async setEnvironmentVariable(
    name: string,
    value: string,
  ): Promise<void> {
    await this.pic.updateCanisterSettings({
      canisterId: this.canisterId,
      environmentVariables: [{ name, value }],
      sender: controllerIdentity.getPrincipal(),
    });
  }

  public async getDefaultProject(): Promise<Project> {
    const res = await this.actor.list_my_projects({});
    const okRes = extractOkResponse(res);

    return okRes.projects[0]!;
  }
}
