import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { name } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
if (args.some((arg) => ['--publish', '--publish-report'].includes(arg.split('=')[0])))
  throw new Error('Development evals are not published.');
const output = join(root, 'eval-results', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(output, { recursive: true });
const temporary = mkdtempSync(join(tmpdir(), 'sidecut-eval-'));
try {
  const plugin = join(temporary, name);
  cpSync(join(root, 'plugins', name), plugin, { recursive: true });
  cpSync(join(root, 'evals'), join(plugin, 'evals'), { recursive: true });
  const result = spawnSync(
    'claude',
    [
      'plugin',
      'eval',
      plugin,
      '--output-dir',
      output,
      '--report',
      join(output, 'report.html'),
      ...args,
      '--no-publish',
    ],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
