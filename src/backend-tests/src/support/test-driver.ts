import { type Actor, type CanisterFixture, PocketIc } from '@dfinity/pic';
import { inject } from 'vitest';
import {
  type _SERVICE as BackendService,
  type Project,
} from '@ssn/backend-api';
import { resolve } from 'node:path';
import { Principal } from '@icp-sdk/core/principal';
import { ProposalDriver } from './proposal-driver';
import * as crypto from 'node:crypto';
import { UserDriver } from './user-driver';
import {
  BaseTestDriver,
  extractOkResponse,
  setupBackendCanister,
} from '@ssn/test-utils';

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

export class TestDriver extends BaseTestDriver {
  public readonly proposals: ProposalDriver;
  public readonly users: UserDriver;

  public get actor(): Actor<BackendService> {
    return this.fixture.actor;
  }

  public get canisterId(): Principal {
    return this.fixture.canisterId;
  }

  private constructor(
    pic: PocketIc,
    private readonly fixture: CanisterFixture<BackendService>,
  ) {
    super(pic);
    this.proposals = new ProposalDriver(pic, fixture.canisterId);
    this.users = new UserDriver(pic, fixture.canisterId);
  }

  public static async create(initialDate = new Date()): Promise<TestDriver> {
    const pic = await PocketIc.create(inject('PIC_URL'));
    await pic.setTime(initialDate);
    const fixture = await setupBackendCanister(pic, [
      { name: 'PUBLIC_KEY', value: PUBLIC_KEY },
      { name: 'OFFCHAIN_SERVICE_URL', value: 'http://localhost:3000' },
    ]);

    return new TestDriver(pic, fixture);
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }

  public async getDefaultProject(): Promise<Project> {
    const res = await this.actor.list_my_projects({});
    const okRes = extractOkResponse(res);

    return okRes.projects[0]!;
  }
}
