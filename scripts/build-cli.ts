import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildSync } from 'esbuild';

const check = process.argv.includes('--check');
for (const name of ['check', 'icon', 'sync', 'version']) {
  const path = 'bin/' + name + '.mjs';
  const result = buildSync({
    entryPoints: ['scripts/' + name + '.ts'],
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
    mkdirSync('bin', { recursive: true });
    writeFileSync(path, output.contents);
    chmodSync(path, 0o755);
  }
}
