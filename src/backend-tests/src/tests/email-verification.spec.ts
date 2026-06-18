import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestDriver } from '../support';
import { generateRandomIdentity } from '@dfinity/pic';
import { createTestJwt, PRIVATE_KEY, PUBLIC_KEY } from '../support';
import * as crypto from 'node:crypto';
import { anonymousIdentity, extractOkResponse } from '@ssn/test-utils';

describe('Email Verification', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  it('should return an error for an anonymous user', async () => {
    driver.actor.setIdentity(anonymousIdentity);
    const res = await driver.actor.verify_my_email({ token: 'dummy_token' });
    // Auth guard maps to RejectionError (no code, no typed reason).
    expect(res).toEqual({
      Err: {
        message: 'Anonymous principals are not allowed to perform this action.',
        reason: [],
      },
    });
  });

  it('should return an error if the user profile does not exist', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);

    const res = await driver.actor.verify_my_email({ token });
    expect(res).toEqual({
      Err: {
        message: `User profile for principal ${aliceIdentity.getPrincipal()} does not exist.`,
        reason: [{ ProfileNotFound: null }],
      },
    });
  });

  it('should return an error if the user has no email set', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const res = await driver.actor.verify_my_email({ token });

    // Plain client error, no typed reason.
    expect(res).toEqual({
      Err: {
        message: 'User profile does not have an email to verify',
        reason: [],
      },
    });
  });

  it('should return an error if the token email does not match profile email', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('hacker@subnet.ch', PRIVATE_KEY);
    const res = await driver.actor.verify_my_email({ token });

    expect(res).toEqual({
      Err: {
        message: 'Token email does not match user profile email',
        reason: [{ EmailMismatch: null }],
      },
    });
  });

  it('should return an error if the token has expired', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    // move time forward by 20 minutes
    await driver.pic.advanceTime(20 * 60 * 1_000);
    await driver.pic.tick();
    const res = await driver.actor.verify_my_email({ token });

    expect(res).toEqual({
      Err: {
        message: 'JWT has expired',
        reason: [{ Expired: null }],
      },
    });
  });

  it('should return an error for invalid jwt parts', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const invalidToken = token.split('.').slice(0, 2).join('.');

    const res = await driver.actor.verify_my_email({ token: invalidToken });

    expect(res).toEqual({
      Err: {
        message: 'Invalid JWT token format',
        reason: [{ Invalid: null }],
      },
    });
  });

  it('should return an error for invalid signature base64 encoding', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const invalidToken = token + '!@#$';

    const res = await driver.actor.verify_my_email({ token: invalidToken });

    expect(res).toEqual({
      Err: {
        message: 'Invalid JWT signature base64 encoding',
        reason: [{ Invalid: null }],
      },
    });
  });

  it('should return an error for invalid signature length', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const parts = token.split('.');
    // valid base64url but only decodes to 4 bytes instead of 64
    parts[2] = 'YWJjZA';
    const invalidToken = parts.join('.');

    const res = await driver.actor.verify_my_email({ token: invalidToken });

    expect(res).toEqual({
      Err: {
        message: 'Invalid JWT signature length',
        reason: [{ Invalid: null }],
      },
    });
  });

  it('should return an error for invalid jwt public key', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);

    // A valid PEM structure but an invalid Ed25519 point (32 bytes of 0x02)
    const invalidKeyBytes = Buffer.alloc(44, 2); // we need a 44-byte DER for Ed25519 in the rust code
    const invalidKeyBase64 = invalidKeyBytes.toString('base64');
    const invalidPem = `-----BEGIN PUBLIC KEY-----\n${invalidKeyBase64}\n-----END PUBLIC KEY-----`;

    await driver.setEnvironmentVariable(
      driver.canisterId,
      'PUBLIC_KEY',
      invalidPem,
    );

    const res = await driver.actor.verify_my_email({ token });

    expect(res).toEqual({
      Err: {
        message: 'Invalid JWT public key',
        reason: [{ Invalid: null }],
      },
    });

    // Restore the valid key
    await driver.setEnvironmentVariable(
      driver.canisterId,
      'PUBLIC_KEY',
      PUBLIC_KEY,
    );
  });

  it('should return an error for invalid jwt signature', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const parts = token.split('.');
    parts[1] = Buffer.from(
      JSON.stringify({ email: 'tampered@subnet.ch', exp: 9999999999 }),
    ).toString('base64url');
    const invalidToken = parts.join('.');

    const res = await driver.actor.verify_my_email({ token: invalidToken });

    expect(res).toEqual({
      Err: {
        message: 'JWT signature verification failed',
        reason: [{ Invalid: null }],
      },
    });
  });

  it('should return an error for invalid payload base64 encoding', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const parts = token.split('.');
    parts[1] += '!@#$'; // Break the base64url encoding of the payload

    const message = `${parts[0]}.${parts[1]}`;
    const signature = crypto.sign(null, Buffer.from(message), PRIVATE_KEY);
    const invalidToken = `${message}.${signature.toString('base64url').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

    const res = await driver.actor.verify_my_email({ token: invalidToken });

    expect(res).toEqual({
      Err: {
        message: 'Invalid JWT payload base64 encoding',
        reason: [{ Invalid: null }],
      },
    });
  });

  it('should return an error for invalid base claims object', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const parts = token.split('.');
    parts[1] = Buffer.from('not a json object').toString('base64url');

    const message = `${parts[0]}.${parts[1]}`;
    const signature = crypto.sign(null, Buffer.from(message), PRIVATE_KEY);
    const invalidToken = `${message}.${signature.toString('base64url').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

    const res = await driver.actor.verify_my_email({ token: invalidToken });

    expect(res).toEqual({
      Err: {
        message: 'Failed to parse JWT base claims',
        reason: [{ Invalid: null }],
      },
    });
  });

  it('should return an error for invalid non-base claims object', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const parts = token.split('.');
    // Encode valid JSON but missing the 'email' field, but it has 'exp' so base claims works
    parts[1] = Buffer.from(
      JSON.stringify({ exp: 9999999999, other: 'data' }),
    ).toString('base64url');

    const message = `${parts[0]}.${parts[1]}`;
    const signature = crypto.sign(null, Buffer.from(message), PRIVATE_KEY);
    const invalidToken = `${message}.${signature.toString('base64url').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

    const res = await driver.actor.verify_my_email({ token: invalidToken });

    expect(res).toEqual({
      Err: {
        message: 'Failed to parse JSON claims',
        reason: [{ Invalid: null }],
      },
    });
  });

  it('should successfully verify the user email', async () => {
    const aliceIdentity = generateRandomIdentity();
    driver.actor.setIdentity(aliceIdentity);
    await driver.actor.create_my_user_profile();
    await driver.actor.update_my_user_profile({ email: ['alice@subnet.ch'] });

    const preProfileRes = await driver.actor.get_my_user_profile();
    const [preProfile] = extractOkResponse(preProfileRes);
    expect(preProfile!.email_verified).toBe(false);

    const token = await createTestJwt('alice@subnet.ch', PRIVATE_KEY);
    const res = await driver.actor.verify_my_email({ token });
    expect(res).toEqual({ Ok: null });

    const postProfileRes = await driver.actor.get_my_user_profile();
    const [postProfile] = extractOkResponse(postProfileRes);
    expect(postProfile!.email_verified).toBe(true);
  });
});
