# Changelog

## [0.4.0] - 2026-11-13

### Changed

- `agentskills-rebuild-plugin` records each skill's hard rules (every never, always, only when, don't and must) and each hook's decisions on fixed inputs, and counts a weaker rule or a changed decision as a regression even when the tests pass.
- `agentskills-rebuild-plugin` finds every place outside the repo that uses a name the rebuild changes, asks before renaming anything already in use, and updates the marketplaces and other repos after the release.
- `agentskills-rebuild-plugin` pushes a draft PR early and after each step, and keeps parity records and rebuild notes out of the repo's files.
- Skills name a subagent as `<plugin id>:<role>` in Claude Code, and the checker accepts that form instead of reporting a missing skill.
- Skills and the checker point at Solo Workflow 0.20.0's skill names, `solo-workflow-configure-project` and `solo-workflow-finish-change`.

## [0.3.0] - 2026-11-13

### Added

- `sidecut-icon` (`bun run icon` here) draws a plugin's icon in Sidecut Builder's style: a near-black rounded tile, one white Lucide mark and Builder's orange full stop. A new plugin starts with a plain box mark, and `agentskills-create-plugin` asks which mark it should have.

### Changed

- Every plugin's `brandColor` is `#FF6B00`, Sidecut Builder's orange, and the checker enforces it. `scaffold_plugin` and `bun run new` no longer take a brand color.
- Each skill's `agents/openai.yaml` sets `icon_small` and `icon_large` to `../../assets/icon.png`, so Codex shows the plugin's icon beside its skills.
- Sidecut Agentskills has its own icon, a blocks mark.

## [0.2.1] - 2026-11-13

### Changed

- `agentskills` asks what a request's result is for before handing over, and sends a view drawn in the chat to `agentskills-build-mcp-server`.
- `agentskills-build-mcp-server` checks the tool in Codex as well as Claude Code, works with any repo's build and test commands, and has new references on testing in Codex and on views drawn in the chat.
- The tool-design reference says why tools take the project's path, to keep required inputs few, and to keep the field names of JSON a tool wraps.

### Fixed

- `check_plugin` no longer crashes on a folder inside a skill's `references/`, `examples/` or `scripts/`. It reports the folder as `SKILL_FILE_UNEXPECTED`.

## [0.2.0] - 2026-11-13

### Added

- The `reviewer` subagent, which `agentskills-review-plugin` and `agentskills-rebuild-plugin` hand work to. `bun run build` writes its Codex profile to `codex/agents/`, and the skills copy it into the project before the first use in Codex.
- Skill metadata for both hosts: `argument-hint`, `model` and `effort` in the frontmatter, pre-approved MCP tools in `allowed-tools`, and `brand_color` and the invocation policy in `agents/openai.yaml`. The checker enforces each.
- `hooks/codex-hooks.json`, so every hook also runs in Codex. The usage log counts a skill in Codex when Codex reads its `SKILL.md`.

### Changed

- Every skill name starts with the plugin's short name: `agentskills-write-skill`. The router is `agentskills`, replacing `start`.
- Codex reads `.codex-plugin/plugin.json` and a `mcp.json` that runs the server with `cwd: "."`. The root Agent Plugins 1.0 `plugin.json` is gone, because with it Codex loads none of the plugin's hooks.
- The hooks and subagents guidance covers Codex, which has both.

### Fixed

- The usage log records `codex` as the host in Codex; it used to say `claude-code` in both.
- `bun run build` follows a licence file that is a symlink.

## [0.1.2] - 2026-11-13

### Added

- Every plugin repo builds with `scripts/build-server.ts`, which also writes `server/THIRD_PARTY_LICENSES.txt` with the licence of each package the bundle inlines. It reads every file whose name starts with licence, license or copying, in any case, and falls back to the package's `license` field. The checker requires both.
- `bun run check` ends with `bun scripts/build-server.ts --check`, so a stale bundle or licence notice fails it.

### Fixed

- Display names keep acronyms in capitals, so `sidecut-ci` is `Sidecut CI`. The house style lists them.
- The template server finds its manifest from its source as well as its bundle.
- The checker's public-repo CI rule no longer skips a job that has no `runs-on`, reads jobs at any indentation, and its runner hint fits public repos.
- `bun run new` rejects a long description that isn't 2 or 3 sentences, as the checker does.
- A package bundled from a nested `node_modules` or Bun's isolated store is credited to itself, not the package above it.
- `publish-plugin`'s marketplace reference uses the HTTPS URL, which Claude Code can clone without SSH keys.

## [0.1.1] - 2026-11-13

### Changed

- The checker accepts a public repo's CI when every job runs on `ubuntu-24.04`, and the house style says so.

## [0.1.0] - 2026-11-12

### Added

- `build-mcp-server` skill.
- `create-plugin` skill.
- `design-workflow` skill.
- `publish-plugin` skill.
- `rebuild-plugin` skill.
- `review-plugin` skill.
- `start` skill.
- `write-skill` skill.
- `get_house_style`, `get_patterns`, `check_plugin`, `scaffold_plugin` and `add_skill` tools.
- Plugin and repo templates, and the `sidecut-check` command that other plugin repos run as `bun run style`.
- Local usage log, off unless `SIDECUT_SKILL_LOG=1` is set.
