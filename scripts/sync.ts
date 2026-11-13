#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { identify } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import {
  applySync,
  newer,
  planSync,
} from '../plugins/sidecut-agentskills/server/src/check/sync.ts';
import { ownVersion } from '../plugins/sidecut-agentskills/server/src/scaffold.ts';

const usage = `Usage: sidecut-sync [<repo>] [--check] [--offline]

Brings a plugin repo up to date with sidecut-agentskills: the files it owns, the blocks marked
sidecut:start, and the shared tool versions in package.json. First it moves the repo to the latest
sidecut-agentskills release and runs that version. Paths and rules listed under sidecut.keep in
package.json are left alone.

  --check    change nothing; list what would change and exit 1 if anything would
  --offline  skip looking up the latest release`;

const CHECKER = 'github:SidecutStudio/sidecut-agentskills#v';
const SOURCE = 'https://github.com/SidecutStudio/sidecut-agentskills';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: 'boolean' },
    offline: { type: 'boolean' },
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
    // Move the repo to the latest release, then let that version do the sync.
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    pkg.devDependencies['sidecut-agentskills'] = `${CHECKER}${latest}`;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`Moved sidecut-agentskills to v${latest}.`);
    const install = spawnSync('bun', ['install'], { cwd: root, stdio: 'inherit' });
    if (install.status !== 0) process.exit(install.status ?? 1);
    const next = spawnSync(
      join(root, 'node_modules', '.bin', 'sidecut-sync'),
      [root, '--offline'],
      { stdio: 'inherit' },
    );
    process.exit(next.status ?? 1);
  }
}

const changes = planSync(
  root,
  { id: who.id, repo: who.repo, version: ownVersion },
  new Set(Object.keys(who.keep)),
);
if (changes.length === 0) {
  console.log(`Up to date with sidecut-agentskills v${ownVersion}.`);
  process.exit(0);
}
for (const change of changes)
  console.log(`${values.check ? 'Would change' : 'Changed'} ${change.file}: ${change.what}`);
if (values.check) process.exit(1);
applySync(root, changes);
if (changes.some((c) => c.file === 'package.json')) {
  const install = spawnSync('bun', ['install'], { cwd: root, stdio: 'inherit' });
  if (install.status !== 0) process.exit(install.status ?? 1);
}
console.log(
  `\nSynced with sidecut-agentskills v${ownVersion}. Review the diff: where this repo was ahead, change the template instead and keep the repo's version under sidecut.keep until it lands.`,
);
