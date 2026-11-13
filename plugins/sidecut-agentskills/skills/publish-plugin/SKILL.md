---
name: publish-plugin
description: "Publishes a new version of a Sidecut plugin through the sidecut-plugins marketplace, with the version, CHANGELOG and both listings in step. Use when the user says ship, release or publish a plugin, or wants it to show up in Claude Code or Codex. Not for merging a change to the plugin's code (use Solo Workflow's finish)."
---

# Publish plugin

Produces a tagged release of the plugin that the sidecut-plugins marketplace serves to Claude Code and Codex.

## Before you start

- The change to publish is merged to `main` and `check_plugin` reports no problems there.
- Decide the version with the user: a fix is a patch, a new skill or tool is a minor version, and a renamed or removed skill or tool is a major version once the plugin is past 1.0.

## Steps

1. On a branch, set the new version in `plugins/<plugin-id>/.claude-plugin/plugin.json`, `plugins/<plugin-id>/plugin.json` and `package.json`.
2. Add a CHANGELOG entry for it at the top, with today's date and one line per change under Added, Changed, Fixed or Removed. Copy it to the plugin's CHANGELOG so the two stay identical.
3. Run `bun run check`, then merge through `solo-workflow:finish`.
4. Tag the merge commit `v<version>` and push the tag.
5. In the `sidecut-plugins` repo, point the plugin's entries in `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` at the new tag, following [marketplace.md](references/marketplace.md). Merge that change the same way.
6. After the marketplace syncs, start a new Claude Code session and confirm the plugin's skills show the new version.

## Rules

- Never install the plugin locally to try it; the marketplace copy is the one people get.
- Release only from `main`, and only a commit whose checks passed.

## When it goes wrong

- **`VERSION_SYNC`:** one of the version fields or the CHANGELOG still has the old version.
- **The new version doesn't appear:** confirm the tag exists on GitHub and the marketplace entry names it, then wait for the next sync.

## Done when

The tag exists, both marketplace entries name it, and a new session shows the plugin at the new version.

## References

| Read | When |
| --- | --- |
| [marketplace.md](references/marketplace.md) | Adding or updating a marketplace entry |
