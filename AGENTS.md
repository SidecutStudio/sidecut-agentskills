# sidecut-demo

This repo ships the Sidecut Demo plugin for Claude Code and Codex. It follows the Sidecut house style, which `bun run style` checks.

## Commands

| Command | Does |
| --- | --- |
| `bun run build` | Bundles the MCP server into `plugins/sidecut-demo/server/index.mjs`, writes its bundled licences and the Codex profile of each subagent |
| `bun run check` | Runs everything CI runs: Biome, types, the house-style checker, tests and the stale-bundle check |
| `bun run fix` | Formats and fixes what Biome can |
| `bun run style` | Checks the repo against the Sidecut house style |
| `bun run test` | Runs the tests |

## Layout

```text
plugins/sidecut-demo/   the plugin; the only folder that gets installed
scripts/               build-server.ts, the same in every Sidecut plugin repo
tests/                 tests for the plugin and its MCP server
.github/workflows/     CI, using sidecut-ops' runner picker
```

## Rules

<!-- sidecut:start house-style -->
- Run `bun run build` after changing anything in a plugin's `server/src/` or `agents/`, and commit what it writes.
- Any change under `plugins/` bumps the version in both manifests and `package.json` and adds a CHANGELOG entry.
- Blocks marked `sidecut:start` and the files sidecut-agentskills owns come from its templates. Change them there, then run `bunx sidecut-sync` here; list a deliberate difference under `sidecut.keep` in `package.json` with the reason.
<!-- sidecut:end house-style -->

<!-- solo-workflow:start -->
<!-- solo-workflow:end -->
