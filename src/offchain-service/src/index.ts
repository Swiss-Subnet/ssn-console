import { Elysia } from 'elysia';
import logixlysia from 'logixlysia';
import { authController, statusController } from './controller';
import { env } from './env';

export const app = new Elysia()
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
