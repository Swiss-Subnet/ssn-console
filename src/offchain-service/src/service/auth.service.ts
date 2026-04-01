import { SignJWT, importPKCS8 } from 'jose';
import nodemailer from 'nodemailer';
import { env } from '../env';

const privateKey = await importPKCS8(env.PRIVATE_KEY, 'EdDSA');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function generateEmailVerificationToken(
  email: string,
): Promise<string> {
  return await new SignJWT({ email })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey);
}

async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const magicLink = `${env.FRONTEND_URL}/verify?token=${token}`;

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Swiss Subnet Email Verification',
    html: `<p>Click <a href="${magicLink}">here</a> to sign in to SSN Console.</p>
           <p>This link will expire in 15 minutes.</p>`,
    text: `Sign in to SSN Console by visiting this link: ${magicLink}\nThis link will expire in 15 minutes.`,
  });
}

export async function createEmailVerification(email: string): Promise<void> {
  const token = await generateEmailVerificationToken(email);
  await sendVerificationEmail(email, token);
}
