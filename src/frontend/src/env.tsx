const IS_LOCAL = import.meta.env['DFX_NETWORK'] === 'local';
const II_CANISTER_ID = import.meta.env['CANISTER_ID_INTERNET_IDENTITY'];

export const IDENTITY_PROVIDER = IS_LOCAL
  ? `http://${II_CANISTER_ID}.localhost:8000`
  : 'https://id.ai';
