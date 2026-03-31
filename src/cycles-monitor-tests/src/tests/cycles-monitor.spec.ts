import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestDriver } from '../support';

describe('Cycles Monitor', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  it('get_canister_metrics should return a value', async () => {
    const res = await driver.actor.get_canister_metrics({
      canister_id: driver.canisterId,
    });

    expect(res).toBeDefined();
  });
});
