import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// The one folder in plugins/ with a Claude Code manifest, so a repo that ships its plugin beside other
// work, under a package named after that work, runs it too.
const plugins = readdirSync(join(root, 'plugins')).filter((f) =>
  existsSync(join(root, 'plugins', f, '.claude-plugin', 'plugin.json')),
);
if (plugins.length !== 1)
  throw new Error(`Expected one plugin in plugins/, found ${plugins.length}.`);
const [name = ''] = plugins;
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
      // The staged copy is this repo's own plugin, and a background or CI shell can't answer the
      // trust prompt, so the run asserts trust instead of stopping at it.
      '--trust-plugin',
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
