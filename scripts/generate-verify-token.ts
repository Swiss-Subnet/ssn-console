import { SignJWT, importPKCS8 } from 'jose';

const email = process.argv[2];
const keyPath = process.argv[3] || '.local/sign.pem';

if (!email) {
  console.error(
    'Usage: bun run scripts/generate-verify-token.ts <email> [key-path]',
  );
  process.exit(1);
}

const keyFile = Bun.file(keyPath);
if (!(await keyFile.exists())) {
  console.error(`Private key not found at ${keyPath}`);
  console.error(
    'Generate one with: openssl genpkey -algorithm ed25519 -out .local/sign.pem',
  );
  process.exit(1);
}

const pem = await keyFile.text();
const privateKey = await importPKCS8(pem, 'EdDSA');

const token = await new SignJWT({ email })
  .setProtectedHeader({ alg: 'EdDSA' })
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(privateKey);

console.log(token);
