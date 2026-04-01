import * as crypto from 'node:crypto';
import { SignJWT } from 'jose';

export async function createTestJwt(
  email: string,
  privateKey: crypto.KeyObject,
): Promise<string> {
  return await new SignJWT({ email })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey);
}
