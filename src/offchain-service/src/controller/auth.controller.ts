import { Elysia } from 'elysia';
import { CreateEmailVerificationRequestSchema } from '../dto/auth.dto';
import { createEmailVerification } from '../service';

export const authController = new Elysia({ prefix: '/v1.0/auth' }).post(
  '/email-verification',
  async ({ body, status }) => {
    await createEmailVerification(body.email);

    return status(204);
  },
  {
    body: CreateEmailVerificationRequestSchema,
  },
);
