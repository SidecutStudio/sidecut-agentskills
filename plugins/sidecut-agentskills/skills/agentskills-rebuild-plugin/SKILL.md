---
name: agentskills-rebuild-plugin
description: "Rebuilds an existing plugin repo so it follows the Sidecut house style, keeping everything it does and proving nothing was lost. Use when the user wants an older plugin brought up to the template, cleaned of drift, or moved onto the Sidecut layout. Not for one change to a plugin that already passes `check_plugin` (use `agentskills-write-skill` or `agentskills-build-mcp-server`)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Rebuild plugin

Produces the same plugin in the house style on a branch, with a before-and-after comparison that shows its tools, skills and checks still behave the same.

## Before you start

- Work on a new branch. Merge only through `solo-workflow:finish`, and only when the comparison holds.
- Read the "Repo layout" and "Plugin layout" sections of `get_house_style`. A repo that ships a plugin next to other work, such as `sidecut-ops`, keeps its own top level; only `plugins/<plugin-id>/` changes.

## Steps

1. Record the plugin as it is now, following [parity.md](references/parity.md): its skills and their trigger requests, its tools and their output on fixed inputs, its hooks and its required checks.
2. Call `check_plugin` and keep the list; it shows most of what has to change.
3. Call `scaffold_plugin` into a temporary folder with the plugin's id, description and keywords. Copy in whichever generated files the plugin lacks: manifests, MCP files, hook, icon, CI workflow.
4. Rewrite each skill with `agentskills-write-skill`. Read the old skill to list what it covers, then write the new one from that list.
5. Move the server's logic into `server/src/` and bundle it with `bun run build`. Keep tool names and outputs, except where the house style says otherwise; list every change.
6. Delete what the house style has no place for: extra manifests, duplicate MCP files, commands, unused scripts and stale docs.
7. Run `bun run check` until it passes.
8. Repeat the recording from step 1 on the new version and compare the two. Write down every difference and why it is there.
9. Hand the rebuilt repo, its commit and the list of differences to the `reviewer` subagent, which reads it without your context. In Codex it is `agentskills_reviewer`; if the project's `.codex/agents/agentskills-reviewer.toml` is missing, copy it from this plugin's `codex/agents/` first. Fix what it finds and run `bun run check` again.

## Rules

- Nothing is copied over as it was; text, layout and names follow the house style.
- A behavior that changes, such as a renamed tool, goes in the CHANGELOG under Changed with the version bump that `agentskills-publish-plugin` makes.

## When it goes wrong

- **A tool's output differs and the house style doesn't explain it:** that is a regression. Fix the port before going on.
- **A skill no longer triggers on one of its recorded requests:** fix its description with `agentskills-write-skill`, then rerun that request.

## Done when

`bun run check` passes on the branch and the comparison shows the same tools, skills and checks, with every difference explained.

## References

| Read | When |
| --- | --- |
| [parity.md](references/parity.md) | Recording the plugin before and after |
