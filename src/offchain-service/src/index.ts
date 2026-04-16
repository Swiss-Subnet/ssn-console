import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import logixlysia from 'logixlysia';

import { opentelemetry } from '@elysiajs/opentelemetry';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_NAMESPACE,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

import { authController, statusController } from './controller';
import { env } from './env';

// uncomment for debugging open telemetry
// import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

export const app = new Elysia()
  .use(
    opentelemetry({
      serviceName: 'offchain-service',
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAMESPACE]: 'ssn',
        [ATTR_SERVICE_NAME]: 'offchain-service',
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
          process.env['GRAFANA_ENVIRONMENT'],
      }),
    }),
  )
  .use(cors({ origin: true }))
  .use(logixlysia({ config: { disableFileLogging: true } }))
  .use(statusController)
  .use(authController);

if (import.meta.main) {
  app.listen({
    port: env.PORT,
    hostname: '0.0.0.0',
  });

  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  );
}
