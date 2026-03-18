import { t, type UnwrapSchema } from 'elysia';

export const CreateEmailVerificationRequestSchema = t.Object({
  email: t.String({ format: 'email' }),
});
export type CreateEmailVerificationRequest = UnwrapSchema<
  typeof CreateEmailVerificationRequestSchema
>;
