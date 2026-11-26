---
name: agentskills-publish-plugin
description: "Publishes a new version of a plugin through its marketplace, with the version, CHANGELOG and both listings in step. Use when the user says ship, release or publish a plugin, or wants it to show up in Claude Code or Codex. Not for merging a change to the plugin's code, which goes through the repo's own merge flow."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Publish plugin

Produces a new version of the plugin that its marketplace serves to Claude Code and Codex. The marketplace is the repo's `marketplace` setting, from its `.agentskills.json`:

- **The plugin's own repo** (the default, no marketplace set): the tagged release in step 2 is the whole publish, and step 2 ends by proving the repo's own install source.
- **A shared marketplace** (`owner/repo`): release as in step 2 or 3, then update that marketplace's entry the way its own README or AGENTS.md says. A public repo also installs from its own marketplace files.
- **With the `sidecut` profile**, also follow the Marketplace part of `get_house_style` with `section: "Sidecut profile"`.

## Before you start

- `check_plugin` reports no problems on the plugin.
- Reuse a settled version or apply the release rule: a fix is a patch, a new skill or tool is a minor version, and a renamed or removed skill or tool is a major version once the plugin is past 1.0. Ask only if the correct version is a material unresolved choice. Follow `server/data/user-input.md` from the loaded plugin root.
- Read the repo's `AGENTS.md` for how it merges: its own flow and its required checks.
- When the plugin connects to a hosted server (a `url` or an `mcp-remote` bridge in its MCP files, or an `.app.json`) and that server signs in, stop here until sign-in has been done through each host the plugin ships to, Claude Code and Codex, ending in a harmless read: an app's connection in that host, or the plugin loaded in an isolated profile as `agentskills-build-mcp-server` describes. A scripted OAuth client, a staging script or a review that read the config is not sign-in. Release with a host unproven only once the user has agreed to it, and then name that host in the CHANGELOG entry and the report.

## Steps

### 1. Tell which kind of release it is

A repo with `.github/workflows/release.yml` makes a tag release (step 2). A plugin inside another product's repo, with no plugin tags or Release workflow, is a commit pin (step 3), and its shared marketplace records that commit.

### 2. Tag release

The change to publish is merged to `main` first. For either release type, reuse existing publication authorization. If it is missing, use the user-input guidance after preparing the version and before the first action that publishes it.

1. On a branch, add the dated version entry to the top of the root CHANGELOG.
2. Run `npm exec --no -- sidecut-version <version>` (in Agentskills itself, `node scripts/version.ts <version>`). It updates the package and lockfile versions, every host manifest and the plugin CHANGELOG. In older repositories, follow their own version instructions.
3. Run `npm run check`, then merge through the repo's own flow once its required checks pass. The merge is the release: after Check passes on `main`, the Release workflow tags the merge commit `v<version>` and publishes the GitHub Release with its ZIP and checksum.
4. Confirm the release in the plugin's own repo: `gh release view v<version> --repo <org>/<repo>` shows it published, not a draft, with `<plugin-id>-<version>.zip` and its `.sha256`, and `gh api repos/<org>/<repo>/commits/v<version> --jq .sha` is the merge commit. If the Release run failed, read its log and re-run it; never tag by hand.
5. With a shared marketplace, point its entry at the new tag the way that repo says, and merge that change through its own checks.
6. In a public repo, prove its own install source from GitHub, as [public-install.md](references/public-install.md) describes.

### 3. Commit pin

The product repo has no plugin tags or Release workflow, so the merge commit on `main` is the release.

1. With the change, or on its own branch, set the new version in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` and `.antigravity-plugin/plugin.json` under `plugins/<plugin-id>/`, or run `npm exec --no -- sidecut-version <version>`, which sets all of them. Add an entry to `plugins/<plugin-id>/CHANGELOG.md` in the same format.
2. Merge to `main` through that repo's own flow and checks, read from its `AGENTS.md`. Take the full 40-character merge commit from the merged PR: `gh pr view <number> --repo <org>/<repo> --json mergeCommit --jq .mergeCommit.oid`. Don't use the newest `main` commit, which a later sync may have moved past it.
3. Point the shared marketplace's entry at that commit the way its repo says, and merge that change.

### 4. Confirm it arrived

After the marketplace syncs, start a new Claude Code session and confirm the plugin's skills show the new version.

## Rules

- Never install the plugin into the user's own Claude Code or Codex to try it; the marketplace copy is the one they get. A public install source is tried only from throwaway config folders, deleted afterwards.
- Install commands for a public plugin, on a website or anywhere else, are the README's public steps. Never give one that names a marketplace the public can't read, and never show made-up output.
- Release only from `main`, and only a commit whose checks passed. For a tag release the Release workflow enforces both; for a commit pin, check them before pointing the marketplace at it.
- Name the repo in every `gh` command, with `--repo <org>/<repo>` or a `repos/<org>/<repo>/` path. Without it, `gh` uses whichever checkout it runs in.
- A release counts only when its repo, version and commit all match. The same version number in another repo, or on another commit, isn't this release.
- Never tag, replace a published asset or edit a published release by hand. A broken release is fixed by a new version.
- Leave a commit-pinned plugin pinned by commit; it has no tags to point at.
- Never edit a marketplace's copy of a plugin by hand. Change the plugin in its own repo, release it and point the marketplace at that version.

## Recover a release

- **`VERSION_SYNC`:** one of the version fields or the CHANGELOG still has the old version.
- **`REPO_SYNC`:** the repo is behind sidecut-agentskills. Run `npm exec --no -- sidecut-sync` and commit what it changes with the release.
- **`REPO_CHECKER_VERSION`:** `node_modules` holds another sidecut-agentskills than `package.json` pins, often right after `npm exec --no -- sidecut-sync` raised the pin. Run `npm install` and check again.
- **`CI_RELEASE` or `REPO_SYNC` on `scripts/release.ts`:** the repo predates automatic releases. Run `npm exec --no -- sidecut-sync` and copy `release.yml` from the template, together with the next version bump, so the first run publishes it. Remove any old release job from `check.yml`, such as one that calls `./.github/workflows/release.yml`, and any old release script and its tests. The ZIP is now named `<plugin-id>-<version>.zip`. A public repo runs the job on `ubuntu-24.04` with public actions only.
- **The Release run says the tag is on another commit:** a hand-made tag got there first. Bump to the next version instead of moving it.
- **The new version doesn't appear:** confirm the marketplace change merged and names the new tag or commit, then sync the marketplace again.

## Done when

- A tag release is published with its ZIP and checksum, or the commit pin is merged.
- A shared marketplace names the new tag or merge commit, and that change is merged.
- A plugin whose hosted server signs in was signed in through each host before release, or the unproven host is named in its CHANGELOG entry.
- A public repo's README install steps work from clean profiles in both hosts, or the unproven host is named.
- A new session shows the plugin at the new version.

## References

| Read | When |
| --- | --- |
| [public-install.md](references/public-install.md) | Proving a public repo installs for people without access to anything private |
