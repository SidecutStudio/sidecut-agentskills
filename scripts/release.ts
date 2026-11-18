import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { parse } from 'smol-toml';

const root = process.cwd();
const id = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name as string;
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function releasePlan(
  version: string,
  codex: { version: string },
  claude: { version: string },
  changelog: string,
) {
  if (!semver.test(version)) throw new Error('Use a stable version such as 0.7.0, without v.');
  if (codex.version !== version || claude.version !== version)
    throw new Error('The requested version must match both plugin manifests.');
  const sections = [
    ...changelog.matchAll(
      /^## \[?([0-9]+\.[0-9]+\.[0-9]+)\]?(?: - \d{4}-\d{2}-\d{2})?\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm,
    ),
  ];
  if (sections[0]?.[1] !== version || !sections[0][2]?.trim())
    throw new Error('The first changelog entry must describe the requested version.');
  return {
    version,
    tag: `v${version}`,
    archive: `${id}-${version}.zip`,
    notes: sections[0][2].trim(),
  };
}

export function newerVersion(left: string, right: string) {
  const a = left.split('.').map(BigInt);
  const b = right.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return (a[i] ?? 0n) > (b[i] ?? 0n);
  }
  return false;
}

export function requiredChecksPass(
  required: string[],
  checks: { id: number; name: string; status: string; conclusion: string | null }[],
) {
  if (!required.length) throw new Error('No required checks are configured.');
  for (const name of required) {
    const latest = checks.filter((check) => check.name === name).sort((a, b) => b.id - a.id)[0];
    if (latest?.status !== 'completed' || latest.conclusion !== 'success')
      throw new Error(`Required check ${name} has not passed on the release commit.`);
  }
}

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, TZ: 'UTC' },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args[0]}: ${result.stderr.trim()}`);
  return result.stdout.trim();
};
const git = (...args: string[]) => run('git', args);
const gh = (...args: string[]) => run('gh', args);

type Asset = { name: string; digest: string | null; id?: number; state?: string };
type Release = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: Asset[];
  html_url: string;
};
type Ref = { ref: string; object: { type: string; sha: string } };

export function findRelease(repo: string, tag: string, provider = gh): Release | undefined {
  // The direct endpoint may omit a draft. A failed request only means absence on an explicit 404.
  try {
    return JSON.parse(provider('api', `repos/${repo}/releases/tags/${tag}`));
  } catch (error) {
    if (!/\(HTTP 404\)$/.test(String(error))) throw error;
  }
  const pages: Release[][] = JSON.parse(
    provider('api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`),
  );
  const matches = pages.flat().filter((item) => item.tag_name === tag);
  if (matches.length > 1) throw new Error(`${tag}: more than one matching release.`);
  return matches[0];
}

export async function waitForRelease(
  lookup: () => Release | undefined,
  ready: (release: Release) => boolean,
  delays = [1_000, 2_000, 4_000, 8_000],
) {
  let current = lookup();
  for (const delay of delays) {
    if (current && ready(current)) return current;
    await setTimeout(delay);
    current = lookup();
  }
  return current && ready(current) ? current : undefined;
}

export function missingAssets(release: Release, expected: Map<string, string>) {
  return [...expected]
    .filter(([name, digest]) => {
      const asset = release.assets.find((item) => item.name === name);
      if (release.draft && asset?.state === 'starter' && asset.digest === null) return true;
      if (asset && asset.digest !== digest)
        throw new Error(`Existing release asset differs: ${name}.`);
      return !asset;
    })
    .map(([name]) => name);
}

export function releaseCommit(
  head: string,
  tagged: string | undefined,
  ancestor: (sha: string) => boolean,
) {
  if (tagged === undefined) return head;
  if (!ancestor(tagged)) throw new Error('The existing version tag is outside main history.');
  return tagged;
}

function planAt(commit: string) {
  const file = (path: string) => git('show', `${commit}:${path}`);
  const pkg = JSON.parse(file('package.json'));
  const codex = JSON.parse(file(`plugins/${id}/.codex-plugin/plugin.json`));
  const claude = JSON.parse(file(`plugins/${id}/.claude-plugin/plugin.json`));
  if (pkg.name !== id || codex.name !== id || claude.name !== id)
    throw new Error('The package and both manifests must describe the same plugin.');
  const plan = releasePlan(pkg.version, codex, claude, file(`plugins/${id}/CHANGELOG.md`));
  return { ...plan, title: `${codex.interface?.displayName ?? id} ${plan.version}` };
}

