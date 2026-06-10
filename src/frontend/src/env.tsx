function getEnvVar(name: string): string {
  const value = import.meta.env[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Environment variable ${name} is not set`);
  }

  return value;
}

const DFX_NETWORK = getEnvVar('DFX_NETWORK');
const IS_LOCAL = DFX_NETWORK === 'local';
const IS_TEST = DFX_NETWORK === 'test';

export const ENVIRONMENT_BANNER: {
  label: string;
  className: string;
} | null = IS_LOCAL
  ? {
      label: 'Local',
      className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    }
  : IS_TEST
    ? {
        label: 'Staging',
        className: 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
      }
    : null;
export const IDENTITY_PROVIDER = IS_LOCAL
  ? 'http://id.ai.localhost:8000'
  : 'https://id.ai';

export const BACKEND_CANISTER_ID: string = getEnvVar('CANISTER_ID_BACKEND');
export const CANISTER_HISTORY_CANISTER_ID: string = getEnvVar(
  'CANISTER_ID_CANISTER_HISTORY',
);

export const SHOULD_FETCH_ROOT_KEY = IS_LOCAL;

export const DERIVATION_ORIGIN =
  IS_LOCAL || IS_TEST ? undefined : 'https://console.subnet.ch';

export const OFFCHAIN_SERVICE_URL = getEnvVar('OFFCHAIN_SERVICE_URL');
export const METRICS_PROXY_URL = getEnvVar('METRICS_PROXY_URL');
