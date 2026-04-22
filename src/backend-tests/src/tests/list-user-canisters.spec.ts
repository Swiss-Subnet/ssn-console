import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  TestDriver,
  unauthenticatedError,
  unauthorizedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';
import { Principal } from '@icp-sdk/core/principal';
import {
  anonymousIdentity,
  controllerIdentity,
  extractErrResponse,
  extractOkResponse,
} from '@ssn/test-utils';

describe('list_user_canisters', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  it('should return an error for an anonymous user', async () => {
    driver.actor.setIdentity(anonymousIdentity);

    const res = await driver.actor.list_user_canisters({
      user_id: crypto.randomUUID(),
    });
    expect(res).toEqual(unauthenticatedError);
  });

  it('should return an error for a non-controller user', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);

    const res = await driver.actor.list_user_canisters({
      user_id: crypto.randomUUID(),
    });
    expect(res).toEqual(unauthorizedError);
  });

  it('should return an error for an invalid user_id', async () => {
    driver.actor.setIdentity(controllerIdentity);

    const res = await driver.actor.list_user_canisters({
      user_id: 'invalid-uuid',
    });
    const err = extractErrResponse(res);
    expect(err.code[0]).toHaveProperty('ClientError');
  });

  it('should return an empty array when the user has no canisters', async () => {
    const [_, aliceProfile] = await driver.users.createUser();

    driver.actor.setIdentity(controllerIdentity);
    const canistersRes = await driver.actor.list_user_canisters({
      user_id: aliceProfile.id,
    });
    const { canisters } = extractOkResponse(canistersRes);
    expect(canisters).toEqual([]);
  });

  it('should return all canisters owned by the user', async () => {
    const [aliceIdentity, aliceProfile] = await driver.users.createUser();

    driver.actor.setIdentity(aliceIdentity);
    const aliceProject = await driver.getDefaultProject();
    await driver.proposals.createCanister(aliceIdentity, aliceProject.id);
    await driver.proposals.createCanister(aliceIdentity, aliceProject.id);

    driver.actor.setIdentity(controllerIdentity);
    const aliceCanistersRes = await driver.actor.list_user_canisters({
      user_id: aliceProfile.id,
    });
    const { canisters: aliceCanisters } = extractOkResponse(aliceCanistersRes);

    expect(aliceCanisters.length).toBe(2);

    // Ensure both canisters are returned with a valid principal_id
    expect(() =>
      Principal.fromText(aliceCanisters[0]!.principal_id),
    ).not.toThrow();
    expect(() =>
      Principal.fromText(aliceCanisters[1]!.principal_id),
    ).not.toThrow();
  });
});
