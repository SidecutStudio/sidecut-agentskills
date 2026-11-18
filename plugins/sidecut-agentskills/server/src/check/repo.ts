import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
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
  'package-lock.json',
  'lefthook.yml',
  'package.json',
  'plugins',
  'scripts',
  'solo-workflow.toml',
  'tests',
  'evals',
  'tsconfig.json',
];
const OPTIONAL_ENTRIES = [
  '.git',
  'node_modules',
  'vitest.config.ts',
  'bin',
  'VOICE.md',
  'RELEASING.md',
  'docs',
  '.claude-plugin',
  '.agents',
];
/** The install source a public repo carries for each host, at the paths each host reads. */
const MARKETPLACES = ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json'];
const CHECK_STEPS = [
  'biome check .',
  'tsc --noEmit',
  'npm run style',
  'npm test',
  'node scripts/build-server.ts --check',
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

/** Runs git in `root` without a hook's GIT_* overrides; undefined when it fails. */
function git(root: string, ...args: string[]): string | undefined {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  const result = spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
  return result.status === 0 ? result.stdout : undefined;
}

const isRealDir = (path: string) => {
  const stat = lstatSync(path);
  return stat.isDirectory() && !stat.isSymbolicLink();
};

/**
 * Whether a host folder holds only what the host leaves in a checkout, with nothing tracked:
 * files the repo's .gitignore ignores, such as the Codex subagent profiles skills copy into
 * `.codex/agents/`, plus, for `.claude`, git worktrees Claude Code registered under
 * `.claude/worktrees/`.
 */
const HOST_FOLDERS = ['.claude', '.codex'];

function onlyHostState(root: string, folder: string): boolean {
  const dir = join(root, folder);
  if (!isRealDir(dir)) return false;
  const top = git(root, 'rev-parse', '--show-toplevel')?.trim();
  if (!top || realpathSync(top) !== realpathSync(root)) return false;
  if (git(root, 'ls-files', '-z', '--', folder) !== '') return false;
  const registered = new Set(
    (git(root, 'worktree', 'list', '--porcelain', '-z') ?? '')
      .split('\0')
      .filter((line) => line.startsWith('worktree '))
      .flatMap((line) => {
        // A registered worktree whose folder was deleted can't be the one found here.
        const path = line.slice('worktree '.length);
        return existsSync(path) ? [realpathSync(path)] : [];
      }),
  );
  return readdirSync(dir).every((name) => {
    const path = join(dir, name);
    if (folder === '.claude' && name === 'worktrees' && isRealDir(path))
      return readdirSync(path).every(
        (tree) => isRealDir(join(path, tree)) && registered.has(realpathSync(join(path, tree))),
      );
    return git(root, 'check-ignore', '-q', '--', `${folder}/${name}`) !== undefined;
  });
}

/**
 * The repo's installed sidecut-check, from node_modules, must be the tag package.json pins, or
 * `npm run style` checks other rules than CI does. It reads node_modules rather than this
 * checker's own version, which is the marketplace plugin's when check_plugin runs it.
 */
function checkCheckerVersion(root: string, report: Report): void {
  const read = (path: string) => {
    try {
      return JSON.parse(readFileSync(join(root, path), 'utf8')) as {
        version?: string;
        devDependencies?: Record<string, string>;
      };
    } catch {
      return null;
    }
  };
  const pinned = /#v(\d+\.\d+\.\d+)$/.exec(
    read('package.json')?.devDependencies?.['sidecut-agentskills'] ?? '',
  )?.[1];
  const installed = read('node_modules/sidecut-agentskills/package.json')?.version;
  if (pinned && installed && pinned !== installed)
    report.add(
      'REPO_CHECKER_VERSION',
      'package.json',
      undefined,
      `package.json pins sidecut-agentskills v${pinned}, but node_modules holds v${installed}, so \`npm run style\` can differ from CI.`,
      'Run `npm install`, then check again.',
    );
}

