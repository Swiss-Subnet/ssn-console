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
    });
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }

  public async getDefaultProject(): Promise<Project> {
    const projectRes = await this.actor.list_my_projects();
    const [project] = extractOkResponse(projectRes);

    return project;
  }
}
