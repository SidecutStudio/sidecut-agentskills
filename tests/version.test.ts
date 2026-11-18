import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'vitest';
import { syncVersion } from '../scripts/version.ts';

test('synchronizes versions and changelog, preserves manifest formatting, and retries without edits', () => {
  const root = mkdtempSync(join(tmpdir(), 'sidecut-version-'));
  try {
    const pkg = '{\n  "name": "sample",\n  "version": "1.9.0",\n  "keywords": ["one", "two"]\n}\n';
    const notes = '# Changelog\n\n## [1.10.0] - 2026-11-18\n\n- Example.\n';
    const write = (file: string, content: string) => {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), content);
    };
    const read = (file: string) => readFileSync(join(root, file), 'utf8');
    const plugin = 'plugins/sample';
    write('package.json', pkg);
    write(
      'package-lock.json',
      JSON.stringify({
        name: 'sample',
        version: '1.9.0',
        packages: { '': { name: 'sample', version: '1.9.0' } },
      }),
    );
    write(`${plugin}/.claude-plugin/plugin.json`, pkg);
    write(`${plugin}/.codex-plugin/plugin.json`, pkg);
    write(`${plugin}/CHANGELOG.md`, '');
    write('CHANGELOG.md', notes);
    expect(() => syncVersion('1.8.0', root)).toThrow('backwards');
    expect(() => syncVersion('1.11.0', root)).toThrow('release notes');
    expect(read('package.json')).toBe(pkg);
    expect(() => syncVersion('1.10.0', root, true)).toThrow('metadata drift');
    syncVersion('1.10.0', root);
    syncVersion('1.10.0', root, true);
    expect(JSON.parse(read('package-lock.json')).packages[''].version).toBe('1.10.0');
    expect(read(`${plugin}/.claude-plugin/plugin.json`)).toBe(pkg.replace('1.9.0', '1.10.0'));
    expect(read(`${plugin}/.codex-plugin/plugin.json`)).toBe(pkg.replace('1.9.0', '1.10.0'));
    expect(read(`${plugin}/CHANGELOG.md`)).toBe(notes);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
