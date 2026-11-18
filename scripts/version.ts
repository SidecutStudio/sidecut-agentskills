#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function syncVersion(version: string, root = process.cwd(), check = false) {
  if (!stableVersion.test(version)) throw new Error('Use a stable version such as 1.2.3.');
  const read = (path: string) => readFileSync(join(root, path), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  if (!/^[a-z][a-z0-9-]*$/.test(pkg.name)) throw new Error('Invalid plugin name in package.json.');
  const current = pkg.version.split('.').map(BigInt) as bigint[];
  const next = version.split('.').map(BigInt);
  const changed = next.findIndex((part, index) => part !== current[index]);
  if (changed >= 0 && (next[changed] ?? 0n) < (current[changed] ?? 0n))
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
  const derived = [
    ...['.claude-plugin', '.codex-plugin'].map((host) => {
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
    const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
    syncVersion(version, process.cwd(), true);
  } else {
    syncVersion(argument);
    console.log(
      `Version ${argument} synchronized. Run the repository checks and review the release diff.`,
    );
  }
}
