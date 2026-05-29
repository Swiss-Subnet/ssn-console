import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { get } from 'node:https';
import { createGunzip } from 'node:zlib';

// Pinned pocket-ic-server. pic-js bundles its own (older) server; we want a
// specific newer one across Nix, non-Nix, and CI alike, so global-setup spawns
// this binary directly and the stock client attaches by URL. The server panics
// unless the binary is literally named "pocket-ic".
const SERVER_VERSION = '14.0.0';

// sha256 of the gzipped release asset, per platform.
const ASSETS: Record<string, { asset: string; sha256: string }> = {
  'darwin-arm64': {
    asset: 'pocket-ic-arm64-darwin.gz',
    sha256: 'bf9b05bfc663856d9b5e02ed72792c34d66b85be048cb12bb286a9e842744628',
  },
  'linux-arm64': {
    asset: 'pocket-ic-arm64-linux.gz',
    sha256: '60624a206ab5132a17550c901472d1462eac1fd9c735b756222be676ba707760',
  },
  'darwin-x64': {
    asset: 'pocket-ic-x86_64-darwin.gz',
    sha256: '9b0b8cc8196934aa2b87aa912567ba5cc8e92ece39b10f52983c963b8e259d4c',
  },
  'linux-x64': {
    asset: 'pocket-ic-x86_64-linux.gz',
    sha256: '292c0b7fb7066c19de57bb731281f664f6af1ece0ef1462274000075b0ae8a2b',
  },
};

const PORT_POLL_INTERVAL_MS = 100;
const PORT_POLL_TIMEOUT_MS = 30_000;

export interface PocketIcServerHandle {
  url: string;
  stop: () => Promise<void>;
}

export interface PocketIcServerOptions {
  // Server stdout. Defaults to true.
  showRuntimeLogs?: boolean;
  // Server stderr (canister logs). Defaults to true.
  showCanisterLogs?: boolean;
}

export async function startPocketIcServer(
  options: PocketIcServerOptions = {},
): Promise<PocketIcServerHandle> {
  const { showRuntimeLogs = true, showCanisterLogs = true } = options;
  const binPath = await resolveBinary();
  logVersion(binPath);

  const portFile = join(
    tmpdir(),
    `pocket-ic-${process.pid}-${Date.now()}.port`,
  );
  rmSync(portFile, { force: true });

  // --ttl is the per-instance idle-reap timer, not total suite time. One hour is
  // ample headroom for the slowest single test; a short TTL reaps instances
  // mid-suite and surfaces as "Instance was deleted". We kill the server in stop().
  const TTL_SECONDS = 60 * 60;
  const proc = spawn(
    binPath,
    ['--port-file', portFile, '--ttl', String(TTL_SECONDS)],
    {
      stdio: [
        'ignore',
        showRuntimeLogs ? 'inherit' : 'ignore',
        showCanisterLogs ? 'inherit' : 'ignore',
      ],
    },
  );

  const port = await pollPort(portFile, proc);
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    stop: () =>
      new Promise<void>(resolve => {
        proc.once('exit', () => resolve());
        proc.kill();
      }),
  };
}

function logVersion(binPath: string): void {
  try {
    const version = execFileSync(binPath, ['--version'], {
      encoding: 'utf8',
    }).trim();
    console.log(`[pocket-ic] ${version} (${binPath})`);
  } catch {
    console.log(`[pocket-ic] starting ${binPath} (version unknown)`);
  }
}

async function resolveBinary(): Promise<string> {
  const override = process.env.POCKET_IC_BIN;
  if (override) {
    if (!existsSync(override)) {
      throw new Error(`POCKET_IC_BIN points at a missing file: ${override}`);
    }
    return override;
  }

  const key = `${process.platform}-${process.arch}`;
  const entry = ASSETS[key];
  if (!entry) {
    throw new Error(
      `No pinned pocket-ic-server ${SERVER_VERSION} for platform ${key}.`,
    );
  }

  // Name must be "pocket-ic" or the server refuses to start.
  const cacheDir = join(tmpdir(), `ssn-pocket-ic-${SERVER_VERSION}`);
  const binPath = join(cacheDir, 'pocket-ic');
  if (existsSync(binPath)) {
    return binPath;
  }

  mkdirSync(cacheDir, { recursive: true });
  const url = `https://github.com/dfinity/pocketic/releases/download/${SERVER_VERSION}/${entry.asset}`;
  const gz = await download(url);

  const digest = createHash('sha256').update(gz).digest('hex');
  if (digest !== entry.sha256) {
    throw new Error(
      `pocket-ic-server ${SERVER_VERSION} ${entry.asset} hash mismatch: expected ${entry.sha256}, got ${digest}`,
    );
  }

  const tmp = `${binPath}.${process.pid}.tmp`;
  await gunzipTo(gz, tmp);
  chmodSync(tmp, 0o755);
  renameSync(tmp, binPath);
  return binPath;
}

function download(url: string, redirects = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error(`Too many redirects fetching ${url}`));
      return;
    }
    get(url, res => {
      const { statusCode, headers } = res;
      if (
        statusCode &&
        statusCode >= 300 &&
        statusCode < 400 &&
        headers.location
      ) {
        res.resume();
        resolve(download(headers.location, redirects + 1));
        return;
      }
      if (statusCode !== 200) {
        res.resume();
        reject(new Error(`GET ${url} returned ${statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function gunzipTo(gz: Buffer, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    mkdirSync(dirname(dest), { recursive: true });
    const out = createWriteStream(dest);
    const gunzip = createGunzip();
    gunzip.on('error', reject);
    out.on('error', reject);
    out.on('finish', () => resolve());
    gunzip.pipe(out);
    gunzip.end(gz);
  });
}

async function pollPort(portFile: string, proc: ChildProcess): Promise<string> {
  const deadline = Date.now() + PORT_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(
        `pocket-ic-server exited early with code ${proc.exitCode}`,
      );
    }
    if (existsSync(portFile)) {
      const raw = readFileSync(portFile, 'utf8').trim();
      if (raw) {
        return raw;
      }
    }
    await new Promise(r => setTimeout(r, PORT_POLL_INTERVAL_MS));
  }
  proc.kill();
  throw new Error(
    `pocket-ic-server did not report a port within ${PORT_POLL_TIMEOUT_MS}ms`,
  );
}
