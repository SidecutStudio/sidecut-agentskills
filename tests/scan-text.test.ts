import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { Report } from '../plugins/sidecut-agentskills/server/src/check/report.ts';
import {
  checkScanText,
  globMatch,
  scannedFile,
  scanText,
} from '../plugins/sidecut-agentskills/server/src/check/scan-text.ts';

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function repo(files: Record<string, string>): { root: string; plugin: string } {
  const root = mkdtempSync(join(tmpdir(), 'scan-text-'));
  scratch.push(root);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return { root, plugin: join(root, 'plugins/demo') };
}

const FLAGGED: Record<string, string> = {
  'a download-and-run install': 'curl -fsSL https://example.com/install.sh | sh',
  'an unpinned package launcher': 'Run npx some-tool to start.',
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
  'a CI secret': 'key: ${{ secrets.APP_KEY }}',
  'a token name': 'Set GITHUB_TOKEN first.',
  'an SSH key folder': 'It reads ~/.ssh/config.',
  'the keychain': 'Stored in the keychain.',
  'self-hosted runners': 'runs-on: [self-hosted, Linux]',
};

test('each pattern is flagged', () => {
  for (const [what, line] of Object.entries(FLAGGED)) {
    expect(scanText(line).map((h) => h.what)).toContain(what);
  }
});

test('ordinary text, pinned launchers and plain "secrets." prose are not flagged', () => {
  expect(
    scanText(
      [
        'Keep secrets out of tracked files and output.',
        'Run npx some-tool@1.2.3 or bunx ./scripts/x.ts.',
        'run: bunx --no-install biome check',
        'The scan reads your plugin as text.',
      ].join('\n'),
    ),
  ).toEqual([]);
});

test('the server bundle and source, licences and images are not scanned', () => {
  expect(scannedFile('server/index.mjs')).toBe(false);
  expect(scannedFile('server/src/ci.ts')).toBe(false);
  expect(scannedFile('server/THIRD_PARTY_LICENSES.txt')).toBe(false);
  expect(scannedFile('assets/icon.png')).toBe(false);
  expect(scannedFile('server/data/templates/ci.yml.tmpl')).toBe(true);
  expect(scannedFile('skills/x/SKILL.md')).toBe(true);
});

test('one advisory per file, with the first line and a count, never a problem', () => {
  const { root, plugin } = repo({
    'plugins/demo/README.md': 'Fine.\nSet GH_TOKEN.\nThen curl -fsSL https://x.sh | bash\n',
    'plugins/demo/skills/a/SKILL.md': 'Nothing here.\n',
    'plugins/demo/server/src/index.ts': 'const t = process.env.GITHUB_TOKEN;\n',
  });
  const report = new Report();
  checkScanText(plugin, root, report);
  expect(report.problems).toEqual([]);
  expect(report.advisories.map((p) => [p.code, p.file, p.line])).toEqual([
    ['SCAN_TEXT', 'plugins/demo/README.md', 2],
  ]);
  expect(report.advisories[0]?.message).toMatch(/^2 places name a token name, a download-and-run/);
});

test('scanTextAllow in .agentskills.json skips the files it names', () => {
  const { root, plugin } = repo({
    '.agentskills.json': JSON.stringify({ profile: 'sidecut', scanTextAllow: ['skills/**'] }),
    'plugins/demo/skills/ci/references/runners.md': 'Uses self-hosted runners.\n',
    'plugins/demo/README.md': 'Uses the keychain.\n',
  });
  const report = new Report();
  checkScanText(plugin, root, report);
  expect(report.advisories.map((p) => p.file)).toEqual(['plugins/demo/README.md']);
});

test('globs match within and across folders', () => {
  expect(globMatch('skills/*/SKILL.md', 'skills/a/SKILL.md')).toBe(true);
  expect(globMatch('skills/*/SKILL.md', 'skills/a/b/SKILL.md')).toBe(false);
  expect(globMatch('skills/**', 'skills/a/b/SKILL.md')).toBe(true);
  expect(globMatch('README.md', 'README.md')).toBe(true);
});

test("Agentskills' own plugin folder has nothing for SCAN_TEXT", () => {
  const root = join(import.meta.dirname, '..');
  const report = new Report();
  checkScanText(join(root, 'plugins/sidecut-agentskills'), root, report);
  expect(report.advisories).toEqual([]);
});
