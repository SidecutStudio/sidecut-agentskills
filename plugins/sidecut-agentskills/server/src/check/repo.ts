import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ownVersion } from '../scaffold.ts';
import { checkMarkdown, parseMarkdown, sections, tableAfter } from './markdown.ts';
import { checkPlugin } from './plugin.ts';
import type { Report } from './report.ts';
import { planSync } from './sync.ts';

const REQUIRED_ENTRIES = [
  '.github',
  '.gitignore',
  'AGENTS.md',
  'CHANGELOG.md',
  'CLAUDE.md',
  'LICENSE',
  'README.md',
  'SECURITY.md',
  'biome.json',
  'bun.lock',
  'lefthook.yml',
  'package.json',
  'plugins',
  'scripts',
  'solo-workflow.toml',
  'tests',
  'tsconfig.json',
];
const OPTIONAL_ENTRIES = ['.git', 'node_modules', 'bunfig.toml', 'docs'];
const CHECK_STEPS = [
  'biome check .',
  'tsc --noEmit',
  'bun run style',
  'bun test',
  'bun scripts/build-server.ts --check',
];

/** Whether the `&&` steps of `script` include every one of `steps`, in that order. */
function inOrder(script: string, steps: string[]): boolean {
  let at = 0;
  for (const step of script.split('&&').map((s) => s.trim())) if (step === steps[at]) at++;
  return at === steps.length;
}
const AGENTS_SECTIONS = ['Commands', 'Layout', 'Rules'];

function ignoredBy(patterns: string[], name: string): boolean {
  return patterns.some((p) => {
    const clean = p.replace(/\/$/, '');
    if (clean.includes('*'))
      return new RegExp(`^${clean.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`).test(name);
    return clean === name;
  });
}

function checkTopLevel(root: string, report: Report): void {
  const gitignore = existsSync(join(root, '.gitignore'))
    ? readFileSync(join(root, '.gitignore'), 'utf8').split('\n').filter(Boolean)
    : [];
  const entries = readdirSync(root).filter((n) => !ignoredBy(gitignore, n));
  for (const name of entries) {
    if (!REQUIRED_ENTRIES.includes(name) && !OPTIONAL_ENTRIES.includes(name)) {
      report.add(
        'REPO_ENTRY_UNEXPECTED',
        name,
        undefined,
        `"${name}" isn't part of the repo layout.`,
        'Move it into the plugin, tests/ or scripts/, or remove it.',
      );
    }
  }
  for (const name of REQUIRED_ENTRIES) {
    if (!entries.includes(name))
      report.add(
        'REPO_ENTRY_MISSING',
        name,
        undefined,
        `"${name}" is missing.`,
        'Add it from the template.',
      );
  }
  for (const marketplace of ['.claude-plugin', '.agents']) {
    if (existsSync(join(root, marketplace))) {
      report.add(
        'REPO_MARKETPLACE',
        marketplace,
        undefined,
        'The repo has its own marketplace.',
        'List the plugin from the sidecut-plugins marketplace instead.',
      );
    }
  }
}

function checkLicense(root: string, report: Report): void {
  const license = existsSync(join(root, 'LICENSE'))
    ? readFileSync(join(root, 'LICENSE'), 'utf8')
    : '';
  if (!/^MIT License\n\nCopyright \(c\) \d{4} Sidecut Studio\n/.test(license)) {
    report.add(
      'REPO_LICENSE',
      'LICENSE',
      1,
      'LICENSE is not MIT with "Copyright (c) <year> Sidecut Studio".',
      'Copy the template LICENSE.',
    );
  }
}

