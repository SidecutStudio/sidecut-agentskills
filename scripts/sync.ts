#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { identify } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import { keepCovers } from '../plugins/sidecut-agentskills/server/src/check/report.ts';
import {
  applySync,
  newer,
  planSync,
} from '../plugins/sidecut-agentskills/server/src/check/sync.ts';
import { ownVersion } from '../plugins/sidecut-agentskills/server/src/scaffold.ts';

const usage = `Usage: sidecut-sync [<repo>] [--check] [--offline] [--force]

Brings a plugin repo up to date with sidecut-agentskills: the files it owns, the blocks marked
sidecut:start, and the shared tool versions in package.json. First it moves the repo to the latest
sidecut-agentskills release and runs that version. Paths and rules listed under sidecut.keep in
package.json are left alone.

  --check    change nothing; list what would change and exit 1 if anything would
  --offline  skip looking up the latest release
  --force    also overwrite files with uncommitted changes`;

const CHECKER = 'github:SidecutStudio/sidecut-agentskills#v';
const SOURCE = 'https://github.com/SidecutStudio/sidecut-agentskills';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: 'boolean' },
    offline: { type: 'boolean' },
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

/** The newest vX.Y.Z tag of sidecut-agentskills, or null when it can't be read. */
function latestRelease(): string | null {
  const result = spawnSync('git', ['ls-remote', '--tags', '--refs', SOURCE], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const tags = [...result.stdout.matchAll(/refs\/tags\/v(\d+\.\d+\.\d+)$/gm)].map(
    (m) => m[1] ?? '',
  );
  return tags.reduce<string | null>((best, tag) => (!best || newer(tag, best) ? tag : best), null);
}

const pkgPath = join(root, 'package.json');
const pinned = existsSync(pkgPath)
  ? String(
      (JSON.parse(readFileSync(pkgPath, 'utf8')) as { devDependencies?: Record<string, string> })
        .devDependencies?.['sidecut-agentskills'] ?? '',
    )
  : '';
if (!values.offline && !values.check && pinned.startsWith(CHECKER)) {
  const latest = latestRelease();
  if (latest === null) console.log("Couldn't read the latest release; syncing with this version.");
  else if (newer(latest, ownVersion)) {
    // Move the repo to the latest release, then let that version do the sync. If anything fails,
    // put package.json back so the repo stays on the version it had.
    const before = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(before) as { devDependencies: Record<string, string> };
    pkg.devDependencies['sidecut-agentskills'] = `${CHECKER}${latest}`;
    const indent = /^\{\r?\n([ \t]+)"/.exec(before)?.[1] ?? '  ';
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, indent)}\n`);
    console.log(`Moving sidecut-agentskills to v${latest}.`);
    const install = spawnSync('bun', ['install'], { cwd: root, stdio: 'inherit' });
    const bin = join(root, 'node_modules', '.bin', 'sidecut-sync');
    if (install.status !== 0 || !existsSync(bin)) {
      writeFileSync(pkgPath, before);
      spawnSync('bun', ['install'], { cwd: root, stdio: 'inherit' });
      console.error(
        install.status !== 0
          ? `bun install failed for v${latest}; package.json is back on v${ownVersion}.`
          : `v${latest} has no sidecut-sync; package.json is back on v${ownVersion}.`,
      );
      process.exit(1);
    }
    const passOn = [root, '--offline', ...(values.force ? ['--force'] : [])];
    const next = spawnSync(bin, passOn, { stdio: 'inherit' });
    process.exit(next.status ?? 1);
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
// Never overwrite work that isn't committed yet: git couldn't bring it back.
const dirty = spawnSync('git', ['status', '--porcelain', '--', ...changes.map((c) => c.file)], {
  cwd: root,
  encoding: 'utf8',
});
if (!values.force && dirty.status !== 0) {
  console.error(
    '\nThis folder is not a git repo, so a change could not be undone. Pass --force to sync anyway.',
  );
  process.exit(1);
}
if (!values.force && dirty.stdout.trim() !== '') {
  console.error(
    `\nThese files have uncommitted changes, so nothing was changed:\n${dirty.stdout}Commit or stash them first, or pass --force.`,
  );
  process.exit(1);
}
const left = applySync(root, changes);
for (const change of changes)
  if (change.next !== null) console.log(`Changed ${change.file}: ${change.what}`);
if (changes.some((c) => c.file === 'package.json')) {
  const install = spawnSync('bun', ['install'], { cwd: root, stdio: 'inherit' });
  if (install.status !== 0) process.exit(install.status ?? 1);
}
if (left.length > 0) {
  console.error(`\n${left.map((c) => c.what).join('\n')}`);
  process.exit(1);
}
console.log(
  `\nSynced with sidecut-agentskills v${ownVersion}. Review the diff: where this repo was ahead, change the template instead and keep the repo's version under sidecut.keep until it lands.`,
);
