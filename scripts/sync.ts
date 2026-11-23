#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { identify } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import { keepCovers } from '../plugins/sidecut-agentskills/server/src/check/report.ts';
import {
  applySync,
  BLOCK_FILES,
  guideMoveFiles,
  OWNED_FILES,
  planSync,
  pluginOwnedFile,
} from '../plugins/sidecut-agentskills/server/src/check/sync.ts';
import { ownVersion } from '../plugins/sidecut-agentskills/server/src/scaffold.ts';

const usage = `Usage: sidecut-sync [<repo>] [--check] [--force]

Brings a plugin repo up to date with sidecut-agentskills: the files it owns, the blocks marked
sidecut:start, and the shared tool versions in package.json. Uses the installed, pinned version of Agentskills. Paths and rules listed under sidecut.keep in
package.json are left alone.

  --check    change nothing; list what would change and exit 1 if anything would
  --force    also overwrite files with uncommitted changes`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: 'boolean' },
    force: { type: 'boolean' },
    help: { type: 'boolean' },
  },
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
const root = resolve(positionals[0] ?? '.');
const who = identify(root);
if (!who.id) {
  console.log(`Nothing to sync. ${who.scope}`);
  process.exit(0);
}

// Never overwrite work that isn't committed yet: git couldn't bring it back. This runs once, before
// anything changes, so the move to a newer release below doesn't count as someone's edit.
if (!values.check && !values.force) {
  // A git hook sets GIT_DIR and friends; drop them so git looks at this folder, not the hook's repo.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')),
  );
  const touched = [
    ...OWNED_FILES,
    ...BLOCK_FILES,
    pluginOwnedFile(who.id),
    ...guideMoveFiles(root, who.id),
    'package.json',
    'package-lock.json',
  ];
  const dirty = spawnSync('git', ['status', '--porcelain', '--', ...touched], {
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

const keys = Object.keys(who.keep);
const changes = planSync(root, { id: who.id, repo: who.repo, version: ownVersion }, (file) =>
  keys.some((key) => keepCovers(key, 'REPO_SYNC', file)),
);
if (changes.length === 0) {
  console.log(`Up to date with sidecut-agentskills v${ownVersion}.`);
  process.exit(0);
}
if (values.check) {
  for (const change of changes) console.log(`Would change ${change.file}: ${change.what}`);
  process.exit(1);
}
const left = applySync(root, changes);
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
