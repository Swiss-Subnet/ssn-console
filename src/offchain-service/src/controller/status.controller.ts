import { Elysia } from 'elysia';

export const statusController = new Elysia({ prefix: '/status' }).get(
  '/',
  () => 'ok',
);
