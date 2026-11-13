// Builds what a plugin repo generates: the MCP server bundle in server/index.mjs, the licence of
// every package it inlines in server/THIRD_PARTY_LICENSES.txt, and a Codex profile in codex/agents/
// for each subagent in agents/. `--check` builds into a temporary folder and fails when a committed
// file differs. Every Sidecut plugin repo has this file unchanged.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const id = JSON.parse(readFileSync('package.json', 'utf8')).name as string;
const plugin = join('plugins', id);
const check = process.argv.includes('--check');
const output = check ? mkdtempSync(join(tmpdir(), 'build-server-')) : plugin;
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

// The package's licence files (names starting with licence, license or copying, in any case, sorted
// so every system picks the same ones, symlinks followed); otherwise the licence its package.json
// names.
function licence(pkg: string, dir: string): string {
  const files = readdirSync(dir)
    .filter((f) => /^(licen[cs]e|copying)/i.test(f) && statSync(join(dir, f)).isFile())
    .sort();
  if (files.length > 0) {
    const texts = files.map((f) => readFileSync(join(dir, f), 'utf8').trim());
    return `${pkg}\n\n${texts.join('\n\n')}\n`;
  }
  const manifest = join(dir, 'package.json');
  const named = existsSync(manifest)
    ? JSON.parse(readFileSync(manifest, 'utf8')).license
    : undefined;
  if (typeof named !== 'string')
    throw new Error(`${pkg} has neither a licence file nor a license field.`);
  return `${pkg}\n\nLicensed under ${named}. The package ships no licence file.\n`;
}

// Codex loads subagents only from a project's .codex/agents/, so the plugin ships each one as a
// profile its skills copy there: the name as <prefix>_<role>, the description, and the body.
function codexProfile(markdown: string, prefix: string, role: string): string {
  const [, head = '', body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(markdown) ?? [];
  const description = /^description: "(.*)"$/m.exec(head)?.[1] ?? '';
  const note =
    "Codex runs you with the parent session's permissions, so any limit above is an instruction, not a sandbox.";
  return [
    `name = ${JSON.stringify(`${prefix}_${role}`)}`,
    `description = ${JSON.stringify(description)}`,
    `developer_instructions = ${JSON.stringify(`${body.trim()}\n\n${note}\n`)}`,
    '',
  ].join('\n');
}

function generated(): string[] {
  const files: string[] = [];
  const server = join(plugin, 'server');
  mkdirSync(join(output, 'server'), { recursive: true });
  // The same command the house-style checker uses, so its stale-bundle check compares like with like.
  const build = spawnSync(
    'bun',
    [
      'build',
      join(server, 'src', 'index.ts'),
      '--target=node',
      '--format=esm',
      `--outfile=${join(output, 'server', 'index.mjs')}`,
      `--metafile=${join(meta, 'meta.json')}`,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (build.status !== 0) throw new Error('The MCP server failed to build.');
  const inputs = Object.keys(
    JSON.parse(readFileSync(join(meta, 'meta.json'), 'utf8')).inputs as object,
  );
  const notices = [...packagesOf(inputs)].map(([pkg, dir]) => licence(pkg, dir));
  writeFileSync(join(output, 'server', 'THIRD_PARTY_LICENSES.txt'), notices.join('\n---\n\n'));
  files.push(join('server', 'index.mjs'), join('server', 'THIRD_PARTY_LICENSES.txt'));
  const agents = join(plugin, 'agents');
  const roles = existsSync(agents) ? readdirSync(agents).filter((f) => f.endsWith('.md')) : [];
  if (roles.length > 0) mkdirSync(join(output, 'codex', 'agents'), { recursive: true });
  const prefix = id.replace(/^sidecut-/, '');
  for (const file of roles.sort()) {
    const role = file.replace(/\.md$/, '');
    const profile = join('codex', 'agents', `${prefix}-${role}.toml`);
    writeFileSync(
      join(output, profile),
      codexProfile(readFileSync(join(agents, file), 'utf8'), prefix, role),
    );
    files.push(profile);
  }
  return files;
}

try {
  const files = generated();
  if (check) {
    const profiles = join(plugin, 'codex', 'agents');
    const committed = existsSync(profiles)
      ? readdirSync(profiles).map((f) => join('codex', 'agents', f))
      : [];
    for (const file of new Set([...files, ...committed])) {
      const wanted = existsSync(join(output, file)) ? readFileSync(join(output, file)) : null;
      const actual = existsSync(join(plugin, file)) ? readFileSync(join(plugin, file)) : null;
      if (!wanted || !actual || !wanted.equals(actual)) {
        throw new Error(`${file} is stale. Run bun run build and commit it.`);
      }
    }
  }
} finally {
  rmSync(meta, { recursive: true, force: true });
  if (check) rmSync(output, { recursive: true, force: true });
}
