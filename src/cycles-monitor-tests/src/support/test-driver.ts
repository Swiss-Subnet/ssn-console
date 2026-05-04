import { PocketIc, type Actor, type CanisterFixture } from '@dfinity/pic';
import { inject } from 'vitest';
import { type _SERVICE as CyclesMonitorService } from '@ssn/cycles-monitor-api';
import { type _SERVICE as CanisterHistoryService } from '@ssn/canister-history-api';
import { Principal } from '@icp-sdk/core/principal';
import {
  BaseTestDriver,
  controllerIdentity,
  extractOkResponse,
  setupCanisterHistoryCanister,
  setupCyclesMonitorCanister,
} from '@ssn/test-utils';
import * as crypto from 'node:crypto';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
export const PUBLIC_KEY = publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString()
  .trim();
const secret = privateKey.export({ type: 'pkcs8', format: 'der' });
const seed = new Uint8Array((secret as Buffer).slice(16));
export const offchainIdentity = Ed25519KeyIdentity.fromSecretKey(seed);

export class TestDriver extends BaseTestDriver {
  public get cyclesMonitorActor(): Actor<CyclesMonitorService> {
    return this.cyclesMonitorFixture.actor;
  }

  public get cyclesMonitorCanisterId(): Principal {
    return this.cyclesMonitorFixture.canisterId;
  }
  public get canisterHistoryActor(): Actor<CanisterHistoryService> {
    return this.canisterHistoryFixture.actor;
  }

  public get canisterHistoryCanisterId(): Principal {
    return this.canisterHistoryFixture.canisterId;
  }

  private constructor(
    pic: PocketIc,
    private readonly cyclesMonitorFixture: CanisterFixture<CyclesMonitorService>,
    private readonly canisterHistoryFixture: CanisterFixture<CanisterHistoryService>,
  ) {
    super(pic);
  }

  public static async create(initialDate = new Date()): Promise<TestDriver> {
    const pic = await PocketIc.create(inject('PIC_URL'));
    await pic.setTime(initialDate);
    const canisterHistoryFixture = await setupCanisterHistoryCanister(pic);
    const cyclesMonitorFixture = await setupCyclesMonitorCanister(pic, [
      {
        name: 'CANISTER_HISTORY_ID',
        value: canisterHistoryFixture.canisterId.toString(),
      },
      {
        name: 'PUBLIC_KEY',
        value: PUBLIC_KEY,
      },
    ]);

    return new TestDriver(pic, cyclesMonitorFixture, canisterHistoryFixture);
  }

  public async setSubnetCanisterRanges(
    rangeSize = 10,
  ): Promise<[Principal, Principal][]> {
    const canisterRanges = await this.getSubnetCanisterRanges(rangeSize);

    this.canisterHistoryActor.setIdentity(controllerIdentity);
    const res = await this.canisterHistoryActor.update_subnet_canister_ranges({
      canister_ranges: canisterRanges,
    });
    extractOkResponse(res);

    return canisterRanges;
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }
}
