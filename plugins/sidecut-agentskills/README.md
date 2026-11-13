# Sidecut Agentskills

Creates, checks and publishes Sidecut plugins, skills and MCP servers that all follow one house style.

## What it does

| Skill | Does |
| --- | --- |
| `build-mcp-server` | Builds the MCP side of a Sidecut plugin: the tools in its bundled server, or a connection to a hosted server. |
| `create-plugin` | Creates a new Sidecut plugin repo from the template, with Claude Code and Codex manifests, a bundled MCP server and a first skill. |
| `design-workflow` | Designs what a Sidecut plugin does on its own: hooks that run at set moments, subagents it hands work to, and the CI jobs that check it. |
| `publish-plugin` | Publishes a new version of a Sidecut plugin through the sidecut-plugins marketplace, with the version, CHANGELOG and both listings in step. |
| `rebuild-plugin` | Rebuilds an existing plugin repo so it follows the Sidecut house style, keeping everything it does and proving nothing was lost. |
| `review-plugin` | Reviews a Sidecut plugin repo against the house style, listing what breaks it most serious first without changing anything. |
| `start` | Routes a request about Sidecut plugins, skills, MCP servers or plugin repos to the right Sidecut Agentskills skill. |
| `write-skill` | Writes one skill for a Sidecut plugin, new or rewritten, that triggers on the right requests and follows the house style. |

Its MCP server provides the tools behind them: `get_house_style` and `get_patterns` return the rules and the reasons for them, `check_plugin` checks a repo against them, and `scaffold_plugin` and `add_skill` write new plugins and skills from the template.

## Install

In Claude Code, run `/plugin install sidecut-agentskills@sidecut-plugins`. In Codex, run `codex plugin add sidecut-agentskills@sidecut-plugins`.

## Use

- "Make me a new Sidecut plugin that tracks my Lovable credits."
- "Is my sidecut-demo plugin ready to publish?"
- "Bring sidecut-ci up to the Sidecut template without losing anything."

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIDECUT_SKILL_LOG` | off | Set to `1` to keep the local usage log described under Privacy |

## Privacy

The plugin keeps a usage log only when you set `SIDECUT_SKILL_LOG=1`, and never when `DO_NOT_TRACK=1` is set or it runs in CI. Each time one of its skills runs in Claude Code, it adds one line to `~/.sidecut/skill-log.jsonl` with the fields `time`, `plugin`, `skill` and `host`. Nothing is sent anywhere.

## Develop

The commands are in `AGENTS.md` at the root of the repo.

## License

MIT. See [LICENSE](LICENSE).
