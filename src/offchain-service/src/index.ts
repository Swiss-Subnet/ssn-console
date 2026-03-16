import { Elysia } from 'elysia';
import { authController } from './controller';

import { env } from './env';

export const app = new Elysia().use(authController).listen(env.PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
