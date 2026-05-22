import { zipSync, strToU8, type Zippable } from 'fflate';
import { CanisterAvailability, type Canister } from '@/lib/api-models/canister';

const templateFiles = import.meta.glob('./template/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export type BuildProjectZipInput = {
  projectName: string;
  canisters: Canister[];
};

export type ExportedCanister = {
  name: string;
  principal: string;
  accent: string;
};

const CANISTER_PATH_MARKER = '__CANISTER__';
const TOKEN_PROJECT = '{{PROJECT}}';
const TOKEN_CANISTER = '{{CANISTER}}';
const TOKEN_CANISTER_PRINCIPAL = '{{CANISTER_PRINCIPAL}}';
const TOKEN_ACCENT = '{{ACCENT}}';

const ASSET_RECIPE = '@dfinity/asset-canister@v2.1.0';

const ACCENT_PALETTE = [
  '#29A3DA',
  '#E51E79',
  '#E95A24',
  '#F3A83B',
  '#522780',
  '#e22f30',
];

export function slugifyProjectName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'project';
}

export function slugifyCanisterName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'canister';
}

export function resolveCanisterNames(
  canisters: Canister[],
): ExportedCanister[] {
  const exported: ExportedCanister[] = [];
  const usedNames = new Set<string>();

  let i = 0;
  for (const c of canisters) {
    if (c.state.availability === CanisterAvailability.Deleted) continue;

    const raw = c.name?.trim() || `canister-${c.principal.slice(0, 8)}`;
    const base = slugifyCanisterName(raw);
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${base}-${suffix++}`;
    }
    usedNames.add(name);
    exported.push({
      name,
      principal: c.principal,
      accent: ACCENT_PALETTE[i % ACCENT_PALETTE.length]!,
    });
    i++;
  }

  return exported;
}

export function buildProjectZip(input: BuildProjectZipInput): Uint8Array {
  const exported = resolveCanisterNames(input.canisters);
  if (exported.length === 0) {
    throw new Error('No canisters available to export.');
  }

  const slug = slugifyProjectName(input.projectName);
  const root = `${slug}/`;
  const files: Zippable = {};

  for (const [absPath, content] of Object.entries(templateFiles)) {
    const relPath = absPath.replace(/^\.\/template\//, '');
    if (relPath.includes(CANISTER_PATH_MARKER)) {
      for (const canister of exported) {
        const path = root + rewriteCanisterPath(relPath, canister.name);
        files[path] = strToU8(renderContent(content, canister, input));
      }
    } else {
      const path = root + rewritePlainPath(relPath);
      files[path] = strToU8(renderContent(content, null, input));
    }
  }

  files[`${root}icp.yaml`] = strToU8(renderIcpYaml(exported));
  files[`${root}.icp/data/mappings/ic.ids.json`] = strToU8(
    renderIdsJson(exported),
  );

  return zipSync(files);
}

// Template stores `gitignore` (no dot) and `assets/` (not `dist/`) so the
// repo's own gitignore doesn't shadow them during dev; restore both at export.
function rewritePlainPath(relPath: string): string {
  if (relPath === 'gitignore') return '.gitignore';
  return relPath;
}

function rewriteCanisterPath(relPath: string, canisterName: string): string {
  const named = rewritePlainPath(relPath)
    .split(CANISTER_PATH_MARKER)
    .join(canisterName);
  return named.replace(`${canisterName}/assets/`, `${canisterName}/dist/`);
}

function renderContent(
  content: string,
  canister: ExportedCanister | null,
  input: BuildProjectZipInput,
): string {
  let out = content.split(TOKEN_PROJECT).join(input.projectName);
  if (canister !== null) {
    out = out
      .split(TOKEN_CANISTER_PRINCIPAL)
      .join(canister.principal)
      .split(TOKEN_ACCENT)
      .join(canister.accent)
      .split(TOKEN_CANISTER)
      .join(canister.name);
  }
  return out;
}

function renderIcpYaml(canisters: ExportedCanister[]): string {
  const entries = canisters
    .map(
      c => `  - name: ${c.name}
    recipe:
      type: "${ASSET_RECIPE}"
      configuration:
        dir: src/${c.name}/dist`,
    )
    .join('\n');
  // Explicit local network on a non-standard port; the default 8000 frequently
  // collides with dfx/pocket-ic from other projects.
  return `networks:
  - name: local
    mode: managed
    gateway:
      bind: 127.0.0.1
      port: 8765

canisters:
${entries}
`;
}

function renderIdsJson(canisters: ExportedCanister[]): string {
  const map: Record<string, string> = {};
  for (const c of canisters) map[c.name] = c.principal;
  return `${JSON.stringify(map, null, 2)}\n`;
}
