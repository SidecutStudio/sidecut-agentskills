# sidecut-agentskills

This repo ships the Sidecut Agentskills plugin, the template every Sidecut plugin repo starts from, and `sidecut-check`, the house-style checker those repos run. It follows its own house style, which `bun run style` checks.

## Commands

| Command | Does |
| --- | --- |
| `bun run build` | Bundles the MCP server into `plugins/sidecut-agentskills/server/index.mjs` |
| `bun run check` | Runs everything CI runs: Biome, types, the house-style checker, tests and the stale-bundle check |
| `bun run fix` | Formats and fixes what Biome can |
| `bun run new` | Creates a new plugin repo from the template, for example `bun run new plugin sidecut-notes --description ... --long-description ... --keywords a,b,c` |
| `bun run style` | Checks this repo against the house style |
| `bun run test` | Runs the tests, including one that breaks each checker rule on purpose |

## Layout

```text
plugins/sidecut-agentskills/
  server/src/              MCP server, generator (scaffold.ts) and checker (check/)
  server/data/             house style, patterns and the templates the generator copies
  skills/                  the plugin's skills
  evals/                   trigger and near-miss evals for the skills
scripts/                   new.ts and check.ts, the commands behind bun run new and sidecut-check
tests/                     checker and template tests
```

## Rules

- The house style lives in `plugins/sidecut-agentskills/server/data/house-style.md`. Change a rule there, in the checker and in the templates together, and add a test to `tests/check.test.ts` for any rule the checker enforces.
- A freshly generated repo has to pass its own `bun run check`; `tests/check.test.ts` proves it on every run.
- Run `bun run build` after changing anything in `server/src/`, and commit the bundle.
- Other repos depend on this one by tag for `sidecut-check`, so a change to a checker rule is a new version.

<!-- solo-workflow:start -->
## Solo Workflow

This project uses Solo Workflow (settings in `solo-workflow.toml`). The owner asks in plain words
and doesn't name skills: load the Solo skill that fits before starting the work, or the
`solo-workflow` skill when it's unclear which one fits.
<!-- solo-workflow:end -->
