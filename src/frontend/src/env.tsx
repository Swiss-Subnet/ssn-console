function getEnvVar(name: string): string {
  const value = import.meta.env[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Environment variable ${name} is not set`);
  }

  return value;
}

const DFX_NETWORK = getEnvVar('DFX_NETWORK');
const IS_LOCAL = DFX_NETWORK === 'local';
const II_CANISTER_ID = getEnvVar('CANISTER_ID_INTERNET_IDENTITY');

export const IDENTITY_PROVIDER = IS_LOCAL
  ? `http://${II_CANISTER_ID}.localhost:8000`
  : 'https://id.ai';
