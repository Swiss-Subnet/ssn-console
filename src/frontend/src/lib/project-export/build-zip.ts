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
  crate: string;
  principal: string;
};

const CANISTER_PATH_MARKER = '__CANISTER__';
const TOKEN_PROJECT = '__PROJECT__';
const TOKEN_CANISTER = '__CANISTER__';
const TOKEN_CANISTER_CRATE = '__CANISTER_CRATE__';

export function slugifyProjectName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'project';
}

function slugifyCanisterName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'canister';
}

function crateName(slug: string): string {
  return slug.replace(/-/g, '_');
}

export function resolveCanisterNames(
  canisters: Canister[],
): ExportedCanister[] {
  const exported: ExportedCanister[] = [];
  const usedNames = new Set<string>();

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
    exported.push({ name, crate: crateName(name), principal: c.principal });
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

// Map template paths to the names they should have in the zip. The template
// stores its gitignore as `gitignore` (no dot) so the file isn't shadowed by
// the repo's own ignore rules; restore the dot at export time.
function rewritePlainPath(relPath: string): string {
  if (relPath === 'gitignore') return '.gitignore';
  return relPath;
}

function rewriteCanisterPath(relPath: string, canisterName: string): string {
  return rewritePlainPath(relPath)
    .split(CANISTER_PATH_MARKER)
    .join(canisterName);
}

function renderContent(
  content: string,
  canister: ExportedCanister | null,
  input: BuildProjectZipInput,
): string {
  let out = content.split(TOKEN_PROJECT).join(input.projectName);
  if (canister !== null) {
    out = out
      .split(TOKEN_CANISTER_CRATE)
      .join(canister.crate)
      .split(TOKEN_CANISTER)
      .join(canister.name);
  }
  return out;
}

function renderIcpYaml(canisters: ExportedCanister[]): string {
  const entries = canisters
    .map(
      c => `  - name: ${c.name}
    build:
      steps:
        - type: script
          commands:
            - cargo build --target wasm32-unknown-unknown --release -p ${c.crate}
            - cp target/wasm32-unknown-unknown/release/${c.crate}.wasm "$ICP_WASM_OUTPUT_PATH"`,
    )
    .join('\n');
  return `canisters:\n${entries}\n`;
}

function renderIdsJson(canisters: ExportedCanister[]): string {
  const map: Record<string, string> = {};
  for (const c of canisters) map[c.name] = c.principal;
  return `${JSON.stringify(map, null, 2)}\n`;
}
