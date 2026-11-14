---
name: agentskills-publish-plugin
description: "Publishes a new version of a Sidecut plugin through the sidecut-plugins marketplace, with the version, CHANGELOG and both listings in step. Use when the user says ship, release or publish a plugin, or wants it to show up in Claude Code or Codex. Not for merging a change to the plugin's code (use `solo-workflow-finish-change`)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
---

# Publish plugin

Produces a new version of the plugin that the sidecut-plugins marketplace serves to Claude Code and Codex. A plugin in its own repo ships as a tagged release; a plugin inside another product's repo ships as one pinned commit of `main`.

## Before you start

- `check_plugin` reports no problems on the plugin.
- Decide the version with the user: a fix is a patch, a new skill or tool is a minor version, and a renamed or removed skill or tool is a major version once the plugin is past 1.0.

## Steps

### 1. Tell which kind of release it is

Open the plugin's entry in `sidecut-plugins`' `.claude-plugin/marketplace.json`. A `ref` such as `v0.7.1` is a tag release: follow step 2. `"ref": "main"` with a `sha` is a commit pin, used when the plugin lives inside another product's repo, such as Next Role's `plugins/next-role/` in `next-role-lovable`: follow step 3. A plugin not listed yet is a tag release when its repo has a Release workflow, and a commit pin otherwise.

### 2. Tag release

The change to publish is merged to `main` first.

1. On a branch, set the new version in `plugins/<plugin-id>/.claude-plugin/plugin.json`, `plugins/<plugin-id>/.codex-plugin/plugin.json` and `package.json`.
2. Add a CHANGELOG entry for it at the top, with today's date and one line per change under Added, Changed, Fixed or Removed. Copy it to the plugin's CHANGELOG so the two stay identical.
3. Run `bun run check`, then merge through `solo-workflow-finish-change`. The merge is the release: after Check passes on `main`, the Release workflow tags the merge commit `v<version>` and publishes the GitHub Release with its ZIP and checksum.
4. Confirm the release: `gh release view v<version>` shows it published, not a draft, with `<plugin-id>-<version>.zip` and its `.sha256`. If the Release run failed, read its log and re-run it; never tag by hand.
5. In `sidecut-plugins`, set `ref` to the new tag in both marketplace entries, following [marketplace.md](references/marketplace.md). Run `sh scripts/check.sh` and merge that change the same way.

### 3. Commit pin

The product repo has no plugin tags or Release workflow, so the merge commit on `main` is the release.

1. With the change, or on its own branch, set the new version in `plugins/<plugin-id>/.claude-plugin/plugin.json` and `plugins/<plugin-id>/.codex-plugin/plugin.json`, and add an entry to `plugins/<plugin-id>/CHANGELOG.md` in the same format.
2. Merge to `main` through that repo's own flow and checks, read from its `AGENTS.md`. Note the full 40-character merge commit: `git rev-parse origin/main` right after the merge.
3. In `sidecut-plugins`, set `sha` to that commit in both marketplace entries and keep `"ref": "main"`, following [marketplace.md](references/marketplace.md). Run `sh scripts/check.sh` and merge that change.

### 4. Confirm it arrived

After the marketplace syncs, start a new Claude Code session and confirm the plugin's skills show the new version.

## Rules

- Never install the plugin locally to try it; the marketplace copy is the one people get.
- Release only from `main`, and only a commit whose checks passed. For a tag release the Release workflow enforces both; for a commit pin, check them before moving the `sha`.
- Never tag, replace a published asset or edit a published release by hand. A broken release is fixed by a new version.
- Leave a commit-pinned plugin pinned by `sha`; it has no tags to point at.

## When it goes wrong

- **`VERSION_SYNC`:** one of the version fields or the CHANGELOG still has the old version.
- **`REPO_SYNC`:** the repo is behind sidecut-agentskills. Run `bunx sidecut-sync` and commit what it changes with the release.
- **`CI_RELEASE` or `REPO_SYNC` on `scripts/release.ts`:** the repo predates automatic releases. Run `bunx sidecut-sync` and copy `release.yml` from the template, together with the next version bump, so the first run publishes it. Remove any old release job from `check.yml`, such as one that calls `./.github/workflows/release.yml`, and any old release script and its tests. The ZIP is now named `<plugin-id>-<version>.zip`. A public repo runs the job on `ubuntu-24.04` without sidecut-ops' setup action.
- **The Release run says the tag is on another commit:** a hand-made tag got there first. Bump to the next version instead of moving it.
- **`scripts/check.sh` says the entry needs a pinned ref:** the `sha` is short or `ref` isn't `main`. Use the full 40-character commit.
- **The new version doesn't appear:** confirm the tag or commit exists on GitHub and both marketplace entries name it, then wait for the next sync.

## Done when

Both marketplace entries name the new tag or commit, a tag release is published with its ZIP and checksum, and a new session shows the plugin at the new version.

## References

| Read | When |
| --- | --- |
| [marketplace.md](references/marketplace.md) | Adding or updating a marketplace entry |
