# sidecut-agentskills

This repo ships the Sidecut Agentskills plugin, the template every Sidecut plugin repo starts from, and `sidecut-check`, the house-style checker those repos run. It follows its own house style, which `npm run style` checks.

## Commands

| Command | Does |
| --- | --- |
| `npm run build` | Bundles the MCP server into `plugins/sidecut-agentskills/server/index.mjs`, writes its bundled licences and the reviewer's Codex profile |
| `npm run check` | Runs everything CI runs: Biome, types, the house-style checker, tests and the stale-bundle check |
| `npm run fix` | Formats and fixes what Biome can |
| `npm run icon` | Draws a plugin icon in the Sidecut style from a Lucide icon name, for example `npm run icon blocks`; other repos run it as `npm exec --no -- sidecut-icon` |
| `npm run new` | Creates a new plugin repo from the template, for example `npm run new plugin sidecut-notes --description ... --long-description ... --keywords a,b,c` |
| `npm run style` | Checks this repo against the house style |
| `npm run eval` | Runs behavioural evals with Claude Code (explicit, may use model credits) |
| `npm run test` | Runs the tests, including one that breaks each checker rule on purpose |

## Layout

```text
plugins/sidecut-agentskills/
  server/src/              MCP server, generator (scaffold.ts) and checker (check/)
  server/data/             house style, patterns and the templates the generator copies
  skills/                  the plugin's skills
  agents/                  the reviewer subagent; codex/agents/ holds its generated Codex profile
scripts/                   new.ts, check.ts and sync.ts (npm run new, sidecut-check, sidecut-sync), and release.ts, which the Release workflow runs
evals/                     development-only trigger and near-miss cases
tests/                     checker and template tests
```

## Rules

<!-- sidecut:start house-style -->
- Run `npm run build` after changing anything in a plugin's `server/src/` or `agents/`, and commit what it writes.
- Any change under `plugins/` bumps the version in both manifests and `package.json` and adds a CHANGELOG entry.
- Blocks marked `sidecut:start` and the files sidecut-agentskills owns come from its templates. Change them there, then run `npm exec --no -- sidecut-sync` here; list a deliberate difference under `sidecut.keep` in `package.json` with the reason.
- A bundled registered connector uses `.app.json` and the Codex manifest's `apps` field; any direct MCP fallback uses the same declaration name and stays remote. Verify the connector id and endpoint from its registration.
<!-- sidecut:end house-style -->

- The house style lives in `plugins/sidecut-agentskills/server/data/house-style.md`. Change a rule there, in the checker and in the templates together, and add a test to `tests/check.test.ts` for any rule the checker enforces.
- A freshly generated repo has to pass its own `npm run check`; `tests/check.test.ts` proves it on every run.
- Other repos depend on this one by tag for `sidecut-check`, so a change to a checker rule is a new version.

<!-- solo-workflow:start -->
## Sidecut Solo

Follow `solo-workflow.toml`. Use the relevant Solo skill, or `solo` to route the request.
<!-- solo-workflow:end -->
