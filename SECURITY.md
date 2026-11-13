# Security

<!-- sidecut:start house-style -->

## Reporting a vulnerability

Report it privately to Sidecut Studio through a GitHub security advisory on SidecutStudio/sidecut-demo, or through [sidecut.dev](https://sidecut.dev). Don't open a public issue or pull request for it. Include what you found, how to reproduce it and the plugin version.

<!-- sidecut:end house-style -->

## What the plugin runs

- **MCP server:** `node` runs `server/index.mjs` on your machine. It has no dependencies outside the bundle and makes no network calls unless a tool says it does.
- **Usage log hook:** when `SIDECUT_SKILL_LOG=1` is set, a hook writes one line per skill run to `~/.sidecut/skill-log.jsonl`. It sends nothing anywhere.
