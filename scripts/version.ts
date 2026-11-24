#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function compareVersions(a: string, b: string) {
  if (!stableVersion.test(a) || !stableVersion.test(b))
    throw new Error('Expected stable versions.');
  const left = a.split('.').map(BigInt);
  const right = b.split('.').map(BigInt);
  const changed = left.findIndex((part, index) => part !== right[index]);
  if (changed < 0) return 0;
  return (left[changed] ?? 0n) > (right[changed] ?? 0n) ? 1 : -1;
}

export function checkVersionBase(base: string, root: string, id: string, version: string) {
  if (!/^[0-9a-f]{40}$/.test(base)) throw new Error('Expected a full base commit SHA.');
  const original = JSON.parse(
    execFileSync('git', ['show', `${base}:package.json`], {
      cwd: root,
      encoding: 'utf8',
    }),
  );
  const order = compareVersions(version, original.version);
  const diff = spawnSync('git', ['diff', '--quiet', base, '--', `plugins/${id}`], { cwd: root });
  if (diff.status !== 0 && diff.status !== 1)
    throw new Error('Could not compare installable files to the base commit.');
  if (order < 0 || (order === 0 && diff.status === 1))
    throw new Error(
      `Bump the package version from ${original.version} for the changed installable files.`,
    );
}

export function syncVersion(version: string, root = process.cwd(), check = false) {
  if (!stableVersion.test(version)) throw new Error('Use a stable version such as 1.2.3.');
  const read = (path: string) => readFileSync(join(root, path), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  if (!/^[a-z][a-z0-9-]*$/.test(pkg.name)) throw new Error('Invalid plugin name in package.json.');
  if (compareVersions(version, pkg.version) < 0)
    throw new Error(`Cannot move package version backwards from ${pkg.version} to ${version}.`);

  const changelog = read('CHANGELOG.md');
  const entry = changelog.split(/^## /m)[1] ?? '';
  const [heading, ...notes] = entry.split(/\r?\n/);
  if (!heading?.startsWith(`[${version}] - `) || !notes.join('').trim())
    throw new Error(`Add the dated ${version} entry and release notes at the top of CHANGELOG.md.`);

  const plugin = `plugins/${pkg.name}`;
  const lock = JSON.parse(read('package-lock.json'));
  if (lock.name !== pkg.name || lock.packages?.['']?.name !== pkg.name)
    throw new Error('The npm lockfile does not describe this package.');
  const versionLine = /^(\s{2}"version": ")\d+\.\d+\.\d+(")/m;
  const replaceVersion = (path: string) => {
    const contents = read(path);
    if (!versionLine.test(contents)) throw new Error(`Cannot find top-level version in ${path}.`);
    return contents.replace(versionLine, (_, start, end) => `${start}${version}${end}`);
  };
  lock.version = lock.packages[''].version = version;
  // Antigravity's manifest joined in 2.6.0; a repo synced before then doesn't have it yet.
  const hosts = ['.claude-plugin', '.codex-plugin', '.antigravity-plugin'].filter(
    (host) => host !== '.antigravity-plugin' || existsSync(join(root, plugin, host, 'plugin.json')),
  );
  const derived = [
    ...hosts.map((host) => {
      const path = `${plugin}/${host}/plugin.json`;
      const manifest = JSON.parse(read(path));
      if (manifest.name !== pkg.name) throw new Error(`Plugin identity differs in ${path}.`);
      return [path, replaceVersion(path)] as const;
    }),
    ['package-lock.json', `${JSON.stringify(lock, null, 2)}\n`],
    [`${plugin}/CHANGELOG.md`, changelog],
    ['package.json', replaceVersion('package.json')],
  ] as const;
  const updates = derived.filter(([path, contents]) => read(path) !== contents);
  if (check && updates.length)
    throw new Error(
      `Version metadata drift in ${updates.map(([path]) => path).join(', ')}. Run sidecut-version ${version}.`,
    );
  for (const [path, contents] of updates) writeFileSync(join(root, path), contents);
}

if (import.meta.main) {
  const [argument, extra] = process.argv.slice(2);
  if (!argument || extra) throw new Error('Usage: sidecut-version <version> | --check');
  if (argument === '--check') {
    const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'));
    syncVersion(version, process.cwd(), true);
    const base = process.env.SIDECUT_VERSION_BASE;
    if (base && !/^0+$/.test(base)) checkVersionBase(base, process.cwd(), name, version);
  } else {
    syncVersion(argument);
    console.log(
      `Version ${argument} synchronized. Run the repository checks and review the release diff.`,
    );
  }
}
