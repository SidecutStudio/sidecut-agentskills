import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildSync } from 'esbuild';

const check = process.argv.includes('--check');
// Each CLI in bin/, and bin/evals-hash.mjs, the tree hash sidecut-evals imports so both repos hash
// a copy the same way.
const outputs = [
  ...['check', 'evals-stamp', 'icon', 'sync', 'version'].map((name) => ({
    entry: 'scripts/' + name + '.ts',
    path: 'bin/' + name + '.mjs',
  })),
  {
    entry: 'plugins/sidecut-agentskills/server/src/check/evals-stamp.ts',
    path: 'bin/evals-hash.mjs',
  },
];
for (const { entry, path } of outputs) {
  const result = buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    packages: 'external',
    outfile: path,
    write: false,
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error('Missing CLI output: ' + path);
  if (check) {
    if (!existsSync(path) || !readFileSync(path).equals(output.contents))
      throw new Error(path + ' is stale. Run npm run build.');
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, output.contents);
    if (path.startsWith('bin/')) chmodSync(path, 0o755);
  }
}
