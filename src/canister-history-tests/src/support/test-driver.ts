import { PocketIc, type Actor, type CanisterFixture } from '@dfinity/pic';
import { inject } from 'vitest';
import {
  type _SERVICE as CanisterHistoryService,
  idlFactory as canisterHistoryIdlFactory,
} from '@ssn/canister-history-api';
import { type _SERVICE as BackendService } from '@ssn/backend-api';
import { Principal } from '@icp-sdk/core/principal';
import * as crypto from 'node:crypto';
import {
  BaseTestDriver,
  setupBackendCanister,
  CANISTER_HISTORY_WASM_PATH,
  controllerIdentity,
} from '@ssn/test-utils';

export class TestDriver extends BaseTestDriver {
  public get canisterHistoryActor(): Actor<CanisterHistoryService> {
    return this.canisterHistoryFixture.actor;
  }

  public get canisterHistoryCanisterId(): Principal {
    return this.canisterHistoryFixture.canisterId;
  }

  public get backendActor(): Actor<BackendService> {
    return this.backendFixture.actor;
  }

  public get backendCanisterId(): Principal {
    return this.backendFixture.canisterId;
  }

  private constructor(
    pic: PocketIc,
    private readonly canisterHistoryFixture: CanisterFixture<CanisterHistoryService>,
    private readonly backendFixture: CanisterFixture<BackendService>,
  ) {
    super(pic);
  }

  public static async create(initialDate = new Date()): Promise<TestDriver> {
    const pic = await PocketIc.create(inject('PIC_URL'));
    await pic.setTime(initialDate);

    const canisterHistoryId = await pic.createCanister({
      sender: controllerIdentity.getPrincipal(),
    });

    const { publicKey } = crypto.generateKeyPairSync('ed25519');
    const PUBLIC_KEY = publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString()
      .trim();

    const backendFixture = await setupBackendCanister(pic, {
      environmentVariables: [
        { name: 'PUBLIC_KEY', value: PUBLIC_KEY },
        { name: 'OFFCHAIN_SERVICE_URL', value: 'http://localhost:3000' },
        { name: 'CANISTER_HISTORY_ID', value: canisterHistoryId.toText() },
      ],
    });

    await pic.updateCanisterSettings({
      canisterId: canisterHistoryId,
      environmentVariables: [
        { name: 'BACKEND_ID', value: backendFixture.canisterId.toText() },
      ],
      sender: controllerIdentity.getPrincipal(),
    });

    await pic.installCode({
      wasm: CANISTER_HISTORY_WASM_PATH,
      sender: controllerIdentity.getPrincipal(),
      canisterId: canisterHistoryId,
    });

    const canisterHistoryActor = pic.createActor<CanisterHistoryService>(
      canisterHistoryIdlFactory,
      canisterHistoryId,
    );

    return new TestDriver(
      pic,
      {
        actor: canisterHistoryActor,
        canisterId: canisterHistoryId,
      },
      backendFixture,
    );
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }

  public async setSubnetCanisterRanges(
    rangeSize = 10,
  ): Promise<[Principal, Principal][]> {
    const canisterRanges = await this.getSubnetCanisterRanges(rangeSize);
    await this.canisterHistoryActor.update_subnet_canister_ranges({
      canister_ranges: canisterRanges,
    });

    return canisterRanges;
  }
}
