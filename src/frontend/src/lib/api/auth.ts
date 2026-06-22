// Mirrors auth-service's APIPrefix.
const API_PREFIX = '/v0/auth';

export class AuthApi {
  constructor(private readonly rootUrl: string) {}

  public async sendEmailVerification(email: string): Promise<void> {
    await this.post('/email-verification', email);
  }

  public async sendAccountRecovery(email: string): Promise<void> {
    await this.post('/account-recovery', email);
  }

  private async post(path: string, email: string): Promise<void> {
    const res = await fetch(`${this.rootUrl}${API_PREFIX}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      throw new Error(`Unexpected response ${res.status} ${res.statusText}`);
    }
  }
}
