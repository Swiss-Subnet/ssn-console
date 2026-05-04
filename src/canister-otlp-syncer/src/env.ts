function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const OTEL_EXPORTER_OTLP_ENDPOINT = getRequiredEnv(
  'OTEL_EXPORTER_OTLP_ENDPOINT',
);

export const env = {
  CANISTER_ID_CYCLES_MONITOR: getRequiredEnv('CANISTER_ID_CYCLES_MONITOR'),
  HTTP_GATEWAY: getRequiredEnv('HTTP_GATEWAY'),
  PRIVATE_KEY: getRequiredEnv('PRIVATE_KEY'),
  METRICS_ENDPOINT: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
};
