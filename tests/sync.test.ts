import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkRepo } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import { Report } from '../plugins/sidecut-agentskills/server/src/check/report.ts';
import {
  applySync,
  mergeBlocks,
  newer,
  planSync,
} from '../plugins/sidecut-agentskills/server/src/check/sync.ts';
import { ownVersion, scaffoldPlugin } from '../plugins/sidecut-agentskills/server/src/scaffold.ts';

const ID = 'sidecut-demo';
const vars = { id: ID, repo: ID, version: ownVersion };
const scratch: string[] = [];
let base = '';

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'sidecut-sync-base-'));
  scratch.push(base);
  scaffoldPlugin(
    {
      id: ID,
      description: 'Shows how a Sidecut plugin is put together.',
      longDescription:
        'A small example plugin with one skill and one MCP tool. It exists to test sync.',
      keywords: ['example', 'template', 'mcp'],
      date: '2026-11-13',
      checkerSource: 'file:../sidecut-agentskills',
    },
    base,
  );
});

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function copy(): string {
  const root = mkdtempSync(join(tmpdir(), 'sidecut-sync-'));
  scratch.push(root);
  cpSync(base, root, { recursive: true });
  return root;
}
const read = (root: string, path: string) => readFileSync(join(root, path), 'utf8');
const write = (root: string, path: string, text: string) => writeFileSync(join(root, path), text);
type Pkg = {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  [key: string]: unknown;
};
const pkg = (root: string, change: (v: Pkg) => void) => {
  const value = JSON.parse(read(root, 'package.json'));
  change(value);
  write(root, 'package.json', `${JSON.stringify(value, null, 2)}\n`);
};
const files = (root: string) => planSync(root, vars).map((c) => c.file);

test('a freshly generated repo has nothing to sync', () => {
  expect(planSync(base, vars)).toEqual([]);
});

test('a changed owned file goes back to the Sidecut copy', () => {
  const root = copy();
  write(root, 'scripts/release.ts', '// mine\n');
  expect(files(root)).toEqual(['scripts/release.ts']);
  applySync(root, planSync(root, vars));
  expect(planSync(root, vars)).toEqual([]);
});

test("a block is rewritten and the repo's own lines around it stay", () => {
  const root = copy();
  write(root, '.gitignore', `${read(root, '.gitignore').replace('*.log\n', '')}dist/\n`);
  applySync(root, planSync(root, vars));
  const text = read(root, '.gitignore');
  expect(text).toContain('*.log\n');
  expect(text.endsWith('# sidecut:end house-style\ndist/\n')).toBe(true);
});

test('adopting a block replaces the lines it covers instead of repeating them', () => {
  const template =
    '# Security\n\n<!-- sidecut:start a -->\n\n## Report\n\nTell us.\n\n<!-- sidecut:end a -->\n\n## Runs\n';
  const before = '# Security\n\n## Report\n\nTell us.\n\n## Runs\n\nA server.\n';
  expect(mergeBlocks(before, template, 'SECURITY.md')).toEqual({
    text: '# Security\n\n<!-- sidecut:start a -->\n\n## Report\n\nTell us.\n\n<!-- sidecut:end a -->\n\n## Runs\n\nA server.\n',
  });
  const ignore = '# sidecut:start a\nnode_modules/\n.env*\n# sidecut:end a\n';
  expect(mergeBlocks('node_modules/\ndist/\n\n# Secrets\n.env*\n', ignore, '.gitignore')).toEqual({
    text: '# sidecut:start a\nnode_modules/\n.env*\n# sidecut:end a\ndist/\n\n# Secrets\n',
  });
});

test('shared tool versions only go up, and the checker pin follows this version', () => {
  const root = copy();
  pkg(root, (v) => {
    v.devDependencies['@biomejs/biome'] = '2.0.0';
    v.devDependencies.typescript = '99.0.0';
    v.devDependencies['sidecut-agentskills'] = 'github:SidecutStudio/sidecut-agentskills#v0.1.0';
  });
  applySync(root, planSync(root, vars));
  const dev = JSON.parse(read(root, 'package.json')).devDependencies;
  expect(dev['@biomejs/biome']).not.toBe('2.0.0');
  expect(dev.typescript).toBe('99.0.0');
  expect(dev['sidecut-agentskills']).toBe(
    `github:SidecutStudio/sidecut-agentskills#v${ownVersion}`,
  );
});

test('a local checker source is left alone', () => {
  expect(files(base)).not.toContain('package.json');
});

test('versions compare by number', () => {
  expect(newer('0.10.0', '0.9.9')).toBe(true);
  expect(newer('1.0.0', '1.0.0')).toBe(false);
  expect(newer('main', '1.0.0')).toBe(false);
});

test('sidecut.keep skips a file in sync and lists it as kept in the checker', () => {
  const root = copy();
  write(root, 'scripts/release.ts', '// mine\n');
  pkg(root, (v) => Object.assign(v, { sidecut: { keep: { 'scripts/release.ts': 'Testing.' } } }));
  expect(planSync(root, vars, (file) => file === 'scripts/release.ts')).toEqual([]);
  const report = new Report();
  checkRepo(root, report);
  expect(report.problems.map((p) => p.code)).not.toContain('REPO_SYNC');
  expect(report.kept.map((p) => `${p.code} ${p.file} ${p.reason}`)).toEqual([
    'REPO_SYNC scripts/release.ts Testing.',
  ]);
});