async function main() {
  const [mode, ...extra] = process.argv.slice(2);
  const head = git('rev-parse', 'HEAD');
  const plan = planAt(head);
  if (extra.length || (mode !== plan.version && mode !== '--publish-current'))
    throw new Error('Usage: node scripts/release.ts <package-version> | --publish-current (CI)');
  if (mode !== '--publish-current') {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const repo = process.env.GITHUB_REPOSITORY;
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.RELEASE_SHA !== head ||
    !repo ||
    !/^[\w.-]+\/[\w.-]+$/.test(repo)
  )
    throw new Error('Publish through the Release workflow at its checked commit.');
  const remoteHead = (): string =>
    JSON.parse(gh('api', `repos/${repo}/git/ref/heads/main`)).object.sha;
  if (remoteHead() !== head) {
    console.log('Main moved. Use the Release run for the latest checked main commit.');
    return;
  }

  const refs: Ref[] = JSON.parse(gh('api', `repos/${repo}/git/matching-refs/tags/v`));
  const tag = refs.find((entry) => entry.ref === `refs/tags/${plan.tag}`);
  const ancestor = (sha: string) =>
    spawnSync('git', ['merge-base', '--is-ancestor', sha, head], { cwd: root }).status === 0;
  const tagged = tag ? git('rev-parse', `refs/tags/${plan.tag}^{commit}`) : undefined;
  if (tag && tag.object.sha !== git('rev-parse', `refs/tags/${plan.tag}`))
    throw new Error('The remote tag changed since checkout. Rerun Release.');
  const commit = releaseCommit(head, tagged, ancestor);
  const plugin = `plugins/${id}`;
  if (tagged && git('rev-parse', `${head}:${plugin}`) !== git('rev-parse', `${commit}:${plugin}`))
    throw new Error(
      `${plan.tag}: main contains different plugin content. Bump the package version.`,
    );
  const taggedPlan = planAt(commit);
  if (taggedPlan.tag !== plan.tag) throw new Error('The existing tag describes another version.');
  const existing = findRelease(repo, plan.tag);
  const assetNames = [plan.archive, `${plan.archive}.sha256`];
  if (existing && !existing.draft) {
    if (
      !tag ||
      existing.prerelease ||
      assetNames.some((name) => !existing.assets.some((asset) => asset.name === name))
    )
      throw new Error(`${plan.tag}: published release is incomplete. Fix it in a new version.`);
    console.log(`Already published ${plan.tag} at ${commit}: ${existing.html_url}`);
    return;
  }
  if (
    refs.some((ref) => {
      const version = ref.ref.slice('refs/tags/v'.length);
      return semver.test(version) && newerVersion(version, plan.version);
    })
  )
    throw new Error('A newer version tag exists. Run Release for the latest checked version.');
  if (existing?.prerelease) throw new Error('A prerelease already uses this stable tag.');
  for (const sha of new Set([head, commit])) {
    const policy = parse(git('show', `${sha}:solo-workflow.toml`)) as { required_checks: string[] };
    const pages = JSON.parse(
      gh(
        'api',
        '--paginate',
        '--slurp',
        `repos/${repo}/commits/${sha}/check-runs?per_page=100&filter=all`,
      ),
    );
    requiredChecksPass(
      policy.required_checks,
      pages.flatMap((page: { check_runs: [] }) => page.check_runs),
    );
  }

  const assertMain = () => {
    if (remoteHead() !== head)
      throw new Error('Main moved. The latest checked main run can resume this version.');
  };
  const stage = mkdtempSync(join(tmpdir(), 'sidecut-release-'));
  try {
    const archive = join(stage, plan.archive);
    git(
      'archive',
      '--format=zip',
      '-0',
      `--mtime=${git('show', '-s', '--format=%cI', commit)}`,
      `--prefix=${id}/`,
      '-o',
      archive,
      `${commit}:plugins/${id}`,
    );
    const digest = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
    const checksum = `${archive}.sha256`;
    writeFileSync(checksum, `${digest(archive)}  ${plan.archive}\n`);
    const expected = new Map(
      assetNames.map((name) => [name, `sha256:${digest(join(stage, name))}`]),
    );
    const notes = join(stage, 'notes.md');
    writeFileSync(notes, taggedPlan.notes);

    assertMain();
    if (!tag)
      gh(
        'api',
        '--method',
        'POST',
        `repos/${repo}/git/refs`,
        '-f',
        `ref=refs/tags/${plan.tag}`,
        '-f',
        `sha=${commit}`,
      );
    if (!existing)
      gh(
        'release',
        'create',
        plan.tag,
        '--repo',
        repo,
        '--verify-tag',
        '--draft',
        '--title',
        taggedPlan.title,
        '--notes-file',
        notes,
      );
    const lookup = () => findRelease(repo, plan.tag);
    const draft = await waitForRelease(lookup, (release) => release.draft);
    if (!draft) throw new Error('The draft is unavailable. Rerun Release to reconcile it.');
    for (const name of missingAssets(draft, expected)) {
      const starter = draft.assets.find(
        (asset) => asset.name === name && asset.state === 'starter',
      );
      if (starter) {
        if (!Number.isSafeInteger(starter.id))
          throw new Error(`Invalid draft asset ID for ${name}.`);
        gh('api', '--method', 'DELETE', `repos/${repo}/releases/assets/${starter.id}`);
      }
      gh('release', 'upload', plan.tag, join(stage, name), '--repo', repo);
    }
    const uploaded = await waitForRelease(
      lookup,
      (release) => release.draft && missingAssets(release, expected).length === 0,
    );
    if (!uploaded)
      throw new Error('Release assets are not ready. Rerun Release to reconcile them.');
    assertMain();
    gh('release', 'edit', plan.tag, '--repo', repo, '--draft=false', '--latest');
    const published = await waitForRelease(
      lookup,
      (release) => !release.draft && missingAssets(release, expected).length === 0,
    );
    if (!published) throw new Error('Could not verify publication. Rerun Release to confirm.');
    console.log(`Published ${plan.tag} at ${commit}: ${published.html_url}`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (import.meta.main) await main();
