export class AuthApi {
  constructor(private readonly rootUrl: string) {}

  public async sendEmailVerification(email: string): Promise<void> {
    const res = await fetch(`${this.rootUrl}/v1.0/auth/email-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      throw new Error(`Unexpected response ${res.status} ${res.statusText}`);
    }
  }
}
