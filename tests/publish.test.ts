import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { expect, test } from 'vitest';

// The publisher runs only in Linux CI, and this fakes gh with a shebang script on PATH, which Windows can't run.
test.skipIf(process.platform === 'win32')(
  'resumes a partially uploaded release after main advances, then repeats without writes',
  () => {
    const root = mkdtempSync(join(tmpdir(), 'sidecut-publish-'));
    const statePath = join(root, 'state.json');
    const publisher = resolve('scripts/release.ts');
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    const write = (path: string, text: string, mode?: number) => {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text, { mode });
    };
    try {
      git('init', '-q');
      git('config', 'user.email', 'publisher@example.test');
      git('config', 'user.name', 'Release fixture');
      const manifest = '{"name":"sample","version":"1.2.0"}';
      write('package.json', manifest);
      write('plugins/sample/.claude-plugin/plugin.json', manifest);
      write('plugins/sample/.codex-plugin/plugin.json', manifest);
      write('plugins/sample/CHANGELOG.md', '# Changelog\n\n## [1.2.0]\n\n- Example\n');
      write('solo-workflow.toml', 'required_checks = ["check", "secrets"]\n');
      git('add', 'package.json', 'plugins', 'solo-workflow.toml');
      git('commit', '-qm', 'Prepare release');
      const first = git('rev-parse', 'HEAD');
      write('state.json', '{"assets":[],"writes":[]}');
      write(
        'gh',
        `#!${process.execPath}
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const state = JSON.parse(readFileSync(process.env.TEST_STATE, 'utf8'));
const head = process.env.RELEASE_SHA;
const path = args.at(-1);
const respond = data => console.log(JSON.stringify(data));
const mutate = label => {
  state.writes.push(label);
  writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
};
const release = () => ({tag_name:'v1.2.0', draft:state.draft, prerelease:false, assets:state.assets});
if (args[0] === 'api') {
  if (path.includes('/compare/')) {
    respond({status:process.env.STALE ? 'diverged' : 'ahead'});
  } else if (path.endsWith('/git/ref/heads/main')) {
    respond({object:{sha:process.env.STALE ? 'other' : head}});
  } else if (path.endsWith('/git/matching-refs/tags/v')) {
    respond(state.tag ? [{ref:'refs/tags/v1.2.0',object:{sha:state.tag,type:'commit'}}] : []);
  } else if (path.includes('/check-runs?')) {
    respond([{check_runs:['check','secrets'].map(name=>({id:1,name,status:'completed',conclusion:'success'}))}]);
  } else if (args.includes('DELETE') && path.endsWith('/releases/assets/99')) {
    state.assets = state.assets.filter(asset => asset.id !== 99);
    mutate('remove starter');
  } else if (args.includes('--method')) {
    state.tag = head;
    execFileSync('git', ['tag','v1.2.0',head]);
    mutate('tag');
  } else if (path.includes('/releases/tags/')) {
    if (state.draft === false) respond(release());
    else { console.error('gh: release not found (HTTP 404)'); process.exit(1); }
  } else if (path.includes('/releases?')) respond([state.draft ? [release()] : []]);
  else process.exit(72);
} else if (args[1] === 'create') {
  state.draft = true;
  mutate('draft');
} else if (args[1] === 'upload') {
  const name = basename(args[3]);
  if (name.endsWith('.sha256') && process.env.FAIL_UPLOAD) {
    state.assets.push({name,id:99,digest:null,state:'starter'});
    mutate('starter');
    process.exit(73);
  }
  const digest = createHash('sha256').update(readFileSync(args[3])).digest('hex');
  state.assets.push({name,digest:'sha256:'+digest});
  mutate(name);
} else if (args[1] === 'edit') {
  state.draft = false;
  mutate('publish');
} else process.exit(74);
`,
        0o755,
      );
      const publish = (sha: string, flags: Record<string, string> = {}) =>
        spawnSync(process.execPath, [publisher, '--publish-current'], {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            GITHUB_ACTIONS: 'true',
            GITHUB_REPOSITORY: 'test/sample',
            RELEASE_SHA: sha,
            TEST_STATE: statePath,
            PATH: `${root}:${process.env.PATH}`,
            ...flags,
          },
        });
      const state = () => JSON.parse(readFileSync(statePath, 'utf8'));
      // A commit that is no longer on main is refused before any write.
      expect(publish(first, { STALE: '1' }).status).not.toBe(0);
      expect(state().writes).toEqual([]);
      expect(publish(first, { FAIL_UPLOAD: '1' }).status).not.toBe(0);
      expect(state().writes).toEqual(['tag', 'draft', 'sample-1.2.0.zip', 'starter']);
      git('commit', '--allow-empty', '-qm', 'Advance main at the same version');
      const second = git('rev-parse', 'HEAD');
      const resumed = publish(second);
      expect(resumed.stderr).toBe('');
      expect(resumed.status).toBe(0);
      expect(state().tag).toBe(first);
      expect(state().writes).toEqual([
        'tag',
        'draft',
        'sample-1.2.0.zip',
        'starter',
        'remove starter',
        'sample-1.2.0.zip.sha256',
        'publish',
      ]);
      const before = readFileSync(statePath, 'utf8');
      expect(publish(second).status).toBe(0);
      expect(readFileSync(statePath, 'utf8')).toBe(before);
      write('plugins/sample/README.md', 'Different plugin content');
      git('add', 'plugins/sample/README.md');
      git('commit', '-qm', 'Change plugin without bumping');
      const drift = publish(git('rev-parse', 'HEAD'));
      expect(drift.status).not.toBe(0);
      expect(drift.stderr).toContain('Bump the package version');
      expect(readFileSync(statePath, 'utf8')).toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
  15_000,
);
