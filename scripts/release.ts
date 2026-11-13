// Publishes the plugin version from a checked main commit: tag, GitHub Release, ZIP and SHA-256
// checksum. The Release workflow runs it after Check passes on main. Locally it only prints the
// plan: bun scripts/release.ts <version>. --auto prints the manifest version and whether it still
// needs publishing, as GITHUB_OUTPUT lines. A published release is never replaced. Every Sidecut
// plugin repo has this file unchanged.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const root = join(import.meta.dir, '..');
const id = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name as string;
const plugin = join(root, 'plugins', id);
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

/** A version needs publishing unless its GitHub Release exists and is no longer a draft. */
export function releaseNeeded(existing: { found: boolean; isDraft?: boolean }) {
  return !existing.found || existing.isDraft !== false;
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

const manifests = async () => ({
  codex: await Bun.file(join(plugin, '.codex-plugin/plugin.json')).json(),
  claude: await Bun.file(join(plugin, '.claude-plugin/plugin.json')).json(),
  changelog: await Bun.file(join(plugin, 'CHANGELOG.md')).text(),
});

async function releaseState(tag: string, repo: string) {
  const view = await $`gh release view ${tag} --repo ${repo} --json isDraft`.quiet().nothrow();
  return view.exitCode === 0
    ? { found: true, isDraft: JSON.parse(view.text()).isDraft as boolean }
    : { found: false };
}

function githubRepo() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Missing GitHub repository.');
  return repo;
}

/** The commit a version tag points to, following an annotated tag; undefined when untagged. */
async function tagCommit(repo: string, tag: string) {
  const refs: { ref: string; object: { type: string; sha: string } }[] =
    await $`gh api repos/${repo}/git/matching-refs/tags/v`.json();
  const found = refs.find((ref) => ref.ref === `refs/tags/${tag}`);
  if (!found) return { refs, commit: undefined };
  let object = found.object;
  if (object.type === 'tag')
    object = (await $`gh api repos/${repo}/git/tags/${object.sha}`.json()).object;
  return { refs, commit: object.type === 'commit' ? object.sha : '' };
}

async function auto() {
  const { codex, claude, changelog } = await manifests();
  const plan = releasePlan(codex.version, codex, claude, changelog);
  const repo = githubRepo();
  const needed = releaseNeeded(await releaseState(plan.tag, repo));
  if (needed) {
    // An unfinished release tagged on an older commit can't be finished from here.
    const { commit } = await tagCommit(repo, plan.tag);
    const head = (await $`git rev-parse HEAD`.cwd(root).text()).trim();
    if (commit !== undefined && commit !== head)
      throw new Error(
        `${plan.tag} is tagged on ${commit || 'a non-commit'} but its release is unfinished. ` +
          'Bump the version to release from main; the old tag and draft stay as they are.',
      );
  }
  console.error(needed ? `${plan.tag} is not published yet.` : `${plan.tag} is already published.`);
  console.log(`version=${plan.version}\nneeded=${needed}`);
}

async function main() {
  if (process.argv[2] === '--auto' && process.argv.length === 3) return auto();
  const [version, mode, ...extra] = process.argv.slice(2);
  if (!version || (mode && mode !== '--publish') || extra.length)
    throw new Error('Usage: bun scripts/release.ts <version> [--publish] | --auto');
  const { codex, claude, changelog } = await manifests();
  const plan = releasePlan(version, codex, claude, changelog);
  if (!mode) {
    console.log(JSON.stringify({ ...plan, publish: false }, null, 2));
    return;
  }
  const expected = process.env.RELEASE_SHA;
  if (process.env.GITHUB_ACTIONS !== 'true' || !expected || !/^[0-9a-f]{40}$/.test(expected))
    throw new Error('Publish only through the Release workflow, which sets RELEASE_SHA.');
  const repo = githubRepo();
  const head = (await $`git rev-parse HEAD`.cwd(root).text()).trim();
  if (head !== expected) throw new Error('Checkout differs from the commit Check passed on.');
  const assertMain = async () => {
    const remote = await $`gh api repos/${repo}/git/ref/heads/main`.json();
    if (remote.object.sha !== head) throw new Error('Main moved on; the next Check run releases.');
  };
  await assertMain();
  const policy = Bun.TOML.parse(await Bun.file(join(root, 'solo-workflow.toml')).text()) as {
    required_checks: string[];
  };
  const pages =
    await $`gh api --paginate --slurp repos/${repo}/commits/${head}/check-runs?per_page=100`.json();
  requiredChecksPass(
    policy.required_checks,
    pages.flatMap((page: { check_runs: [] }) => page.check_runs),
  );
  const existing = await releaseState(plan.tag, repo);
  if (!releaseNeeded(existing))
    throw new Error('This release is already published; published assets are never replaced.');

  // The installable folder exactly as committed, under a top folder named after the plugin.
  await $`mkdir -p dist`.cwd(root);
  const archive = join(root, 'dist', plan.archive);
  await $`git archive --format=zip --prefix=${`${id}/`} -o ${archive} ${`${head}:plugins/${id}`}`.cwd(
    root,
  );
  const checksum = `${archive}.sha256`;
  const hash = new Bun.CryptoHasher('sha256')
    .update(await Bun.file(archive).arrayBuffer())
    .digest('hex');
  await Bun.write(checksum, `${hash}  ${plan.archive}\n`);
  const notes = join(root, 'dist/release-notes.md');
  await Bun.write(notes, plan.notes);
  const { refs, commit } = await tagCommit(repo, plan.tag);
  for (const ref of refs) {
    const tagged = ref.ref.slice('refs/tags/v'.length);
    if (semver.test(tagged) && newerVersion(tagged, version))
      throw new Error('A newer version tag exists; refusing to move Latest backwards.');
  }
  if (commit !== undefined) {
    if (commit !== head) throw new Error('The version tag already points to a different commit.');
  } else {
    await assertMain();
    await $`gh api --method POST repos/${repo}/git/refs -f ${`ref=refs/tags/${plan.tag}`} -f ${`sha=${head}`}`.quiet();
  }
  const title = `${codex.interface?.displayName ?? id} ${version}`;
  if (!existing.found)
    await $`gh release create ${plan.tag} --repo ${repo} --verify-tag --target ${head} --draft --title ${title} --notes-file ${notes}`;
  await $`gh release upload ${plan.tag} ${archive} ${checksum} --repo ${repo} --clobber`;
  await assertMain();
  await $`gh release edit ${plan.tag} --repo ${repo} --draft=false --latest --notes-file ${notes}`;
  const published =
    await $`gh release view ${plan.tag} --repo ${repo} --json isDraft,assets,url`.json();
  if (
    published.isDraft ||
    ![plan.archive, `${plan.archive}.sha256`].every((name) =>
      published.assets.some((asset: { name: string }) => asset.name === name),
    )
  )
    throw new Error('Release publication or assets could not be verified.');
  console.log(`Published ${plan.tag} at ${head}: ${published.url}`);
}

if (import.meta.main) await main();
