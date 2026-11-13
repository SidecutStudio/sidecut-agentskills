// Bundles the plugin's MCP server into server/index.mjs and writes the licence of every package the
// bundle inlines to server/THIRD_PARTY_LICENSES.txt. `--check` builds into a temporary folder and
// fails when either committed file differs. Every Sidecut plugin repo has this file unchanged.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const id = JSON.parse(readFileSync('package.json', 'utf8')).name as string;
const server = join('plugins', id, 'server');
const check = process.argv.includes('--check');
const output = check ? mkdtempSync(join(tmpdir(), 'build-server-')) : server;
const meta = mkdtempSync(join(tmpdir(), 'build-meta-'));

function licence(pkg: string): string {
  const dir = join('node_modules', pkg);
  const name = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license'].find((f) =>
    existsSync(join(dir, f)),
  );
  if (!name) throw new Error(`${pkg} has no licence file in node_modules.`);
  return `${pkg}\n\n${readFileSync(join(dir, name), 'utf8').trim()}\n`;
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
  const packages = [
    ...new Set(inputs.flatMap((p) => /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(p)?.[1] ?? [])),
  ].sort();
  writeFileSync(join(output, 'THIRD_PARTY_LICENSES.txt'), packages.map(licence).join('\n---\n\n'));
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
