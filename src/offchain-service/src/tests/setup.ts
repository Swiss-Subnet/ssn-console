import crypto from 'node:crypto';

const keyPair = crypto.generateKeyPairSync('ed25519');
export const publicKey = keyPair.publicKey.export({
  format: 'pem',
  type: 'spki',
});
const privateKeyPem = keyPair.privateKey.export({
  format: 'pem',
  type: 'pkcs8',
});

process.env['PRIVATE_KEY'] = privateKeyPem;
process.env['SMTP_HOST'] = 'smtp.example.com';
process.env['SMTP_PORT'] = '587';
process.env['SMTP_USER'] = 'test@example.com';
process.env['SMTP_PASS'] = 'test-password';
process.env['SMTP_FROM'] = 'noreply@example.com';
process.env['FRONTEND_URL'] = 'http://localhost:5173';
