import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { CanisterAvailability, type Canister } from '@/lib/api-models/canister';
import { buildProjectZip } from './build-zip';

function inaccessibleCanister(
  principal: string,
  name: string | null,
): Canister {
  return {
    id: principal,
    principal,
    name,
    state: { availability: CanisterAvailability.Inaccessible },
    deletedAt: null,
  };
}

function readZip(bytes: Uint8Array): Record<string, string> {
  const entries = unzipSync(bytes);
  const out: Record<string, string> = {};
  for (const [path, data] of Object.entries(entries)) {
    out[path] = strFromU8(data);
  }
  return out;
}

describe('buildProjectZip', () => {
  const canisters = [inaccessibleCanister('aaaaa-aa', 'frontend')];

  it('html-escapes the project name in generated index.html', () => {
    const files = readZip(
      buildProjectZip({
        projectName: '<img src=x onerror=alert(1)>',
        canisters,
      }),
    );

    const html = Object.entries(files).find(([p]) =>
      p.endsWith('index.html'),
    )?.[1];
    expect(html).toBeDefined();
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes quotes so the name cannot break out of an attribute', () => {
    const files = readZip(
      buildProjectZip({
        projectName: '"><script>alert(1)</script>',
        canisters,
      }),
    );

    const html = Object.entries(files).find(([p]) =>
      p.endsWith('index.html'),
    )?.[1];
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('"><script>');
  });

  it('html-escapes the project name in README.md', () => {
    const files = readZip(
      buildProjectZip({
        projectName: '<b>pwned</b>',
        canisters,
      }),
    );

    const readme = Object.entries(files).find(([p]) =>
      p.endsWith('README.md'),
    )?.[1];
    expect(readme).toBeDefined();
    expect(readme).not.toContain('<b>pwned</b>');
    expect(readme).toContain('&lt;b&gt;pwned&lt;/b&gt;');
  });

  it('leaves a benign project name readable', () => {
    const files = readZip(
      buildProjectZip({ projectName: 'My App', canisters }),
    );

    const html = Object.entries(files).find(([p]) =>
      p.endsWith('index.html'),
    )?.[1];
    expect(html).toContain('My App');
  });
});
