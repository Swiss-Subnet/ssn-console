import { describe, it, expect } from 'bun:test';
import './mocks';
import './setup';
import { app } from '../index';

describe('GET /status', () => {
  it('should return 200', async () => {
    const response = await app.handle(
      new Request(`http://localhost/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const data = await response.text();

    expect(response.status).toBe(200);
    expect(data).toEqual('ok');
  });
});
