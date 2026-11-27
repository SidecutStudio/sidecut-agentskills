#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { checkRepo, identify } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import { keepCovers, Report } from '../plugins/sidecut-agentskills/server/src/check/report.ts';
import {
  applySync,
  BLOCK_FILES,
  guideMoveFiles,
  OWNED_FILES,
  planSync,
  pluginOwnedFile,
  pluginSharedFiles,
  pluginSyncFiles,
  SETUP_FILE,
} from '../plugins/sidecut-agentskills/server/src/check/sync.ts';
import { ownVersion } from '../plugins/sidecut-agentskills/server/src/scaffold.ts';

const usage = `Usage: sidecut-sync [<repo>] [--check] [--force] [--fix]

Brings a plugin repo up to date with sidecut-agentskills: the files it owns, the blocks marked
sidecut:start, and the shared tool versions in package.json. Uses the installed, pinned version of Agentskills. Paths and rules listed under sidecut.keep in
package.json are left alone.

  --check    change nothing; list what would change and exit 1 if anything would
  --force    also overwrite files with uncommitted changes
  --fix      also fix what sidecut-check finds that has one right answer, in a repo of any
             kind: the Solo block, CLAUDE.md's import of AGENTS.md and the retired studio name`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: 'boolean' },
    force: { type: 'boolean' },
    fix: { type: 'boolean' },
    help: { type: 'boolean' },
  },
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
const root = resolve(positionals[0] ?? '.');
const who = identify(root);
// A repo that ships its one plugin beside other work still gets the plugin's files and the repo
// files it already shares with the template.
const id = who.id ?? who.plugin;

/** The checker's fixes, grouped by file and applied in the order found. */
function planFixes(): { file: string; what: string[]; next: string }[] {
  const report = new Report();
  checkRepo(root, report, { fast: true });
  const byFile = new Map<string, { what: string[]; next: string }>();
  for (const fix of report.fixes) {
    const path = join(root, fix.file);
    const entry = byFile.get(fix.file) ?? {
      what: [],
      next: existsSync(path) ? readFileSync(path, 'utf8') : '',
    };
    const next = fix.apply(entry.next);
    if (next === entry.next) continue;
    if (!entry.what.includes(fix.what)) entry.what.push(fix.what);
    byFile.set(fix.file, { ...entry, next });
  }
  return [...byFile].map(([file, entry]) => ({ file, ...entry }));
}

/** Refuses when a file it would write has uncommitted changes, unless --force. */
function guard(files: string[]): void {
  if (values.check || values.force || files.length === 0) return;
  // A git hook sets GIT_DIR and friends; drop them so git looks at this folder, not the hook's repo.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')),
  );
  const dirty = spawnSync('git', ['status', '--porcelain', '--', ...files], {
    cwd: root,
    encoding: 'utf8',
    env,
  });
  if (dirty.status !== 0) {
    console.error(
      'This folder is not a git repo, so a change could not be undone. Pass --force to sync anyway.',
    );
    process.exit(1);
  }
  if (dirty.stdout.trim() !== '') {
    console.error(
      `These files have uncommitted changes, so nothing was changed:\n${dirty.stdout}Commit or stash them first, or pass --force.`,
    );
    process.exit(1);
  }
}

/** Applies the checker's fixes; with --check, lists them. Exits 1 under --check when any remain. */
function runFixes(guarded = false): boolean {
  const fixes = planFixes();
  if (!guarded) guard(fixes.map((f) => f.file));
  for (const fix of fixes) {
    if (values.check) console.log(`Would fix ${fix.file}: ${fix.what.join(' ')}`);
    else {
      writeFileSync(join(root, fix.file), fix.next);
      console.log(`Fixed ${fix.file}: ${fix.what.join(' ')}`);
    }
  }
  return fixes.length > 0;
}

if (!id) {
  if (values.fix) {
    const found = runFixes();
    if (!found) console.log('Nothing to fix.');
    process.exit(values.check && found ? 1 : 0);
  }
  console.log(`Nothing to sync. ${who.scope} Pass --fix to fix what the checker can.`);
  process.exit(0);
}
const scope = who.id ? 'whole' : 'beside';
if (scope === 'beside')
  console.log(
    `Syncing ${id} and the repo files that already follow the template: the repo ships it beside other work.`,
  );

const keys = Object.keys(who.keep);
// A file is kept by its path, by `REPO_SYNC <file>`, or by the plugin rule that reports it.
const changes = planSync(root, { id, repo: who.repo, version: ownVersion, scope }, (file, code) =>
  keys.some(
    (key) =>
      keepCovers(key, 'REPO_SYNC', file) || (code !== undefined && keepCovers(key, code, file)),
  ),
);

// Never overwrite work that isn't committed yet: git couldn't bring it back. This runs once, before
// anything changes, so the move to a newer release below doesn't count as someone's edit.
guard([
  ...OWNED_FILES,
  ...BLOCK_FILES,
  SETUP_FILE,
  pluginOwnedFile(id),
  ...pluginSharedFiles(id),
  ...pluginSyncFiles(id),
  ...guideMoveFiles(root, id),
  ...changes.filter(({ file }) => file.startsWith('evals/')).map(({ file }) => file),
  'package.json',
  'package-lock.json',
  ...(values.fix ? planFixes().map((f) => f.file) : []),
]);

if (changes.length === 0) {
  console.log(`Up to date with sidecut-agentskills v${ownVersion}.`);
  const fixed = values.fix && runFixes(true);
  process.exit(values.check && fixed ? 1 : 0);
}
if (values.check) {
  for (const change of changes) console.log(`Would change ${change.file}: ${change.what}`);
  process.exit(1);
}
const left = applySync(root, changes);
if (values.fix) runFixes(true);
for (const change of changes)
  if (change.next !== null) console.log(`Changed ${change.file}: ${change.what}`);
if (changes.some((c) => c.file === 'package.json')) {
  const install = spawnSync('npm', ['install'], { cwd: root, stdio: 'inherit' });
  if (install.status !== 0) process.exit(install.status ?? 1);
}
if (left.length > 0) {
  console.error(`\n${left.map((c) => c.what).join('\n')}`);
  process.exit(1);
}
console.log(
  `\nSynced with sidecut-agentskills v${ownVersion}. Review the diff: where this repo was ahead, change the template instead and keep the repo's version under sidecut.keep until it lands.`,
);
