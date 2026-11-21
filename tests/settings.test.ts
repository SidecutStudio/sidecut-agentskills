import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { checkRepo } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import { Report } from '../plugins/sidecut-agentskills/server/src/check/report.ts';
import {
  type PluginInput,
  SettingsNeeded,
  scaffoldPlugin,
} from '../plugins/sidecut-agentskills/server/src/scaffold.ts';
import {
  DEFAULTS,
  REPO_FILE,
  readUserSettings,
  resolveSettings,
  userSettingsPath,
} from '../plugins/sidecut-agentskills/server/src/settings.ts';

const repoRoot = join(import.meta.dirname, '..');
const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function temp(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `agentskills-${name}-`));
  scratch.push(dir);
  return dir;
}

/** An environment whose settings folder is empty, or holds `user` as the saved settings. */
function envWith(user?: object): NodeJS.ProcessEnv {
  const config = temp('config');
  if (user) {
    mkdirSync(join(config, 'agentskills'), { recursive: true });
    writeFileSync(join(config, 'agentskills', 'settings.json'), JSON.stringify(user));
  }
  return { ...process.env, XDG_CONFIG_HOME: config };
}

const NOTES: PluginInput = {
  id: 'notes-helper',
  description: 'Keeps short notes for you.',
  longDescription: 'A small plugin that keeps notes. It exists to test settings.',
  keywords: ['notes', 'memo', 'text'],
  date: '2026-11-21',
  checkerSource: 'file:../sidecut-agentskills',
};

const ACME = {
  org: 'acme-tools',
  authorName: 'Acme Tools',
  authorUrl: 'https://acme.example',
  homepage: 'https://acme.example',
};

function readTree(root: string, files: string[]): Map<string, string> {
  return new Map(files.map((f) => [f, readFileSync(join(root, f), 'utf8')]));
}

test('a scaffold under another owner, with no prefix and hosted CI, passes and never says Sidecut', () => {
  const out = temp('acme');
  const files = scaffoldPlugin({ ...NOTES, settings: ACME }, out, envWith());
  expect(files).toContain('.claude-plugin/marketplace.json');
  expect(files).toContain('.agents/plugins/marketplace.json');
  expect(JSON.parse(readFileSync(join(out, REPO_FILE), 'utf8'))).toEqual(ACME);
  for (const workflow of ['check.yml', 'release.yml']) {
    const runsOn = readFileSync(join(out, '.github/workflows', workflow), 'utf8')
      .split('\n')
      .filter((line) => /^\s+runs-on:/.test(line));
    expect(runsOn.length).toBeGreaterThan(0);
    for (const line of runsOn) expect(line.trim()).toBe('runs-on: ubuntu-24.04');
  }
  for (const [file, text] of readTree(
    out,
    files.filter((f) => !f.endsWith('.png')),
  )) {
    for (const [i, line] of text.split('\n').entries()) {
      // The checker itself is published from SidecutStudio/sidecut-agentskills; that pin is the tool, not the owner.
      if (line.includes('"sidecut-agentskills":')) continue;
      expect(line, `${file}:${i + 1}`).not.toMatch(/Sidecut|sidecut-linux|sidecut\.dev/);
    }
  }
  writeFileSync(join(out, 'package-lock.json'), '');
  symlinkSync(join(repoRoot, 'node_modules'), join(out, 'node_modules'));
  spawnSync('npm', ['exec', '--no', '--', 'biome', 'check', '--write', '.'], { cwd: out });
  const built = spawnSync(process.execPath, ['scripts/build-server.ts'], {
    cwd: out,
    encoding: 'utf8',
  });
  expect(built.status, built.stderr).toBe(0);
  const report = new Report();
  checkRepo(out, report);
  expect(report.problems).toEqual([]);
});

test("the sidecut profile writes today's Sidecut repo byte for byte, plus its answers file", () => {
  const out = temp('sidecut');
  const files = scaffoldPlugin(
    {
      id: 'sidecut-demo',
      description: 'Shows how a Sidecut plugin is put together.',
      longDescription:
        'A small example plugin with one skill and one MCP tool. It exists to test the checker.',
      keywords: ['example', 'template', 'mcp'],
      date: '2026-11-12',
      checkerSource: 'file:../sidecut-agentskills',
      settings: { profile: 'sidecut' },
    },
    out,
    envWith(),
  );
  // Hashes of Agentskills 1.4.1's output for the same input, before settings existed.
  const want = JSON.parse(
    readFileSync(join(import.meta.dirname, 'sidecut-scaffold.hashes.json'), 'utf8'),
  ) as Record<string, string>;
  const got = Object.fromEntries(
    files
      .filter((f) => f !== REPO_FILE)
      .map((f) => [
        f,
        createHash('sha256')
          .update(readFileSync(join(out, f)))
          .digest('hex'),
      ]),
  );
  expect(got).toEqual(want);
  expect(JSON.parse(readFileSync(join(out, REPO_FILE), 'utf8'))).toEqual({ profile: 'sidecut' });
});

test('arguments win over the repo file, which wins over the user file, which wins over the defaults', () => {
  const env = envWith({ org: 'user-org', authorName: 'User', prefix: 'user-', ci: 'sidecut' });
  const root = temp('repo');
  writeFileSync(join(root, REPO_FILE), JSON.stringify({ org: 'repo-org', prefix: 'repo-' }));
  const s = resolveSettings({ args: { org: 'arg-org' }, root, env });
  expect(s.org).toBe('arg-org');
  expect(s.prefix).toBe('repo-');
  expect(s.authorName).toBe('User');
  expect(s.ci).toBe('sidecut');
  expect(s.license).toBe(DEFAULTS.license);
  // A profile applies first within its layer, then that layer's own fields.
  expect(resolveSettings({ args: { profile: 'sidecut', ci: 'hosted' }, env }).ci).toBe('hosted');
  expect(resolveSettings({ args: { profile: 'sidecut', ci: 'hosted' }, env }).org).toBe(
    'SidecutStudio',
  );
});

test('with no settings anywhere, scaffolding writes nothing and returns the questions to ask', () => {
  const out = join(temp('none'), 'repo');
  const env = envWith();
  let caught: unknown;
  try {
    scaffoldPlugin(NOTES, out, env);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(SettingsNeeded);
  const keys = (caught as SettingsNeeded).questions.map((q) => q.key);
  expect(keys).toEqual(
    expect.arrayContaining(['profile', 'org', 'authorName', 'prefix', 'marketplace', 'ci']),
  );
  expect(existsSync(out)).toBe(false);

  // Answering with save: true keeps the answers, so the next scaffold doesn't ask.
  scaffoldPlugin({ ...NOTES, settings: ACME, save: true }, out, env);
  expect(readUserSettings(env)).toEqual(ACME);
  expect(userSettingsPath(env).startsWith(String(env.XDG_CONFIG_HOME))).toBe(true);
  const again = join(temp('again'), 'repo');
  expect(scaffoldPlugin(NOTES, again, env).length).toBeGreaterThan(0);
});