function checkPackage(
  root: string,
  id: string,
  version: string | null,
  report: Report,
): Record<string, string> {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return {};
  const pkg = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  if (pkg.name !== id)
    report.add(
      'REPO_PACKAGE_NAME',
      'package.json',
      undefined,
      `Name is not "${id}".`,
      'Use the plugin id.',
    );
  if (version && pkg.version !== version) {
    report.add(
      'VERSION_SYNC',
      'package.json',
      undefined,
      `Version is ${pkg.version}, the manifests say ${version}.`,
      'Make them the same.',
    );
  }
  if (!/^bun@\d+\.\d+\.\d+$/.test(String(pkg.packageManager ?? ''))) {
    report.add(
      'REPO_PACKAGE_MANAGER',
      'package.json',
      undefined,
      '`packageManager` is not a pinned bun@x.y.z.',
      'Set it, for example `bun@1.4.4`.',
    );
  }
  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  if (!inOrder(scripts.check ?? '', CHECK_STEPS)) {
    report.add(
      'REPO_CHECK_SCRIPT',
      'package.json',
      undefined,
      '`check` leaves out a standard step or changes their order.',
      `Run these in this order, adding the repo's own steps anywhere: \`${CHECK_STEPS.join(' && ')}\`.`,
    );
  }
  if (!scripts.style)
    report.add(
      'REPO_STYLE_SCRIPT',
      'package.json',
      undefined,
      'There is no `style` script.',
      'Add `"style": "sidecut-check"`.',
    );
  if (!inOrder(scripts.build ?? '', ['bun scripts/build-server.ts']))
    report.add(
      'REPO_BUILD_SCRIPT',
      'package.json',
      undefined,
      '`build` does not run `bun scripts/build-server.ts`.',
      'Add it, so the bundle and its licences are built the same way everywhere.',
    );
  for (const [name, spec] of Object.entries({
    ...(pkg.dependencies as object),
    ...(pkg.devDependencies as object),
  }) as [string, string][]) {
    if (!/^(\d+\.\d+\.\d+|github:[^#]+#.+|file:.+)$/.test(spec)) {
      report.add(
        'REPO_PINNED',
        'package.json',
        undefined,
        `${name} is "${spec}", not a pinned version.`,
        'Pin an exact version, or a tag for a GitHub dependency.',
      );
    }
  }
  return scripts;
}

function checkAgents(
  root: string,
  id: string,
  scripts: Record<string, string>,
  report: Report,
): void {
  const path = join(root, 'AGENTS.md');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report, { skipH1Case: true });
  const h1 = doc.headings.find((h) => h.level === 1);
  if (h1?.text !== id)
    report.add('AGENTS_TITLE', 'AGENTS.md', h1?.line, `H1 is not "${id}".`, `Use \`# ${id}\`.`);
  const found = sections(doc).map((h) => h.text);
  const before = found.filter((s) => s !== 'Solo Workflow');
  if (before.join('|') !== AGENTS_SECTIONS.join('|')) {
    report.add(
      'AGENTS_SECTIONS',
      'AGENTS.md',
      undefined,
      'Sections are not Commands, Layout, Rules.',
      'Use exactly those, then the Solo Workflow section.',
    );
  }
  if (!/<!-- solo-workflow:start -->[\s\S]*<!-- solo-workflow:end -->\n$/.test(text)) {
    report.add(
      'AGENTS_SOLO',
      'AGENTS.md',
      undefined,
      'AGENTS.md does not end with the Solo Workflow markers.',
      'Run solo-workflow-configure-project.',
    );
  }
  const commands = sections(doc).find((h) => h.text === 'Commands');
  if (commands) {
    const rows = tableAfter(doc, commands)
      .slice(1)
      .map((r) => r[0] ?? '');
    const want = Object.keys(scripts).map((s) => `\`bun run ${s}\``);
    if (rows.join() !== want.join()) {
      report.add(
        'AGENTS_COMMANDS',
        'AGENTS.md',
        commands.line,
        "The command table doesn't match package.json scripts.",
        'List every script once, in package.json order.',
      );
    }
  }
  const layout = sections(doc).find((h) => h.text === 'Layout');
  if (layout && !doc.lines.slice(layout.line).join('\n').split(/\n## /)[0]?.includes('```text')) {
    report.add(
      'AGENTS_LAYOUT',
      'AGENTS.md',
      layout.line,
      'Layout has no `text` tree.',
      'Add a `text` fence with the top two levels.',
    );
  }
}

function checkCi(root: string, report: Report): void {
  const dir = join(root, '.github', 'workflows');
  if (!existsSync(join(dir, 'check.yml'))) {
    report.add(
      'CI_MISSING',
      '.github/workflows/check.yml',
      undefined,
      'There is no check workflow.',
      'Copy check.yml from the template.',
    );
  }
  if (!existsSync(join(dir, 'release.yml'))) {
    report.add(
      'CI_RELEASE',
      '.github/workflows/release.yml',
      undefined,
      'There is no release workflow.',
      'Copy release.yml from the template, so merging a version bump publishes it.',
    );
  }
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const file = `.github/workflows/${name}`;
    const text = readFileSync(join(dir, name), 'utf8');
    text.split('\n').forEach((line, i) => {
      const uses = /uses:\s*([^\s#]+)/.exec(line)?.[1];
      if (uses && !uses.startsWith('./') && !/@[0-9a-f]{40}$/.test(uses)) {
        report.add(
          'CI_PIN',
          file,
          i + 1,
          `${uses} is not pinned by full SHA.`,
          'Pin the action to a 40-character commit SHA.',
        );
      }
      if (/runs-on:.*(macos|windows)/i.test(line)) {
        report.add(
          'CI_RUNNER',
          file,
          i + 1,
          'Job runs on hosted macOS or Windows.',
          'Use `ubuntu-24.04` in a public repo, or the sidecut-ops runner picker in a private one.',
        );
      }
      if (/bun-version:/.test(line))
        report.add(
          'CI_BUN',
          file,
          i + 1,
          'Bun version set in the workflow.',
          'Use `bun-version-file: package.json`.',
        );
    });
  }
  const check = existsSync(join(dir, 'check.yml'))
    ? readFileSync(join(dir, 'check.yml'), 'utf8')
    : '';
  // A public repo runs every job on GitHub-hosted Linux and never reaches the self-hosted runners.
  // Every job has to say where it runs; a job that calls another workflow can't count as hosted.
  const jobs = jobsOf(check);
  const hostedOnly = jobs.length > 0 && jobs.every((job) => job.runsOn === 'ubuntu-24.04');
  const release = existsSync(join(dir, 'release.yml'))
    ? readFileSync(join(dir, 'release.yml'), 'utf8')
    : '';
  if (hostedOnly && /self-hosted|SidecutStudio\/sidecut-ops\/\.github\/actions\//.test(release)) {
    report.add(
      'CI_RELEASE',
      '.github/workflows/release.yml',
      undefined,
      'A public repo releases on a self-hosted runner or with a private sidecut-ops action.',
      'Run the release job on `ubuntu-24.04` and drop the setup-ci-tools step; gh is already there.',
    );
  }
  if (check && !check.includes('/pick-runner@') && !hostedOnly) {
    report.add(
      'CI_PICKER',
      '.github/workflows/check.yml',
      undefined,
      'check.yml neither uses the runner picker nor runs every job on ubuntu-24.04.',
      'Copy the runner job from the template; a public repo runs every job on ubuntu-24.04 instead.',
    );
  }
}

/**
 * Each job in a workflow and its `runs-on` value, read from the indentation of the `jobs:` block.
 * Only a `runs-on` directly under the job counts, so one inside a called workflow's `with:` doesn't.
 */
export function jobsOf(workflow: string): { name: string; runsOn: string | undefined }[] {
  const lines = workflow.split('\n').map((line) => line.replace(/(^|\s+)#.*$/, ''));
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start < 0) return [];
  const jobs: { name: string; runsOn: string | undefined }[] = [];
  let jobIndent = -1;
  let keyIndent = -1;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) break;
    if (jobIndent < 0) jobIndent = indent;
    const key = /^\s*(["']?)([A-Za-z0-9_-]+)\1:\s*(.*)$/.exec(line);
    if (indent === jobIndent) {
      jobs.push({ name: key?.[2] ?? line.trim(), runsOn: undefined });
      keyIndent = -1;
    } else if (indent > jobIndent) {
      if (keyIndent < 0) keyIndent = indent;
      const job = jobs.at(-1);
      if (indent === keyIndent && key?.[2] === 'runs-on' && job) {
        job.runsOn = key[3]?.trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return jobs;
}

function checkSolo(root: string, report: Report): void {
  const path = join(root, 'solo-workflow.toml');
  if (!existsSync(path)) return;
  if (!/required_checks\s*=\s*\[[^\]]*"check"/.test(readFileSync(path, 'utf8'))) {
    report.add(
      'SOLO_REQUIRED',
      'solo-workflow.toml',
      undefined,
      '`required_checks` does not include "check".',
      'Add "check" to required_checks.',
    );
  }
}

/** The repo's own facts sync and the checker share. */
export type Identity = {
  plugins: string[];
  /** The one plugin the repo exists to ship, or null when it only holds plugins. */
  id: string | null;
  /** The GitHub repo name from the plugin's manifest. */
  repo: string;
  /** What gets checked, and why. */
  scope: string;
  keep: Record<string, string>;
};

function readJson(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    // A missing or broken file is reported by the checks that read it.
    return {};
  }
}

/**
 * A repo exists to ship its plugin when it holds one plugin whose manifest points at a SidecutStudio
 * repo named after the plugin, or after anything else when the repo's package is named after it.
 */
export function identify(root: string): Identity {
  const pluginsDir = join(root, 'plugins');
  const plugins = existsSync(pluginsDir)
    ? readdirSync(pluginsDir).filter((n) => n !== '.DS_Store')
    : [];
  const only = plugins.length === 1 ? (plugins[0] ?? '') : '';
  const manifest = readJson(join(pluginsDir, only, '.claude-plugin', 'plugin.json'));
  const pkg = readJson(join(root, 'package.json'));
  const repo =
    /^https:\/\/github\.com\/SidecutStudio\/([\w.-]+)$/.exec(
      String(manifest.repository ?? ''),
    )?.[1] ?? '';
  const keep = ((pkg.sidecut as { keep?: Record<string, string> } | undefined)?.keep ??
    {}) as Record<string, string>;
  if (only && repo && (repo === only || pkg.name === only))
    return { plugins, id: only, repo, scope: `Checked the whole repo for ${only}.`, keep };
  const scope = !only
    ? `Checked ${plugins.length} plugins only: the repo holds ${plugins.length === 0 ? 'none' : 'more than one'}.`
    : `Checked the plugin only: its manifest points at ${repo || 'no SidecutStudio repo'} and the package isn't named ${only}.`;
  return { plugins, id: null, repo, scope, keep };
}

/** Runs every house-style check that applies to the repo at `root`. */
export function checkRepo(root: string, report: Report): void {
  const pluginsDir = join(root, 'plugins');
  if (!existsSync(pluginsDir)) {
    report.add(
      'REPO_NO_PLUGINS',
      'plugins',
      undefined,
      'There is no plugins/ folder.',
      'Put the plugin in plugins/<plugin-id>/.',
    );
    return;
  }
  const { plugins, id: only, repo: repoName, scope, keep } = identify(root);
  report.scope = scope;
  if (!only) {
    for (const id of plugins) checkPlugin(join(pluginsDir, id), root, report, null);
    return;
  }
  const id = only;
  const pluginDir = join(pluginsDir, id);
  const { version } = checkPlugin(pluginDir, root, report, repoName);
  checkTopLevel(root, report);
  checkLicense(root, report);
  const scripts = checkPackage(root, id, version, report);
  checkAgents(root, id, scripts, report);
  checkCi(root, report);
  checkSolo(root, report);
  for (const name of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
    const a = join(root, name);
    const b = join(pluginDir, name);
    if (existsSync(a) && existsSync(b) && readFileSync(a, 'utf8') !== readFileSync(b, 'utf8')) {
      report.add(
        'REPO_COPY',
        name,
        undefined,
        `${name} differs from plugins/${id}/${name}.`,
        'Keep the two copies identical.',
      );
    }
  }
  // Kept files still get a REPO_SYNC problem here, so applyKeep can tell a stale keep from a live one.
  for (const change of planSync(root, { id, repo: repoName, version: ownVersion }))
    report.add(
      'REPO_SYNC',
      change.file,
      undefined,
      change.what,
      'Run `bunx sidecut-sync`. If this repo got it right, change the template in sidecut-agentskills instead.',
    );
  const security = join(root, 'SECURITY.md');
  if (existsSync(security)) {
    const text = readFileSync(security, 'utf8');
    checkMarkdown(parseMarkdown(security, text), text, root, report);
  }
  report.applyKeep(keep);
}
