// Bundles the plugin's MCP server into server/index.mjs and writes the licence of every package the
// bundle inlines to server/THIRD_PARTY_LICENSES.txt. `--check` builds into a temporary folder and
// fails when either committed file differs. Every Sidecut plugin repo has this file unchanged.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const id = JSON.parse(readFileSync('package.json', 'utf8')).name as string;
const server = join('plugins', id, 'server');
const check = process.argv.includes('--check');
const output = check ? mkdtempSync(join(tmpdir(), 'build-server-')) : server;
const meta = mkdtempSync(join(tmpdir(), 'build-meta-'));

// Each bundled package and the folder it was read from: the last node_modules folder in a path, so
// a nested copy or Bun's isolated store (node_modules/.bun/<pkg>@<version>/node_modules/<pkg>)
// counts as itself.
function packagesOf(inputs: string[]): Map<string, string> {
  const found = new Map<string, string>();
  for (const path of inputs) {
    const last = [...path.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g)].at(-1);
    if (last?.[1] && !found.has(last[1])) {
      found.set(last[1], path.slice(0, (last.index ?? 0) + last[0].length));
    }
  }
  return new Map([...found].sort(([a], [b]) => a.localeCompare(b)));
}

// The package's licence file, whatever its case or name; otherwise the licence its package.json names.
function licence(pkg: string, dir: string): string {
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f));
  if (file) return `${pkg}\n\n${readFileSync(join(dir, file), 'utf8').trim()}\n`;
  const manifest = join(dir, 'package.json');
  const named = existsSync(manifest)
    ? JSON.parse(readFileSync(manifest, 'utf8')).license
    : undefined;
  if (typeof named !== 'string')
    throw new Error(`${pkg} has neither a licence file nor a license field.`);
  return `${pkg}\n\nLicensed under ${named}. The package ships no licence file.\n`;
}

try {
  // The same command the house-style checker uses, so its stale-bundle check compares like with like.
  const build = spawnSync(
    'bun',
    [
      'build',
      join(server, 'src', 'index.ts'),
      '--target=node',
      '--format=esm',
      `--outfile=${join(output, 'index.mjs')}`,
      `--metafile=${join(meta, 'meta.json')}`,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (build.status !== 0) throw new Error('The MCP server failed to build.');
  const inputs = Object.keys(
    JSON.parse(readFileSync(join(meta, 'meta.json'), 'utf8')).inputs as object,
  );
  const notices = [...packagesOf(inputs)].map(([pkg, dir]) => licence(pkg, dir));
  writeFileSync(join(output, 'THIRD_PARTY_LICENSES.txt'), notices.join('\n---\n\n'));
  if (check) {
    for (const file of ['index.mjs', 'THIRD_PARTY_LICENSES.txt']) {
      if (!readFileSync(join(output, file)).equals(readFileSync(join(server, file)))) {
        throw new Error(`${file} is stale. Run bun run build and commit it.`);
      }
    }
  }
} finally {
  rmSync(meta, { recursive: true, force: true });
  if (check) rmSync(output, { recursive: true, force: true });
}