function checkTopLevel(root: string, report: Report): void {
  const gitignore = existsSync(join(root, '.gitignore'))
    ? readFileSync(join(root, '.gitignore'), 'utf8').split('\n').filter(Boolean)
    : [];
  const entries = readdirSync(root).filter(
    (n) => !ignoredBy(gitignore, n) && !(HOST_FOLDERS.includes(n) && onlyHostState(root, n)),
  );
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
  if (!/^npm@\d+\.\d+\.\d+$/.test(String(pkg.packageManager ?? ''))) {
    report.add(
      'REPO_PACKAGE_MANAGER',
      'package.json',
      undefined,
      '`packageManager` is not a pinned npm@x.y.z.',
      'Set it, for example `npm@11.19.1`.',
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
  if (!inOrder(scripts.build ?? '', ['node scripts/build-server.ts']))
    report.add(
      'REPO_BUILD_SCRIPT',
      'package.json',
      undefined,
      '`build` does not run `node scripts/build-server.ts`.',
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
  const before = found.filter((s) => s !== 'Sidecut Solo' && s !== 'Solo Workflow');
  if (before.join('|') !== AGENTS_SECTIONS.join('|')) {
    report.add(
      'AGENTS_SECTIONS',
      'AGENTS.md',
      undefined,
      'Sections are not Commands, Layout, Rules.',
      'Use exactly those, then the Sidecut Solo section.',
    );
  }
  if (!/<!-- solo-workflow:start -->[\s\S]*<!-- solo-workflow:end -->\n$/.test(text)) {
    report.add(
      'AGENTS_SOLO',
      'AGENTS.md',
      undefined,
      'AGENTS.md does not end with the Sidecut Solo markers.',
      'Run solo-configure-project.',
    );
  }
  const commands = sections(doc).find((h) => h.text === 'Commands');
  if (commands) {
    const rows = tableAfter(doc, commands)
      .slice(1)
      .map((r) => r[0] ?? '');
    const want = Object.keys(scripts).map((s) => `\`npm run ${s}\``);
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
      if (/node-version:\s*(?:latest|node|\*)\s*$/.test(line))
        report.add(
          'CI_NODE',
          file,
          i + 1,
          'Node version is not pinned.',
          'Pin an exact Node.js version.',
        );
    });
  }
  const check = existsSync(join(dir, 'check.yml'))
    ? readFileSync(join(dir, 'check.yml'), 'utf8')
    : '';
  // A public repo runs every job on GitHub-hosted Linux and never reaches the self-hosted runners.
  // Every job has to say where it runs; a job that calls another workflow can't count as hosted.
  const hostedOnly = isHostedOnly(check);
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

/** Whether every job in a workflow runs on GitHub-hosted Linux, which marks a public repo. */
function isHostedOnly(workflow: string): boolean {
  const jobs = jobsOf(workflow);
  return jobs.length > 0 && jobs.every((job) => job.runsOn === 'ubuntu-24.04');
}

/** Every file under `dir`, relative to `root`, leaving out names `.gitignore` ignores. */
function filesUnder(root: string, dir: string, ignored: string[]): string[] {
  const path = join(root, dir);
  if (!existsSync(path)) return [];
  if (!lstatSync(path).isDirectory()) return [dir];
  return readdirSync(path)
    .filter((name) => name !== '.DS_Store' && !ignoredBy(ignored, name))
    .flatMap((name) => filesUnder(root, `${dir}/${name}`, ignored));
}

/**
 * A public repo carries its own install source, so people without access to the private
 * sidecut-plugins marketplace can install it, and its README installs from that source. A private
 * repo has none: claude.ai can't read it, so its plugin is listed from sidecut-plugins only.
 */
function checkInstallSource(root: string, id: string, repo: string, report: Report): void {
  const check = join(root, '.github', 'workflows', 'check.yml');
  const isPublic = existsSync(check) && isHostedOnly(readFileSync(check, 'utf8'));
  const gitignore = existsSync(join(root, '.gitignore'))
    ? readFileSync(join(root, '.gitignore'), 'utf8').split('\n').filter(Boolean)
    : [];
  const found = ['.claude-plugin', '.agents'].flatMap((dir) => filesUnder(root, dir, gitignore));
  const extra = found.filter((f) => !MARKETPLACES.includes(f));
  for (const file of extra)
    report.add(
      'REPO_MARKETPLACE',
      file,
      undefined,
      `"${file}" isn't part of the repo layout; the root .claude-plugin/ and .agents/ hold only a public repo's marketplace files.`,
      'Move it into the plugin, or remove it.',
    );
  if (!isPublic) {
    for (const file of found.filter((f) => MARKETPLACES.includes(f)))
      report.add(
        'REPO_MARKETPLACE',
        file,
        undefined,
        'A private repo has its own marketplace.',
        'List the plugin from the sidecut-plugins marketplace only; a public repo, whose jobs all run on ubuntu-24.04, keeps one.',
      );
    return;
  }
  const [claudeFile, codexFile] = MARKETPLACES as [string, string];
  const how = "Write it as the house style's Install source section shows.";
  for (const file of MARKETPLACES) {
    if (!existsSync(join(root, file)))
      report.add(
        'REPO_MARKETPLACE',
        file,
        undefined,
        `A public repo has no ${file}, so only people with access to the private sidecut-plugins marketplace can install it.`,
        how,
      );
  }
  type Entry = { name?: unknown; source?: unknown };
  const only = (file: string, source: (entry: Entry) => boolean) => {
    if (!existsSync(join(root, file))) return;
    const marketplace = readJson(join(root, file));
    const plugins = marketplace.plugins as Entry[] | undefined;
    const ok =
      marketplace.name === id &&
      Array.isArray(plugins) &&
      plugins.length === 1 &&
      plugins[0]?.name === id &&
      source(plugins[0]);
    if (!ok)
      report.add(
        'REPO_MARKETPLACE',
        file,
        undefined,
        `${file} doesn't list only plugins/${id} under the marketplace name ${id}.`,
        how,
      );
  };
  const path = `./plugins/${id}`;
  only(claudeFile, (entry) => entry.source === path);
  only(codexFile, (entry) => {
    const source = entry.source as { source?: unknown; path?: unknown } | undefined;
    return source?.source === 'local' && source.path === path;
  });

  const readme = existsSync(join(root, 'README.md'))
    ? readFileSync(join(root, 'README.md'), 'utf8')
    : '';
  const install = /\n## Install\n([\s\S]*?)(?=\n## |$)/.exec(readme)?.[1] ?? '';
  const add = `marketplace add SidecutStudio/${repo}`;
  const named = new Set(
    [...install.matchAll(/plugin (?:install|add) [\w.-]+@([\w.-]+)/g)].map((m) => m[1]),
  );
  const added = new Set(
    [...install.matchAll(/plugin marketplace add (\S+)/g)].map((m) => m[1]?.replace(/`$/, '')),
  );
  for (const source of added) {
    if (source !== `SidecutStudio/${repo}`)
      report.add(
        'README_INSTALL',
        'README.md',
        undefined,
        `The Install section adds the marketplace ${source}, which isn't this repo.`,
        `Add \`SidecutStudio/${repo}\` instead.`,
      );
  }
  for (const marketplace of named) {
    if (marketplace !== id)
      report.add(
        'README_INSTALL',
        'README.md',
        undefined,
        `The Install section installs from ${marketplace}, a marketplace this public repo doesn't provide.`,
        `Install ${id}@${id} after \`/plugin ${add}\` in Claude Code and \`codex plugin ${add}\` in Codex.`,
      );
  }
  const steps = [
    `/plugin ${add}`,
    `/plugin install ${id}@${id}`,
    `codex plugin ${add}`,
    `codex plugin add ${id}@${id}`,
  ];
  const lines = new Set(install.split('\n').map((line) => line.trim()));
  const missing = steps.filter((step) => !lines.has(step));
  if (missing.length > 0)
    report.add(
      'README_INSTALL',
      'README.md',
      undefined,
      `The Install section is missing ${missing.map((step) => `\`${step}\``).join(', ')}.`,
      "Use the public install steps from the house style's Install source section.",
    );
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
 * repo named after the plugin. A repo that kept its older name, the plugin id without `sidecut-`,
 * counts too when its package is named after the plugin. Any other repo, such as an app that ships a
 * plugin next to its own code, gets the plugin checks only, whatever its package is called.
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
  const olderName = only === `sidecut-${repo}` && pkg.name === only;
  const renamed = pkg.name === only && Object.hasOwn(keep, 'REPO_PLUGIN_ID');
  if (only && repo && (repo === only || olderName || renamed))
    return { plugins, id: only, repo, scope: `Checked the whole repo for ${only}.`, keep };
  const scope = !only
    ? `Checked ${plugins.length} plugins only: the repo holds ${plugins.length === 0 ? 'none' : 'more than one'}.`
    : `Checked the plugin only: its manifest points at ${repo || 'no SidecutStudio repo'}, not a repo that exists only for ${only}.`;
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
    report.applyKeep(keep);
    return;
  }
  const id = only;
  const pluginDir = join(pluginsDir, id);
  if (repoName !== id && id !== `sidecut-${repoName}`)
    report.add(
      'REPO_PLUGIN_ID',
      'package.json',
      undefined,
      `Plugin ${id} retains the repository name ${repoName}.`,
      'Keep REPO_PLUGIN_ID with the reason for retaining the repository name.',
    );
  const { version } = checkPlugin(pluginDir, root, report, repoName);
  checkTopLevel(root, report);
  checkLicense(root, report);
  const scripts = checkPackage(root, id, version, report);
  checkCheckerVersion(root, report);
  checkAgents(root, id, scripts, report);
  checkCi(root, report);
  checkInstallSource(root, id, repoName, report);
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
      'Run `npm exec --no -- sidecut-sync`. If this repo got it right, change the template in sidecut-agentskills instead.',
    );
  const security = join(root, 'SECURITY.md');
  if (existsSync(security)) {
    const text = readFileSync(security, 'utf8');
    checkMarkdown(parseMarkdown(security, text), text, root, report);
  }
  report.applyKeep(keep);
}
