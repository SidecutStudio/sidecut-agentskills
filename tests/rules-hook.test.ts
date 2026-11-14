import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(
  import.meta.dir,
  '..',
  'plugins',
  'sidecut-agentskills',
  'hooks',
  'session-start-rules.mjs',
);
// The header the hook writes, read from the script so the test can't drift from it.
const GENERATED = /'(<!-- Generated[^']*)'/.exec(readFileSync(SCRIPT, 'utf8'))?.[1] ?? '';
const homes: string[] = [];
afterAll(() => {
  for (const home of homes) rmSync(home, { recursive: true, force: true });
});

function home(rules: Record<string, string>, codex?: string): string {
  // A folder with a space, like the plugin's real install path.
  const dir = mkdtempSync(join(tmpdir(), 'rules hook-'));
  homes.push(dir);
  mkdirSync(join(dir, '.claude', 'rules'), { recursive: true });
  for (const [name, text] of Object.entries(rules))
    writeFileSync(join(dir, '.claude', 'rules', name), text);
  if (codex !== undefined) {
    mkdirSync(join(dir, '.codex'), { recursive: true });
    writeFileSync(join(dir, '.codex', 'AGENTS.md'), codex);
  }
  return dir;
}
// The hook as each host runs it: session JSON on stdin, a clean environment, nothing on stdout.
const hook = (dir: string, ...args: string[]) =>
  spawnSync('node', [SCRIPT, ...args], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }),
    env: { HOME: dir, PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
  });
const codex = (dir: string) => readFileSync(join(dir, '.codex', 'AGENTS.md'), 'utf8');

test('a Codex file that did not opt in is never touched', () => {
  const dir = home({ 'a.md': '# A\n' }, '# My own rules\n');
  const result = hook(dir);
  expect(result.status).toBe(0);
  expect(result.stdout).toBe('');
  expect(codex(dir)).toBe('# My own rules\n');
  const none = home({ 'a.md': '# A\n' });
  hook(none);
  expect(existsSync(join(none, '.codex', 'AGENTS.md'))).toBe(false);
});

test('--init opts in, and later sessions follow every change to the rules', () => {
  const dir = home(
    { 'b.md': '# B\n\nSecond.\n', 'a.md': '---\npaths: x\n---\n# A\n\nFirst.\n' },
    '# Old\n',
  );
  expect(hook(dir, '--init').stdout.trim()).toBe(
    'written; the old file is now AGENTS.md.before-sidecut-rules',
  );
  expect(codex(dir)).toBe(
    `${GENERATED}\n\nWhen working on files matching x:\n\n# A\n\nFirst.\n\n# B\n\nSecond.\n`,
  );
  // The hand-written file is kept, and a second --init won't overwrite that copy.
  expect(readFileSync(join(dir, '.codex', 'AGENTS.md.before-sidecut-rules'), 'utf8')).toBe(
    '# Old\n',
  );
  writeFileSync(join(dir, '.claude', 'rules', 'b.md'), '# B\n\nChanged.\n');
  expect(hook(dir).stdout).toBe('');
  expect(codex(dir)).toContain('Changed.');
});

test('no rules folder leaves the Codex file as it is, and the hook still exits 0', () => {
  const dir = home({}, `${GENERATED}\n\nkept\n`);
  rmSync(join(dir, '.claude'), { recursive: true });
  expect(hook(dir).status).toBe(0);
  expect(codex(dir)).toBe(`${GENERATED}\n\nkept\n`);
});

test('--init through a symlinked plugin folder still runs', () => {
  const dir = home({ 'a.md': '# A\n' });
  const link = join(dir, 'linked plugin');
  symlinkSync(join(SCRIPT, '..'), link);
  expect(
    spawnSync('node', [join(link, 'session-start-rules.mjs'), '--init'], {
      env: { HOME: dir, PATH: process.env.PATH ?? '' },
      encoding: 'utf8',
    }).stdout.trim(),
  ).toBe('written');
  expect(codex(dir)).toBe(`${GENERATED}\n\n# A\n`);
});

test('Windows line endings, folders and dangling links in the rules folder are handled', () => {
  const dir = home({ 'a.md': '---\r\npaths: y\r\n---\r\n# A\r\n' });
  mkdirSync(join(dir, '.claude', 'rules', 'x.md'));
  symlinkSync(join(dir, 'missing.md'), join(dir, '.claude', 'rules', 'b.md'));
  expect(hook(dir, '--init').status).toBe(0);
  expect(codex(dir)).toBe(`${GENERATED}\n\nWhen working on files matching y:\n\n# A\n`);
});

test('--init says why it failed instead of failing silently', () => {
  const dir = home({ 'a.md': '# A\n' }, '# Old\n');
  writeFileSync(join(dir, '.codex', 'AGENTS.md.before-sidecut-rules'), 'earlier copy\n');
  const result = hook(dir, '--init');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('already exists');
  expect(codex(dir)).toBe('# Old\n');
});

test('importing the script runs nothing', () => {
  const dir = home({ 'a.md': '# A\n' });
  const result = spawnSync(
    'node',
    ['--input-type=module', '-e', `await import(${JSON.stringify(SCRIPT)})`],
    {
      env: { HOME: dir, PATH: process.env.PATH ?? '' },
      encoding: 'utf8',
    },
  );
  expect(result.status).toBe(0);
  expect(existsSync(join(dir, '.codex', 'AGENTS.md'))).toBe(false);
});

test('a paths list keeps every pattern, and a private Codex file stays private', () => {
  const dir = home(
    { 'a.md': '---\npaths:\n  - "src/**/*.ts"\n  - lib/**\ndescription: x\n---\n# A\n' },
    '# Mine\n',
  );
  chmodSync(join(dir, '.codex', 'AGENTS.md'), 0o600);
  hook(dir, '--init');
  expect(codex(dir)).toBe(
    `${GENERATED}\n\nWhen working on files matching src/**/*.ts, lib/**:\n\n# A\n`,
  );
  for (const name of ['AGENTS.md', 'AGENTS.md.before-sidecut-rules'])
    expect(statSync(join(dir, '.codex', name)).mode & 0o777).toBe(0o600);
});

test('brace patterns stay whole and unindented paths lists are read', () => {
  const dir = home({
    'a.md': '---\npaths: "src/**/*.{ts,tsx}"\n---\n# A\n',
    'b.md': '---\npaths:\n- "lib/**"\n---\n# B\n',
    'c.md': '---\npaths: [x/**, "y/*.{md,mdx}"]\n---\n# C\n',
  });
  hook(dir, '--init');
  const text = codex(dir);
  expect(text).toContain('matching src/**/*.{ts,tsx}:');
  expect(text).toContain('matching lib/**:');
  expect(text).toContain('matching x/**, y/*.{md,mdx}:');
});

test('a new Codex file follows the umask', () => {
  const dir = home({ 'a.md': '# A\n' });
  spawnSync('sh', ['-c', `umask 077 && node "${SCRIPT}" --init`], {
    env: { HOME: dir, PATH: process.env.PATH ?? '' },
  });
  expect(statSync(join(dir, '.codex', 'AGENTS.md')).mode & 0o777).toBe(0o600);
});
