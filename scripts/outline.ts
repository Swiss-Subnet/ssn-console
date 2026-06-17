#!/usr/bin/env bun
/**
 * Query the Outline "Process & Use-Case Library" collection.
 *
 * Usage: bun outline <command> [...]
 *   search <query>         full-text search within the collection
 *   get <ID-or-title>      print one doc as markdown (e.g. "UC01")
 *   list [NN]              index with statuses, optionally one category
 *   export [dir] [--clean] dump collection to markdown
 *                          (default: docs/process-library — gitignored)
 *
 * Env: OUTLINE_URL, OUTLINE_API_TOKEN (or in .env.local / .env.dev / .env)
 */
import { config } from 'dotenv';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

const COLLECTION_NAME = 'Process & Use-Case Library';
const DEFAULT_EXPORT_DIR = resolve(import.meta.dir, '../docs/process-library');

function loadEnv(): { url: string; token: string } {
  for (const f of ['.env.local', '.env.dev', '.env'])
    config({ path: resolve(import.meta.dir, '..', f), quiet: true });
  const url = process.env.OUTLINE_URL;
  const token = process.env.OUTLINE_API_TOKEN;
  if (!url || !token || token === 'replace-me') {
    console.error(
      'Missing OUTLINE_URL / OUTLINE_API_TOKEN (env or .env.local/.env.dev).',
    );
    process.exit(1);
  }
  return { url: url.replace(/\/+$/, ''), token };
}
const { url: BASE, token: TOKEN } = loadEnv();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function api<T = any>(path: string, body: object): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE}/api/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt <= 20) {
      const wait = Number(res.headers.get('retry-after')) || 15;
      console.error(`rate-limited, waiting ${wait}s...`);
      await sleep(wait * 1000);
      continue;
    }
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(
        `${path} failed (${res.status}): ${json.error ?? ''} ${json.message ?? ''}`,
      );
    }
    return json.data as T;
  }
}

async function collectionId(): Promise<string> {
  const cols = await api<any[]>('collections.list', { limit: 100 });
  const col = cols.find(c => c.name === COLLECTION_NAME);
  if (!col) throw new Error(`Collection "${COLLECTION_NAME}" not found.`);
  return col.id;
}

type Doc = {
  id: string;
  title: string;
  text: string;
  url: string;
  parentDocumentId?: string;
};

async function allDocs(colId: string): Promise<Doc[]> {
  const docs: Doc[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await api<Doc[]>('documents.list', {
      collectionId: colId,
      limit: 100,
      offset,
    });
    docs.push(...page);
    if (page.length < 100) break;
  }
  return docs;
}

const status = (d: Doc) =>
  d.text.match(/\*\*Status\*\*\s*\|\s*(🟢|🟡|🔵|⚪)/)?.[1] ?? '  ';
const isCategory = (d: Doc) => /^\d{2} /.test(d.title) && !d.parentDocumentId;
const slug = (t: string) => t.replace(/[\/\\:*?"<>|]/g, '-');

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!['search', 'get', 'list', 'export'].includes(cmd ?? '')) {
    console.log(
      [
        'Usage: bun outline <command> [...]',
        '',
        '  search <query>         — full-text search within the collection',
        '  get <ID|title>         — fetch one doc as markdown (resolves UC01 by title prefix)',
        '  list [NN]              — index of the collection or one category, with statuses',
        '  export [dir] [--clean] — dump the whole collection to markdown (--clean removes old files first)',
        '                           (default dir: docs/process-library - gitignored)',
      ].join('\n'),
    );
    process.exit(0);
  }
  const colId = await collectionId();

  if (cmd === 'search') {
    const query = args.join(' ');
    if (!query) throw new Error('Usage: search <query>');
    const results = await api<any[]>('documents.search', {
      query,
      collectionId: colId,
      limit: 25,
    });
    for (const r of results) {
      console.log(`\n## ${r.document.title}  (${BASE}${r.document.url})`);
      console.log(r.context.trim());
    }
    if (!results.length) console.log('No results.');
  } else if (cmd === 'get') {
    const needle = args.join(' ').toLowerCase();
    if (!needle) throw new Error('Usage: get <ID-or-title>');
    const docs = await allDocs(colId);
    const doc =
      docs.find(d => d.title.toLowerCase().startsWith(needle + ' ')) ??
      docs.find(d => d.title.toLowerCase().includes(needle));
    if (!doc) throw new Error(`No document matching "${args.join(' ')}".`);
    console.log(`# ${doc.title}\n`);
    console.log(doc.text);
    console.error(`\n(${BASE}${doc.url})`);
  } else if (cmd === 'list') {
    const docs = await allDocs(colId);
    const categories = docs
      .filter(isCategory)
      .sort((a, b) => a.title.localeCompare(b.title));
    const filter = args[0];
    for (const cat of categories) {
      if (filter && !cat.title.startsWith(filter)) continue;
      console.log(`\n${cat.title}`);
      docs
        .filter(d => d.parentDocumentId === cat.id)
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach(d => console.log(`  ${status(d)} ${d.title}`));
    }
    if (!filter) {
      console.log('\n(top-level)');
      docs
        .filter(d => !d.parentDocumentId && !isCategory(d))
        .forEach(d => console.log(`     ${d.title}`));
    }
  } else if (cmd === 'export') {
    const clean = args.includes('--clean');
    const dirArg = args.find(a => !a.startsWith('--'));
    const dir = dirArg ? resolve(dirArg) : DEFAULT_EXPORT_DIR;
    const docs = await allDocs(colId);
    if (clean) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const byId = new Map(docs.map(d => [d.id, d]));
    for (const d of docs) {
      const parent = d.parentDocumentId
        ? byId.get(d.parentDocumentId)
        : undefined;
      const path = parent
        ? join(dir, slug(parent.title), `${slug(d.title)}.md`)
        : isCategory(d)
          ? join(dir, slug(d.title), 'README.md')
          : join(dir, `${slug(d.title)}.md`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `# ${d.title}\n\n${d.text}`);
    }
    console.log(
      `Exported ${docs.length} documents to ${dir}${clean ? ' (clean rebuild)' : ''}`,
    );
  }
}

main().catch(e => {
  console.error(e.message ?? e);
  process.exit(1);
});
