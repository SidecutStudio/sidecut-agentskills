import { describe, expect, test } from 'bun:test';
import {
  newerVersion,
  releaseNeeded,
  releasePlan,
  requiredChecksPass,
} from '../scripts/release.ts';

const changelog =
  '# Changelog\n\n## [1.2.0] - 2026-11-13\n\n### Added\n\n- A thing.\n\n## [1.1.0]\n';

describe('release script', () => {
  test('plans the tag, archive and notes from matching manifests and CHANGELOG', () => {
    expect(releasePlan('1.2.0', { version: '1.2.0' }, { version: '1.2.0' }, changelog)).toEqual({
      version: '1.2.0',
      tag: 'v1.2.0',
      archive: 'sidecut-agentskills-1.2.0.zip',
      notes: '### Added\n\n- A thing.',
    });
  });

  test('refuses a version the manifests or CHANGELOG do not describe', () => {
    expect(() =>
      releasePlan('1.2.0', { version: '1.1.0' }, { version: '1.2.0' }, changelog),
    ).toThrow('both plugin manifests');
    expect(() =>
      releasePlan('1.3.0', { version: '1.3.0' }, { version: '1.3.0' }, changelog),
    ).toThrow('first changelog entry');
    expect(() =>
      releasePlan('v1.2.0', { version: 'v1.2.0' }, { version: 'v1.2.0' }, changelog),
    ).toThrow('stable version');
  });

  test('a published release is never redone; a draft or missing one is', () => {
    expect(releaseNeeded({ found: true, isDraft: false })).toBe(false);
    expect(releaseNeeded({ found: true, isDraft: true })).toBe(true);
    expect(releaseNeeded({ found: false })).toBe(true);
  });

  test('compares versions numerically', () => {
    expect(newerVersion('0.10.0', '0.9.0')).toBe(true);
    expect(newerVersion('0.9.0', '0.10.0')).toBe(false);
    expect(newerVersion('1.0.0', '1.0.0')).toBe(false);
  });

  test('every required check must have passed on its latest run', () => {
    const run = (id: number, name: string, conclusion: string | null, status = 'completed') => ({
      id,
      name,
      status,
      conclusion,
    });
    expect(() =>
      requiredChecksPass(['check'], [run(1, 'check', 'success'), run(2, 'check', 'failure')]),
    ).toThrow('check');
    expect(() => requiredChecksPass(['check', 'secrets'], [run(1, 'check', 'success')])).toThrow(
      'secrets',
    );
    expect(() => requiredChecksPass(['check'], [run(1, 'check', null, 'in_progress')])).toThrow();
    expect(() => requiredChecksPass([], [])).toThrow('No required checks');
    requiredChecksPass(['check'], [run(1, 'check', 'failure'), run(2, 'check', 'success')]);
  });
});
