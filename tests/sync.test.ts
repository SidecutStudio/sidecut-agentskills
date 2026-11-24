import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
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
      settings: { profile: 'sidecut' },
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

test('sync restores the packaged user-input guide from its source', () => {
  const root = copy();
  const guide = `plugins/${ID}/server/data/user-input.md`;
  rmSync(join(root, guide));
  expect(files(root)).toEqual([guide]);
  applySync(root, planSync(root, vars));
  expect(read(root, guide)).toBe(read(base, guide));
});

test('sync moves the guide from its old name and points the skills at the new one', () => {
  const root = copy();
  const guide = `plugins/${ID}/server/data/user-input.md`;
  const old = `plugins/${ID}/server/data/owner-input.md`;
  const skills = readdirSync(join(root, `plugins/${ID}/skills`));
  const skill = `plugins/${ID}/skills/${skills[0]}/SKILL.md`;
  write(root, old, read(root, guide));
  rmSync(join(root, guide));
  write(root, skill, `${read(root, skill)}\nFollow \`server/data/owner-input.md\`.\n`);
  applySync(root, planSync(root, vars));
  expect(existsSync(join(root, old))).toBe(false);
  expect(read(root, guide)).toBe(read(base, guide));
  expect(read(root, skill)).toContain('Follow `server/data/user-input.md`.');
  expect(read(root, skill)).not.toContain('owner-input.md');
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
    v.scripts.check = `${v.scripts.check} && node scripts/extra.ts`;
    v.scripts.build = `${v.scripts.build} && node scripts/extra.ts`;
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

// tests/setup.ts already cleared inherited GIT_* variables and set the quiet Git config.
const cleanEnv = process.env;
const git = (root: string, ...args: string[]) =>
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
    cwd: root,
    env: cleanEnv,
  });
const cli = (root: string, ...args: string[]) =>
  spawnSync(
    process.execPath,
    [join(import.meta.dirname, '..', 'scripts', 'sync.ts'), root, ...args],
    {
      encoding: 'utf8',
    },
  );

