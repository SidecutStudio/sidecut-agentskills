import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  expect(hook(dir, '--init').stdout.trim()).toBe('written');
  expect(codex(dir)).toBe(`${GENERATED}\n\n# A\n\nFirst.\n\n# B\n\nSecond.\n`);
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
