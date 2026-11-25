// Agentskills is public, so what it ships has to work for someone with none of Sidecut Studio's
// private setup. This fails when a shipped file names a private repo, Sidecut Studio's own workflow
// or products, or a personal path. Sidecut's own values live only in the `sidecut` profile files
// below; everything else stays general.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { scaffoldPlugin } from '../plugins/sidecut-agentskills/server/src/scaffold.ts';

const root = join(import.meta.dirname, '..');
const plugin = 'plugins/sidecut-agentskills';

/** What people install or run: the plugin, the CLI sources other repos run, the README and evals. */
const SHIPPED = [
  'plugins/',
  'scripts/',
  'evals/',
  'README.md',
  'SECURITY.md',
  'RELEASING.md',
  '.claude-plugin/',
  '.agents/',
];

/** Files generated from the sources this test reads, and binary files. */
const GENERATED = [
  `${plugin}/server/index.mjs`,
  `${plugin}/server/THIRD_PARTY_LICENSES.txt`,
  `${plugin}/codex/agents/`,
];
const BINARY = /\.(png|woff2)$/;

/** The `sidecut` profile: the one place Sidecut Studio's own setup may be named. */
const PROFILE = [
  `${plugin}/server/src/sidecut-profile.ts`,
  `${plugin}/server/data/profiles/sidecut.md`,
  `${plugin}/server/data/templates/ci/sidecut/`,
  `${plugin}/server/data/templates/solo/`,
];

type Rule = { what: string; re: RegExp; allow?: { files: string[]; why: string } };

const RULES: Rule[] = [
  { what: 'a private Sidecut repo', re: /\bsidecut-(ops|plugins|solo|rules|cookbook)\b/i },
  {
    what: "Sidecut Studio's workflow",
    re: /\bSidecut Solo\b|\bSolo Workflow\b|\bsolo-(?!workflow\b)[a-z]+(-[a-z]+)*\b/,
  },
  {
    what: "the workflow's settings file",
    re: /\bsolo-workflow\.toml\b/,
    allow: {
      files: [`${plugin}/server/data/templates/repo/scripts/release.ts.tmpl`, 'scripts/release.ts'],
      why: 'the release scripts read their required checks from it only when a repo keeps one',
    },
  },
  {
    what: 'a Sidecut Studio product',
    re: /\b(Sidecut Builder|Next Role|next-role|Pair Board|pair-board|Lovable Workbench|Eval Bench|sidecut-ci:)/i,
  },
  {
    what: 'a SidecutStudio repo other than this one',
    re: /\bSidecut(Studio|Dev)\/(?!sidecut-agentskills\b)[\w.-]+/,
  },
  {
    what: "the studio's website",
    re: /\bsidecut\.dev\b/,
    allow: {
      files: [
        `${plugin}/.claude-plugin/plugin.json`,
        `${plugin}/.codex-plugin/plugin.json`,
        `${plugin}/.antigravity-plugin/plugin.json`,
        '.claude-plugin/marketplace.json',
        'SECURITY.md',
      ],
      why: 'the author fields and the security contact name who publishes Agentskills',
    },
  },
  {
    what: "Sidecut Studio's own CI runners",
    re: /\bsidecut-(linux-x64|light|ci)\b|SIDECUT_(CI_APP_KEY|RUNNER_MODE)/,
  },
  { what: 'a personal path', re: /\/Users\/[\w.-]+|~\/Developer\b|\/home\/[a-z][\w.-]*\// },
];

function under(file: string, prefixes: string[]): boolean {
  return prefixes.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p));
}

function shippedFiles(): string[] {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((f) => under(f, SHIPPED) && !under(f, GENERATED) && !BINARY.test(f))
    .filter((f) => {
      try {
        return statSync(join(root, f)).isFile();
      } catch {
        return false;
      }
    });
}

/** Every line of `files` under `base` that breaks a rule, as `file:line: what`. */
function findings(base: string, files: string[], profile: string[]): string[] {
  const out: string[] = [];
  for (const file of files) {
    if (under(file, profile)) continue;
    const lines = readFileSync(join(base, file), 'utf8').split('\n');
    for (const rule of RULES) {
      if (rule.allow && under(file, rule.allow.files)) continue;
      lines.forEach((line, i) => {
        if (rule.re.test(line)) out.push(`${file}:${i + 1}: names ${rule.what}`);
      });
    }
  }
  return out;
}

test('shipped files name nothing private outside the sidecut profile', () => {
  const files = shippedFiles();
  expect(files.length).toBeGreaterThan(50);
  expect(findings(root, files, PROFILE)).toEqual([]);
});

test('the Sidecut profile routes through Solo without naming specialist skills', () => {
  const profile = readFileSync(join(root, `${plugin}/server/data/profiles/sidecut.md`), 'utf8');
  expect(profile.match(/\bsolo-(?!workflow\b)[a-z0-9-]+\b/g) ?? []).toEqual([]);
});

test('every rule catches what it is for', () => {
  const samples = [
    'Bundle it into sidecut-plugins.',
    'Merge through Sidecut Solo.',
    'Run solo-finish-change.',
    'Then run solo-finish.',
    'runs-on: [self-hosted, sidecut-light]',
    'Copy it from SidecutStudio/sidecut-ops.',
    'Use the Sidecut Builder tokens.',
    'See https://sidecut.dev.',
    'Clone it into ~/Developer/notes.',
  ];
  for (const sample of samples)
    expect(
      RULES.some((r) => r.re.test(sample)),
      sample,
    ).toBe(true);
  expect(RULES.some((r) => r.re.test('github:SidecutStudio/sidecut-agentskills#v2.2.0'))).toBe(
    false,
  );
});

test('each allowance and profile file still exists', () => {
  const files = new Set(shippedFiles());
  for (const path of [...PROFILE, ...RULES.flatMap((r) => r.allow?.files ?? [])]) {
    const found = path.endsWith('/') ? [...files].some((f) => f.startsWith(path)) : files.has(path);
    expect(found, path).toBe(true);
  }
});

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function listAll(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => statSync(join(dir, f)).isFile() && !BINARY.test(f))
    .map((f) => relative(dir, join(dir, f)).split('\\').join('/'));
}

test("a repo scaffolded with someone else's settings is free of Sidecut's setup", () => {
  const home = mkdtempSync(join(tmpdir(), 'agentskills-stranger-home-'));
  const out = join(mkdtempSync(join(tmpdir(), 'agentskills-stranger-')), 'notes');
  scratch.push(home, join(out, '..'));
  scaffoldPlugin(
    {
      id: 'notes',
      description: 'Keeps short notes beside your code.',
      longDescription: 'Keeps short notes beside your code. Finds them again when you ask.',
      keywords: ['memo', 'jot', 'text'],
      date: '2026-01-01',
      settings: { org: 'acme', authorName: 'Acme' },
    },
    out,
    { HOME: home },
  );
  const files = listAll(out);
  expect(files).not.toContain('solo-workflow.toml');
  expect(findings(out, files, [])).toEqual([]);
  expect(readFileSync(join(out, 'AGENTS.md'), 'utf8')).not.toMatch(/solo/i);
});
