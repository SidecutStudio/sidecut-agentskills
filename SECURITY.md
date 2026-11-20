# Security

<!-- sidecut:start house-style -->

## Reporting a vulnerability

Report it privately to Sidecut Studio through a GitHub security advisory on SidecutStudio/sidecut-agentskills, or through [sidecut.dev](https://sidecut.dev). Don't open a public issue or pull request for it. Include what you found, how to reproduce it and the plugin version.

<!-- sidecut:end house-style -->

## What the plugin runs

- **MCP server:** `node` runs `server/index.mjs` on your machine. `scaffold_plugin` and `add_skill` write files only into the folder you give them, and refuse a folder that already has files. `check_plugin` reads the repo you give it, builds its server with that repo's `esbuild` in a temporary folder and starts it with only `PATH`, `HOME`, temp and locale variables, so it sees no tokens. Nothing makes network calls.
- **Usage log hook:** unless `SIDECUT_SKILL_LOG=0`, `DO_NOT_TRACK=1` or CI is set, a hook writes one line per skill run to `~/.sidecut/skill-log.jsonl`. It sends nothing anywhere.
- **`sidecut-check`:** other repos run it from this package during `npm run check`. It reads that repo, builds its MCP server into a temporary folder and starts the bundle to list its tools.
