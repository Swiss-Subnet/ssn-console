import { describe, it, expect } from 'bun:test';
import './mocks';
import './setup';
import { app } from '../index';
import { sendMailSpy } from './mocks';
import { jwtVerify, importSPKI } from 'jose';
import { publicKey } from './setup';

describe('POST /auth/email-verification', () => {
  it('should return 204 for valid email and send email with verification token', async () => {
    const testEmail = 'test@example.com';
    const response = await app.handle(
      new Request(`http://localhost/auth/email-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      }),
    );

    expect(response.status).toBe(204);
    expect(sendMailSpy).toHaveBeenCalled();

    const sendMailCall = sendMailSpy.mock.calls[0][0];
    expect(sendMailCall.to).toBe(testEmail);
    expect(sendMailCall.html).toContain('href=');
    expect(sendMailCall.html).toContain('verify?token=');

    const tokenMatch = sendMailCall.html.match(/verify\?token=([^'"]+)/);
    expect(tokenMatch).not.toBeNull();

    const token = tokenMatch?.[1];
    expect(token).toMatch(
      /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+$/,
    );

    const publicKeyObj = await importSPKI(publicKey, 'EdDSA');
    const { payload } = await jwtVerify(token, publicKeyObj, {
      algorithms: ['EdDSA'],
    });

    expect(payload['email']).toBe(testEmail);
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();

    const now = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(now);
    expect(payload.exp).toBeLessThanOrEqual(now + 15 * 60);
  });

  it('should return 422 for invalid email', async () => {
    const response = await app.handle(
      new Request(`http://localhost/auth/email-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      }),
    );

    expect(response.status).toBe(422);
  });

  it('should return 422 for missing email', async () => {
    const response = await app.handle(
      new Request(`http://localhost/auth/email-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(422);
  });
});
