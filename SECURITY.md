# Security

## Reporting a vulnerability

Report it privately to Sidecut Studio through a GitHub security advisory on SidecutStudio/sidecut-agentskills, or through [sidecut.dev](https://sidecut.dev). Don't open a public issue or pull request for it. Include what you found, how to reproduce it and the plugin version.

## What the plugin runs

- **MCP server:** `node` runs `server/index.mjs` on your machine. `scaffold_plugin` and `add_skill` write files only into the folder you give them, and refuse a folder that already has files. `check_plugin` reads the repo you give it and runs `bun build` in a temporary folder. Nothing makes network calls.
- **Usage log hook:** when `SIDECUT_SKILL_LOG=1` is set, a hook writes one line per skill run to `~/.sidecut/skill-log.jsonl`. It sends nothing anywhere.
- **`sidecut-check`:** other repos run it from this package during `bun run check`. It reads that repo, builds its MCP server into a temporary folder and starts the bundle to list its tools.