test('a keep that covers nothing, or has no reason, is a problem', () => {
  const root = copy();
  pkg(root, (v) =>
    Object.assign(v, { sidecut: { keep: { 'scripts/release.ts': 'Old.', NOTES: '' } } }),
  );
  const report = new Report();
  checkRepo(root, report);
  expect(
    report.problems
      .map((p) => p.code)
      .filter((c) => c.startsWith('KEEP_'))
      .sort(),
  ).toEqual(['KEEP_REASON', 'KEEP_UNUSED']);
});

test('a check script may add its own steps around the standard ones', () => {
  const root = copy();
  pkg(root, (v) => {
    v.scripts.check = `${v.scripts.check} && bun scripts/extra.ts`;
    v.scripts.build = `${v.scripts.build} && bun scripts/extra.ts`;
  });
  const report = new Report();
  checkRepo(root, report);
  const codes = report.problems.map((p) => p.code);
  expect(codes).not.toContain('REPO_CHECK_SCRIPT');
  expect(codes).not.toContain('REPO_BUILD_SCRIPT');
});

test('the checker says what it checked', () => {
  const report = new Report();
  checkRepo(base, report);
  expect(report.scope).toBe(`Checked the whole repo for ${ID}.`);
});

const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')),
);
const git = (root: string, ...args: string[]) =>
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
    cwd: root,
    env: cleanEnv,
  });
const cli = (root: string, ...args: string[]) =>
  spawnSync('bun', [join(import.meta.dir, '..', 'scripts', 'sync.ts'), root, ...args], {
    encoding: 'utf8',
  });

test('sidecut-sync --check lists the change, refuses uncommitted work, then syncs', () => {
  const root = copy();
  git(root, 'init', '-q');
  write(root, 'CLAUDE.md', 'Read AGENTS.md.\n');
  const check = cli(root, '--check');
  expect(check.status).toBe(1);
  expect(check.stdout).toContain('Would change CLAUDE.md');
  const dirty = cli(root, '--offline');
  expect(dirty.status).toBe(1);
  expect(dirty.stderr).toContain('uncommitted changes');
  expect(read(root, 'CLAUDE.md')).toBe('Read AGENTS.md.\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'base');
  expect(cli(root, '--offline').status).toBe(0);
  expect(read(root, 'CLAUDE.md')).toBe('@AGENTS.md\n');
});

test('sidecut-sync refuses a folder that is not a git repo', () => {
  const root = copy();
  write(root, 'CLAUDE.md', 'Read AGENTS.md.\n');
  expect(cli(root, '--offline').stderr).toContain('not a git repo');
  expect(read(root, 'CLAUDE.md')).toBe('Read AGENTS.md.\n');
});

test('a folder, code or "CODE file" keep protects files from sync too', () => {
  for (const key of ['scripts', 'REPO_SYNC', 'REPO_SYNC scripts/release.ts']) {
    const root = copy();
    write(root, 'scripts/release.ts', '// mine\n');
    pkg(root, (v) => Object.assign(v, { sidecut: { keep: { [key]: 'Mine.' } } }));
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'base');
    cli(root, '--offline');
    expect(read(root, 'scripts/release.ts')).toBe('// mine\n');
  }
});

test('a .gitignore with negations keeps every line, so what it ignores does not change', () => {
  const ignore = '# sidecut:start a\n*.log\n# sidecut:end a\n';
  const result = mergeBlocks('dist/\n!keep.log\n*.log\n', ignore, '.gitignore');
  expect(result).toEqual({
    text: '# sidecut:start a\n*.log\n# sidecut:end a\ndist/\n!keep.log\n*.log\n',
  });
});

test('adoption leaves fenced examples alone, keeps CRLF, and goes under the title', () => {
  const template = '# Title\n\n<!-- sidecut:start a -->\n- Shared rule.\n<!-- sidecut:end a -->\n';
  const before = '# Security Policy\r\n\r\n```text\r\n- Shared rule.\r\n```\r\n- Shared rule.\r\n';
  const result = mergeBlocks(before, template, 'SECURITY.md');
  expect(result).toEqual({
    text: '# Security Policy\r\n\r\n<!-- sidecut:start a -->\r\n- Shared rule.\r\n<!-- sidecut:end a -->\r\n\r\n```text\r\n- Shared rule.\r\n```\r\n',
  });
});

test('broken markers are left for a person to fix', () => {
  const template = '<!-- sidecut:start a -->\nx\n<!-- sidecut:end a -->\n';
  for (const before of [
    '<!-- sidecut:start a -->\nold\n',
    '<!-- sidecut:start a -->\n<!-- sidecut:start a -->\nold\n<!-- sidecut:end a -->\n',
    'old\n<!-- sidecut:end a -->\n',
  ])
    expect('error' in mergeBlocks(before, template, 'AGENTS.md')).toBe(true);
  const root = copy();
  write(root, 'AGENTS.md', `${read(root, 'AGENTS.md')}<!-- sidecut:start house-style -->\n`);
  const plan = planSync(root, vars);
  expect(plan.map((c) => [c.file, c.next])).toEqual([['AGENTS.md', null]]);
});

test('package.json keeps its own indentation', () => {
  const root = copy();
  const value = JSON.parse(read(root, 'package.json'));
  value.devDependencies['@biomejs/biome'] = '2.0.0';
  write(root, 'package.json', `${JSON.stringify(value, null, '\t')}\n`);
  const [change] = planSync(root, vars);
  expect(change?.next?.startsWith('{\n\t"name"')).toBe(true);
});
