# Sidecut Agentskills

Creates, checks and publishes Sidecut plugins, skills and MCP servers that all follow one house style.

## What it does

| Skill | Does |
| --- | --- |
| `agentskills` | Routes a request about Sidecut plugins, skills, MCP servers or plugin repos to the right Sidecut Agentskills skill. |
| `agentskills-build-mcp-server` | Builds the MCP side of a Sidecut plugin: the tools in its bundled server, or a connection to a hosted server. |
| `agentskills-create-plugin` | Creates a new Sidecut plugin repo from the template, with Claude Code and Codex manifests, a bundled MCP server and a first skill. |
| `agentskills-design-workflow` | Designs what a Sidecut plugin does on its own: hooks that run at set moments, subagents it hands work to, and the CI jobs that check it. |
| `agentskills-publish-plugin` | Publishes a new version of a Sidecut plugin through the sidecut-plugins marketplace, with the version, CHANGELOG and both listings in step. |
| `agentskills-rebuild-plugin` | Rebuilds an existing plugin repo so it follows the Sidecut house style, keeping everything it does and proving nothing was lost. |
| `agentskills-review-plugin` | Reviews a Sidecut plugin repo against the house style, listing what breaks it most serious first without changing anything. |
| `agentskills-show-usage` | Shows which Sidecut plugin skills ran in Claude Code and Codex, from the local skill log. |
| `agentskills-write-skill` | Writes one skill for a Sidecut plugin, new or rewritten, that triggers on the right requests and follows the house style. |

Its MCP server provides the tools behind them: `get_house_style` and `get_patterns` return the rules and the reasons for them, `check_plugin` checks a repo against them, and `scaffold_plugin` and `add_skill` write new plugins and skills from the template.

## Install

In Claude Code, add this repo's marketplace, then install the plugin:

```text
/plugin marketplace add SidecutStudio/sidecut-agentskills
/plugin install sidecut-agentskills@sidecut-agentskills
```

In Codex, run:

```bash
codex plugin marketplace add SidecutStudio/sidecut-agentskills
codex plugin add sidecut-agentskills@sidecut-agentskills
```

## Use

- "Make me a new Sidecut plugin that tracks my Lovable credits."
- "Is my sidecut-demo plugin ready to publish?"
- "Bring sidecut-ci up to the Sidecut template without losing anything."

Plugin repos also run two commands from it. `npm exec --no -- sidecut-check` checks a repo against the house style, and `npm exec --no -- sidecut-sync` applies the standards from the pinned installed release: the files and marked blocks the house style shares, and the shared tool versions.

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIDECUT_SKILL_LOG` | on | Set to `0` to turn off the local usage log described under Privacy |

The rules sync that rebuilt `~/.codex/AGENTS.md` from `~/.claude/rules` moved to the separate `sidecut-rules` plugin.

In Codex, the usage log is a plugin hook, and Codex runs plugin hooks only after you trust them. Codex asks again whenever a hook changes.

## Privacy

Nothing in the plugin makes network calls or sends data anywhere. What it runs on your machine:

| Part | Runs | Reads and writes |
| --- | --- | --- |
| MCP server | `node` runs `server/index.mjs` locally | `get_house_style`, `get_patterns` and `check_plugin` only read. `scaffold_plugin` and `add_skill` write files only into the folder you name, and refuse one that already has files |
| `check_plugin` | Read-only `git` commands in the repo you name, then that repo's own `esbuild` to build its server into a temporary folder, then that server, started with only `PATH`, `HOME`, temp and locale variables so it sees no tokens | Reads the repo; deletes the temporary folder after |
| Usage log hook | `node` runs `hooks/post-tool-use-skill-log.mjs` after a skill runs | Adds one line to `~/.sidecut/skill-log.jsonl` |

The usage log is on unless you set `SIDECUT_SKILL_LOG=0`, and never runs when `DO_NOT_TRACK=1` is set or in CI. Each line has the fields `time`, `plugin`, `skill` and `host`.

## Develop

The commands are in `AGENTS.md` at the root of the repo.

## License

MIT. See [LICENSE](LICENSE).
