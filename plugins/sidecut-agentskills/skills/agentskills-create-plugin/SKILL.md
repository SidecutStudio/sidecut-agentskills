---
name: agentskills-create-plugin
description: "Creates a new Sidecut plugin repo from the template, with Claude Code and Codex manifests, a bundled MCP server and a first skill. Use when the user wants a new plugin, a new repo for agent tooling, or something new packaged for the Sidecut marketplace. Not for changing a plugin that already exists (use `agentskills-rebuild-plugin` or `agentskills-write-skill`)."
---

# Create plugin

Produces a new plugin repo that passes `bun run check` on its first commit and loads in Claude Code and Codex.

## Before you start

- Agree four things with the user, and only these: the plugin id (`sidecut-<name>`), a one-sentence description of at most 120 characters, a 2 or 3 sentence description for the Codex listing, and 3 to 8 lowercase keywords.
- Test the name by saying it cold: two plain words someone would search for. Check that no well-known project uses it.
- The repo goes in `~/Developer/<plugin-id>` unless the user names another folder. The folder has to be empty or missing.

## Steps

1. Call `scaffold_plugin` with the absolute folder path and the four agreed values.
2. In the new folder, run `bun install`, `bun run fix`, `bun run build` and `git init`, in that order.
3. Run `bun run check`. It passes on a fresh repo; if it doesn't, fix the cause before going on.
4. Load the plugin for one session with `claude --plugin-dir <folder>/plugins/<plugin-id>` and run its `check-status` skill. The new plugin's status tool answers with its name and version.
5. Ask the user before creating the GitHub repo. On a yes, create `SidecutStudio/<plugin-id>` as a private repo, push `main`, then run `solo-workflow:setup` to fill the Solo Workflow section of `AGENTS.md`.
6. Add the plugin's real skills with `agentskills-write-skill` and its real tools with `agentskills-build-mcp-server`. Keep `check-status` while the status tool is the server's only tool.

## Rules

- Never install the plugin into the user's Claude Code; `--plugin-dir` loads it for one session and changes nothing.
- Leave the generated manifests, MCP files, hook and CI workflow as written. `check_plugin` reports anything that drifts from them.
- Publishing is a separate step: `agentskills-publish-plugin`.

## When it goes wrong

- **Folder not empty:** `scaffold_plugin` refuses. Ask the user for another folder; never clear one.
- **`bun install` fails:** the template's dependencies come from npm and GitHub, so check the network once, report the error and stop.
- **`bun run check` fails on a fresh repo:** that is a bug in the template. Report the problem lines from `bun run style` to the user rather than patching the new repo by hand.

## Done when

`bun run check` passes in the new repo and `check-status` returns the plugin's version in a `--plugin-dir` session.
