function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function parsePort(value: string, name: string): number {
  const port = parseInt(value, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid ${name}: must be a valid port number between 1 and 65535`,
    );
  }
  return port;
}

export const env = {
  PRIVATE_KEY: getRequiredEnv('PRIVATE_KEY'),
  FRONTEND_URL: getRequiredEnv('FRONTEND_URL'),
  SMTP_HOST: getRequiredEnv('SMTP_HOST'),
  SMTP_PORT: parsePort(getOptionalEnv('SMTP_PORT', '587'), 'SMTP_PORT'),
  SMTP_USER: getRequiredEnv('SMTP_USER'),
  SMTP_PASS: getRequiredEnv('SMTP_PASS'),
  SMTP_FROM: getOptionalEnv('SMTP_FROM', '"Swiss Subnet" <noreply@subnet.ch>'),
  PORT: parsePort(getOptionalEnv('PORT', '3000'), 'PORT'),
};
