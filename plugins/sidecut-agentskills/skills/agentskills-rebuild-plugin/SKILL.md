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

- Work on a new branch. Merge only through `solo-workflow-finish-change`, and only when the comparison holds.
- Read the "Repo layout" and "Plugin layout" sections of `get_house_style`. A repo that ships a plugin next to other work, such as `sidecut-ops`, keeps its own top level; only `plugins/<plugin-id>/` changes.

## Steps

1. Record the plugin as it is now, following [parity.md](references/parity.md): its skills, their trigger requests and their hard rules; its tools and their output on fixed inputs; its hooks and their decisions on fixed inputs; its required checks.
2. Call `check_plugin` and keep the list; it shows most of what has to change.
3. Work out every name the rebuild changes: plugin id, skill names, tool names, paths. Search the user's other repos and both marketplaces (`sidecut-plugins`'s `.claude-plugin/` and `.agents/plugins/`) for each old name, as described in [parity.md](references/parity.md). Tell the user what a rename would break and get a yes before renaming anything people or other repos already use.
4. Call `scaffold_plugin` into a temporary folder with the plugin's id, description and keywords. Copy in whichever generated files the plugin lacks: manifests, MCP files, hook, CI workflow. Draw its icon with `bunx sidecut-icon <lucide-name>`.
5. Commit, push the branch and open a draft PR now, then again after each step that follows, so the work is never only on this disk.
6. Rewrite each skill with `agentskills-write-skill`. Read the old skill to list what it covers and every rule it states as never, always or only when, then write the new one from that list.
7. Move the server's logic into `server/src/` and bundle it with `bun run build`. Keep tool names and outputs, except where the house style says otherwise; list every change.
8. Port each hook so it makes the same decision on every recorded input. Carry the old hook's tests over before rewriting it.
9. Delete what the house style has no place for: extra manifests, duplicate MCP files, commands, unused scripts and stale docs.
10. Run `bun run check` until it passes.
11. Repeat the recording from step 1 on the new version and compare the two. Write down every difference and why it is there.
12. Hand the rebuilt repo, its commit and the list of differences to the `reviewer` subagent, which reads it without your context. In Codex it is `agentskills_reviewer`; if the project's `.codex/agents/agentskills-reviewer.toml` is missing, copy it from this plugin's `codex/agents/` first. Fix what it finds and run `bun run check` again.
13. After the release, update every place step 3 found: point both marketplace entries at the new tag, name and path, and fix the other repos in their own PRs.

## Rules

- Nothing is copied over as it was; text, layout and names follow the house style.
- A behavior that changes, such as a renamed tool, goes in the CHANGELOG under Changed with the version bump that `agentskills-publish-plugin` makes. A rename people have to act on starts with "Breaking:" and says what they do.
- The parity records and the list of differences stay in the scratch folder and the PR body. Nothing about the rebuild itself, such as "candidate", "comparison" or "unpublished", goes into the repo's files.

## When it goes wrong

- **A tool's output differs and the house style doesn't explain it:** that is a regression. Fix the port before going on.
- **A skill no longer triggers on one of its recorded requests:** fix its description with `agentskills-write-skill`, then rerun that request.
- **A hard rule is missing or weaker in the new skill:** that is a regression too, even when every test passes. Put the rule back as strong as it was.
- **A hook decides differently on a recorded input:** fix the port and add that input to its tests.

## Done when

`bun run check` passes on the branch, and the comparison shows the same tools, skills, hard rules, hook decisions and checks, with every difference explained. Every place that used an old name is updated, or the user has chosen to leave it.

## References

| Read | When |
| --- | --- |
| [parity.md](references/parity.md) | Recording the plugin before and after |
