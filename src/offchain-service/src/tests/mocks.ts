import { mock } from 'bun:test';

export const sendMailMock = mock();

mock.module('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: sendMailMock.mockResolvedValue({}),
    }),
  },
}));

export { sendMailMock as sendMailSpy };
