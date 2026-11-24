---
name: agentskills-create-plugin
description: "Creates a new plugin repo from the Agentskills template, with Claude Code and Codex manifests, a bundled MCP server and a first skill. Use when the user wants a new plugin, a new repo for agent tooling, or something new packaged for a plugin marketplace. Not for changing a plugin that already exists (use `agentskills-rebuild-plugin` or `agentskills-write-skill`)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Create plugin

Produces a new plugin repo that passes `npm run check` on its first commit and loads in Claude Code, Codex and Antigravity.

## Before you start

- Propose all five from the brief and existing guidance. Ask together about unresolved choices that affect identity or scope. Follow `server/data/user-input.md` from the loaded plugin root. Settle these details: the plugin id (the settings' prefix, then the name), a one-sentence description of at most 120 characters, a 2 or 3 sentence description for the Codex listing, 3 to 8 lowercase keywords, and the [Lucide](https://lucide.dev/icons) icon for its mark.
- Test the name by saying it cold: two plain words someone would search for. Check that no well-known project uses it.
- The repo goes in a `<plugin-id>` folder next to the user's other repos unless they name another folder. The folder has to be empty or missing.

## Steps

1. Call `scaffold_plugin` with the absolute folder path, the id, both descriptions and the keywords. If it returns `needs: settings`, it wrote nothing: ask the user its questions together, once (the GitHub owner, the author, the id prefix, the marketplace and the CI mode), then call it again with their answers in `settings` and `save: true`. Later scaffolds reuse the saved answers and don't ask again.
2. In the new folder, run `npm install`, `npm run fix`, `npm run build` and `git init`, in that order.
3. Run `npm exec --no -- sidecut-icon <lucide-name>` to draw the plugin's icon with its agreed mark.
4. Run `npm run check`. It passes on a fresh repo; if it doesn't, fix the cause before going on.
5. Load the plugin for one session with `claude --plugin-dir <folder>/plugins/<plugin-id>` and run its `check-status` skill. The new plugin's status tool answers with its name and version.
6. Reuse permission covering the repository name and visibility. If it is missing, ask before creating the GitHub repo. Once authorized, create `<org>/<plugin-id>` with that visibility and push `main`. With the `sidecut` profile, also follow its workflow rows from `get_house_style` with `section: "Sidecut profile"`.
7. A repo scaffolded with the defaults already runs CI on `ubuntu-24.04` and lists itself as a marketplace, so it is ready to be public. A repo listed in a shared marketplace starts private; when the user wants anyone to be able to install it, make it public. Follow the Install source section of `get_house_style`: run every CI job on `ubuntu-24.04`, add both marketplace files and replace the README's Install section with the public steps. `npm run check` fails until all three are in place.
8. Add the plugin's real skills with `agentskills-write-skill` and its real tools with `agentskills-build-mcp-server`. Keep `check-status` while the status tool is the server's only tool.

Use `server/data/visual-reports.md` from the loaded plugin root when plugin or design alternatives need a visible comparison. Keep a routine scaffold result in chat.

## Rules

- Never install the plugin into the user's Claude Code; `--plugin-dir` loads it for one session and changes nothing.
- Leave the generated manifests, MCP files, hook and CI workflow as written. `check_plugin` reports anything that drifts from them.
- Publishing is a separate step: `agentskills-publish-plugin`.

## Resolve setup problems

- **Folder not empty:** `scaffold_plugin` refuses. Ask the user for another folder; never clear one.
- **`npm install` fails:** the template's dependencies come from npm and GitHub, so check the network once, report the error and stop.
- **`npm run check` fails on a fresh repo:** that is a bug in the template. Report the problem lines from `npm run style` to the user rather than patching the new repo by hand.

## Done when

`npm run check` passes in the new repo and `check-status` returns the plugin's version in a `--plugin-dir` session.
