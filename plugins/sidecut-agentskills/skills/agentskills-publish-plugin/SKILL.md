---
name: agentskills-publish-plugin
description: "Publishes a new version of a Sidecut plugin through the sidecut-plugins marketplace, with the version, CHANGELOG and both listings in step. Use when the user says ship, release or publish a plugin, or wants it to show up in Claude Code or Codex. Not for merging a change to the plugin's code (use `solo-finish-change`)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
---

# Publish plugin

Produces a new version of the plugin that the sidecut-plugins marketplace serves to Claude Code and Codex. A plugin in its own repo ships as a tagged release; a plugin inside another product's repo ships as one pinned commit of `main`. Either way, sidecut-plugins copies that version into its `bundled/` folder for the owner's installs, and a public repo also installs from its own marketplace files.

## Before you start

- `check_plugin` reports no problems on the plugin.
- Decide the version with the user: a fix is a patch, a new skill or tool is a minor version, and a renamed or removed skill or tool is a major version once the plugin is past 1.0.

## Steps

### 1. Tell which kind of release it is

Open the plugin's entry in `sidecut-plugins`' `bundled/sources.json`. A `ref` such as `v0.7.1` is a tag release (step 2), and a 40-character commit `ref` is a commit pin (step 3). A commit pin is for a plugin inside another product's repo, such as Next Role's `plugins/next-role/` in `next-role-lovable`. A plugin not listed yet is a tag release when its repo has a Release workflow, and a commit pin otherwise.

### 2. Tag release

The change to publish is merged to `main` first.

1. On a branch, add the dated version entry to the top of the root CHANGELOG.
2. For Agentskills, run `node scripts/version.ts <version>`. Repositories that have adopted the shared release workflow run `npm exec --no -- sidecut-version <version>`. The command updates the package and lockfile versions, both host manifests and the plugin CHANGELOG. In older repositories, follow their own version instructions.
3. Run `npm run check`, then merge through `solo-finish-change`. The merge is the release: after Check passes on `main`, the Release workflow tags the merge commit `v<version>` and publishes the GitHub Release with its ZIP and checksum.
4. Confirm the release in the plugin's own repo: `gh release view v<version> --repo SidecutStudio/<repo>` shows it published, not a draft, with `<plugin-id>-<version>.zip` and its `.sha256`, and `gh api repos/SidecutStudio/<repo>/commits/v<version> --jq .sha` is the merge commit. If the Release run failed, read its log and re-run it; never tag by hand.
5. In `sidecut-plugins`, check and update the shared bundle using [marketplace.md](references/marketplace.md). Run `sh scripts/check.sh` and merge that change the same way.
6. In a public repo, prove its own install source from GitHub, as [public-install.md](references/public-install.md) describes.

### 3. Commit pin

The product repo has no plugin tags or Release workflow, so the merge commit on `main` is the release.

1. With the change, or on its own branch, set the new version in `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` under `plugins/<plugin-id>/`. Add an entry to `plugins/<plugin-id>/CHANGELOG.md` in the same format.
2. Merge to `main` through that repo's own flow and checks, read from its `AGENTS.md`. Take the full 40-character merge commit from the merged PR: `gh pr view <number> --repo SidecutStudio/<repo> --json mergeCommit --jq .mergeCommit.oid`. Don't use the newest `main` commit, which a later sync may have moved past it.
3. In `sidecut-plugins`, run `bun scripts/bundle.ts <plugin-id> <merge-commit>`, following [marketplace.md](references/marketplace.md). Run `sh scripts/check.sh` and merge that change.

### 4. Confirm it arrived

After the marketplace syncs, start a new Claude Code session and confirm the plugin's skills show the new version.

## Rules

- Never install the plugin into the user's own Claude Code or Codex to try it; the marketplace copy is the one they get. A public install source is tried only from throwaway config folders, deleted afterwards.
- Install commands for a public plugin, on a website or anywhere else, are the README's public steps. Never give one that names `sidecut-plugins`, and never show made-up output.
- Release only from `main`, and only a commit whose checks passed. For a tag release the Release workflow enforces both; for a commit pin, check them before bundling the commit.
- Name the repo in every `gh` command, with `--repo SidecutStudio/<repo>` or a `repos/SidecutStudio/<repo>/` path. Without it, `gh` uses whichever checkout it runs in.
- A release counts only when its repo, version and commit all match. The same version number in another repo, or on another commit, isn't this release.
- Never tag, replace a published asset or edit a published release by hand. A broken release is fixed by a new version.
- Leave a commit-pinned plugin pinned by commit; it has no tags to point at.
- Never edit a copy under `sidecut-plugins/bundled/` by hand. Change the plugin in its own repo, release it and bundle that version.

## Recover a release

- **`VERSION_SYNC`:** one of the version fields or the CHANGELOG still has the old version.
- **`REPO_SYNC`:** the repo is behind sidecut-agentskills. Run `npm exec --no -- sidecut-sync` and commit what it changes with the release.
- **`REPO_CHECKER_VERSION`:** `node_modules` holds another sidecut-agentskills than `package.json` pins, often right after `npm exec --no -- sidecut-sync` raised the pin. Run `npm install` and check again.
- **`CI_RELEASE` or `REPO_SYNC` on `scripts/release.ts`:** the repo predates automatic releases. Run `npm exec --no -- sidecut-sync` and copy `release.yml` from the template, together with the next version bump, so the first run publishes it. Remove any old release job from `check.yml`, such as one that calls `./.github/workflows/release.yml`, and any old release script and its tests. The ZIP is now named `<plugin-id>-<version>.zip`. A public repo runs the job on `ubuntu-24.04` without sidecut-ops' setup action.
- **The Release run says the tag is on another commit:** a hand-made tag got there first. Bump to the next version instead of moving it.
- **`bundle.ts` fails to clone:** `gh` isn't signed in, or the account can't read the plugin's repo. Check `gh auth status`.
- **`bundle.ts` says the commit isn't on `main`:** use the merge commit from the merged PR, not one from a branch.
- **`scripts/check.sh` says a copy differs from its pin:** someone edited `bundled/<plugin-id>/` by hand. Run `bun scripts/bundle.ts <plugin-id> <ref>` again to restore it.
- **The new version doesn't appear:** confirm the sidecut-plugins change merged and `bundled/sources.json` names the new tag or commit, then sync the marketplace again.

## Done when

- `bundled/sources.json` in sidecut-plugins names the new tag or merge commit, and that change is merged.
- A tag release is published with its ZIP and checksum.
- A public repo's README install steps work from clean profiles in both hosts, or the unproven host is named.
- A new session shows the plugin at the new version.

## References

| Read | When |
| --- | --- |
| [marketplace.md](references/marketplace.md) | Adding, updating or removing a plugin in the marketplace |
| [public-install.md](references/public-install.md) | Proving a public repo installs for people without access to sidecut-plugins |
