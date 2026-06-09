import { DelegationIdentity } from '@icp-sdk/core/identity';
import type { Identity } from '@icp-sdk/core/agent';
import z from 'zod';

export type MetricSlug =
  | 'memory-bytes'
  | 'compute-time-seconds'
  | 'burned-cycles';

const metricSlugSchema = z.enum([
  'memory-bytes',
  'compute-time-seconds',
  'burned-cycles',
]);

export type MetricPoint = {
  ts: Date;
  value: number;
};

export type MetricRange = {
  canisterId: string;
  metric: MetricSlug;
  unit: string;
  description: string;
  points: MetricPoint[];
};

type QueryRangeArgs = {
  canisterId: string;
  metric: MetricSlug;
  from: Date;
  to: Date;
  step: string;
  identity: Identity;
  signal?: AbortSignal;
};

const rawResponseSchema = z.object({
  canister_id: z.string(),
  metric: metricSlugSchema,
  unit: z.string(),
  description: z.string(),
  points: z.array(z.object({ ts: z.number(), value: z.number() })).nullable(),
});

const sessionResponseSchema = z.object({
  token: z.string().min(1),
  expires_at_ms: z.number(),
});

const HEADER_DELEGATION = 'X-IC-Delegation';
const HEADER_SIGNATURE = 'X-IC-Signature';
const HEADER_TIMESTAMP = 'X-IC-Timestamp';

const SESSION_REFRESH_BUFFER_MS = 30_000;

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) {
    s += b.toString(16).padStart(2, '0');
  }
  return s;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(new Uint8Array(buf));
}

export class MetricsProxyApi {
  private session: { token: string; expiresAtMs: number } | null = null;
  private inflightSession: Promise<string> | null = null;

  constructor(private readonly rootUrl: string) {}

  public async queryRange(args: QueryRangeArgs): Promise<MetricRange> {
    const params = new URLSearchParams({
      from: args.from.toISOString(),
      to: args.to.toISOString(),
      step: args.step,
    });
    const path = `/v1/canisters/${encodeURIComponent(args.canisterId)}/metrics/${encodeURIComponent(args.metric)}`;
    const url = `${this.rootUrl}${path}?${params.toString()}`;

    const token = await this.getSessionToken(args.identity);
    const init: RequestInit = {
      headers: { Authorization: `Bearer ${token}` },
    };
    if (args.signal) init.signal = args.signal;
    const res = await fetch(url, init);
    if (!res.ok) {
      throw new Error(
        `metrics-proxy ${res.status} ${res.statusText}: ${await res.text()}`,
      );
    }
    const body = rawResponseSchema.parse(await res.json());
    return {
      canisterId: body.canister_id,
      metric: body.metric,
      unit: body.unit,
      description: body.description,
      points: (body.points ?? []).map(p => ({
        ts: new Date(p.ts),
        value: p.value,
      })),
    };
  }

  private async getSessionToken(identity: Identity): Promise<string> {
    if (
      this.session &&
      Date.now() < this.session.expiresAtMs - SESSION_REFRESH_BUFFER_MS
    ) {
      return this.session.token;
    }
    if (this.inflightSession) return this.inflightSession;
    this.inflightSession = this.mintSession(identity).finally(() => {
      this.inflightSession = null;
    });
    return this.inflightSession;
  }

  private async mintSession(identity: Identity): Promise<string> {
    if (!(identity instanceof DelegationIdentity)) {
      throw new Error(
        `metrics-proxy: expected DelegationIdentity, got ${identity.constructor.name}; user must be logged in via II with an Ed25519 session key`,
      );
    }
    const path = '/v1/session';
    const url = `${this.rootUrl}${path}`;
    const timestampMillis = Date.now();
    const delegation = identity.getDelegation();
    const pubKeyView = new Uint8Array(
      delegation.publicKey as unknown as ArrayBufferLike,
    );
    const pubKeyCopy = new Uint8Array(pubKeyView.length);
    pubKeyCopy.set(pubKeyView);
    const chainPubKeyHex = await sha256Hex(pubKeyCopy.buffer);
    const challenge = new TextEncoder().encode(
      `POST\n${path}\n\n${timestampMillis}\n${chainPubKeyHex}`,
    );
    const sig = await identity.sign(challenge);
    const delegationJSON = JSON.stringify(delegation.toJSON());

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        [HEADER_DELEGATION]: delegationJSON,
        [HEADER_SIGNATURE]: toHex(new Uint8Array(sig)),
        [HEADER_TIMESTAMP]: String(timestampMillis),
      },
    });
    if (!res.ok) {
      throw new Error(
        `metrics-proxy session ${res.status} ${res.statusText}: ${await res.text()}`,
      );
    }
    const body = sessionResponseSchema.parse(await res.json());
    this.session = { token: body.token, expiresAtMs: body.expires_at_ms };
    return body.token;
  }
}
