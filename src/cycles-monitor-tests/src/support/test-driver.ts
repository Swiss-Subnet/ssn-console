import { PocketIc, type Actor, type CanisterFixture } from '@dfinity/pic';
import { inject } from 'vitest';
import { type _SERVICE } from '@ssn/cycles-monitor-api';
import { Principal } from '@icp-sdk/core/principal';
import { BaseTestDriver, setupCyclesMonitorCanister } from '@ssn/test-utils';

export class TestDriver extends BaseTestDriver {
  public get actor(): Actor<_SERVICE> {
    return this.fixture.actor;
  }

  public get canisterId(): Principal {
    return this.fixture.canisterId;
  }

  private constructor(
    pic: PocketIc,
    private readonly fixture: CanisterFixture<_SERVICE>,
  ) {
    super(pic);
  }

  public static async create(initialDate = new Date()): Promise<TestDriver> {
    const pic = await PocketIc.create(inject('PIC_URL'));
    await pic.setTime(initialDate);
    const fixture = await setupCyclesMonitorCanister(pic);

    return new TestDriver(pic, fixture);
  }

  public async tearDown(): Promise<void> {
    await this.pic.tearDown();
  }
}