test('sidecut-sync --check lists the change, refuses uncommitted work, then syncs', () => {
  const root = copy();
  git(root, 'init', '-q');
  write(root, 'CLAUDE.md', 'Read AGENTS.md.\n');
  const check = cli(root, '--check');
  expect(check.status).toBe(1);
  expect(check.stdout).toContain('Would change CLAUDE.md');
  const dirty = cli(root);
  expect(dirty.status).toBe(1);
  expect(dirty.stderr).toContain('uncommitted changes');
  expect(read(root, 'CLAUDE.md')).toBe('Read AGENTS.md.\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'base');
  expect(cli(root).status).toBe(0);
  expect(read(root, 'CLAUDE.md')).toBe('@AGENTS.md\n');
});

test('sidecut-sync refuses a folder that is not a git repo', () => {
  const root = copy();
  write(root, 'CLAUDE.md', 'Read AGENTS.md.\n');
  expect(cli(root).stderr).toContain('not a git repo');
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
    cli(root);
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

const P = `plugins/${ID}`;
const ANTIGRAVITY = [
  `${P}/.antigravity-plugin/plugin.json`,
  `${P}/mcp_config.json`,
  `${P}/hooks.json`,
];
const HOOK = `${P}/hooks/post-tool-use-skill-log.mjs`;

test('a plugin made before Antigravity support gets its files and the new usage log hook', () => {
  const root = copy();
  for (const file of ANTIGRAVITY) rmSync(join(root, file));
  write(root, HOOK, read(root, HOOK).replace('antigravity', 'old'));
  expect(files(root).sort()).toEqual([...ANTIGRAVITY, HOOK].sort());
  expect(applySync(root, planSync(root, vars))).toEqual([]);
  expect(planSync(root, vars)).toEqual([]);
  expect(JSON.parse(read(root, `${P}/mcp_config.json`))).toEqual({
    mcpServers: { demo: { command: 'node', args: ['${PLUGIN_ROOT}/server/index.mjs'] } },
  });
  const manifest = JSON.parse(read(root, `${P}/.antigravity-plugin/plugin.json`));
  const claude = JSON.parse(read(root, `${P}/.claude-plugin/plugin.json`));
  expect(manifest.version).toBe(claude.version);
  expect(manifest.name).toBe(ID);
  // Written the way Biome would format it, so a synced repo passes `npm run check` as it is.
  const biome = join(
    import.meta.dirname,
    '..',
    'node_modules',
    '@biomejs',
    'biome',
    'bin',
    'biome',
  );
  const format = spawnSync(process.execPath, [biome, 'format', ...ANTIGRAVITY], {
    cwd: root,
    encoding: 'utf8',
  });
  expect(format.status, format.stdout + format.stderr).toBe(0);
});

test("Antigravity's MCP config follows .mcp.json, and goes when it goes", () => {
  const root = copy();
  for (const file of [`${P}/.mcp.json`, `${P}/mcp.json`])
    write(
      root,
      file,
      JSON.stringify({ mcpServers: { demo: { type: 'http', url: 'https://example.com/mcp' } } }),
    );
  applySync(root, planSync(root, vars));
  expect(JSON.parse(read(root, `${P}/mcp_config.json`))).toEqual({
    mcpServers: { demo: { url: 'https://example.com/mcp' } },
  });
  rmSync(join(root, `${P}/.mcp.json`));
  expect(files(root)).toContain(`${P}/mcp_config.json`);
  applySync(root, planSync(root, vars));
  expect(existsSync(join(root, `${P}/mcp_config.json`))).toBe(false);
});

test('the usage log hook records skill reads from Claude Code, Codex and Antigravity', () => {
  const root = copy();
  const home = mkdtempSync(join(tmpdir(), 'sidecut-hook-home-'));
  scratch.push(home);
  const skill = `${root}/${P}/skills/demo-check-status/SKILL.md`;
  const run = (input: object) =>
    spawnSync(process.execPath, [join(root, HOOK)], {
      input: JSON.stringify(input),
      env: { PATH: process.env.PATH, HOME: home, USERPROFILE: home },
      encoding: 'utf8',
    });
  for (const input of [
    { tool_name: 'Skill', tool_input: { skill: `${ID}:demo-check-status` } },
    { tool_name: 'Bash', tool_input: { command: `cat ${skill}` }, turn_id: 't1' },
    { toolCall: { name: 'view_file', args: { AbsolutePath: skill } }, conversationId: 'c1' },
    { toolCall: { name: 'run_command', args: { CommandLine: `head -5 ${skill}` } } },
    // A failed read, a later chunk, another copy of the plugin and another tool don't count.
    { toolCall: { name: 'view_file', args: { AbsolutePath: skill } }, error: 'not found' },
    { toolCall: { name: 'view_file', args: { AbsolutePath: skill, StartLine: 40 } } },
    {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: `/elsewhere/${P}/skills/demo-check-status/SKILL.md` },
      },
    },
    { toolCall: { name: 'grep_search', args: { SearchPath: skill } } },
  ])
    expect(run(input).status).toBe(0);
  const lines = readFileSync(join(home, '.sidecut', 'skill-log.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(lines.map((l) => `${l.plugin} ${l.skill} ${l.host}`)).toEqual([
    `${ID} demo-check-status claude-code`,
    `${ID} demo-check-status codex`,
    `${ID} demo-check-status antigravity`,
    `${ID} demo-check-status antigravity`,
  ]);
});

test('a hook kept under its rule is left alone, and each difference is reported once', () => {
  const root = copy();
  write(root, HOOK, `${read(root, HOOK)}// ours\n`);
  rmSync(join(root, `${P}/hooks.json`));
  const codesOf = () => {
    const report = new Report();
    checkRepo(root, report);
    // This copy isn't built or installed, so only the rules this test is about are looked at.
    const about = ['ANTIGRAVITY_MISSING', 'HOOK_SKILL_LOG', 'REPO_SYNC'];
    return report.problems
      .map((p) => p.code)
      .filter((c) => about.includes(c))
      .sort();
  };
  expect(codesOf()).toEqual(['ANTIGRAVITY_MISSING', 'HOOK_SKILL_LOG']);
  pkg(root, (v) => {
    v.sidecut = { keep: { HOOK_SKILL_LOG: 'Our own log format.' } };
  });
  const kept = (_file: string, code?: string) => code === 'HOOK_SKILL_LOG';
  expect(planSync(root, vars, kept).map((c) => c.file)).toEqual([`${P}/hooks.json`]);
  expect(codesOf()).toEqual(['ANTIGRAVITY_MISSING']);
});

test("an unreadable .mcp.json leaves Antigravity's MCP config alone", () => {
  const root = copy();
  write(root, `${P}/.mcp.json`, '{ not json');
  expect(files(root)).not.toContain(`${P}/mcp_config.json`);
  const report = new Report();
  checkRepo(root, report);
  expect(report.problems.map((p) => p.code)).not.toContain('ANTIGRAVITY_UNEXPECTED');
});
