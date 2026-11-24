# Sidecut Agentskills

Builds, checks and ships Claude Code and Codex plugins, skills and MCP servers that all follow one house style.

Ask for a plugin and you get a whole repo: manifests for both hosts, a bundled MCP server, a first skill, tests, CI and an automatic release, all passing on the first commit. From then on, a checker that every plugin repo runs in CI points at each break with its file, line and fix, and `sidecut-sync` keeps the shared files current in every repo from one pinned release. Your agent does the work, and the house style makes every plugin you ship look like it came from one hand.

## What it does

| Skill | Does |
| --- | --- |
| `agentskills` | Routes a request about plugins, skills, MCP servers or plugin repos to the right Agentskills skill. |
| `agentskills-build-mcp-server` | Builds the MCP side of a plugin: the tools in its bundled server, or a connection to a hosted server. |
| `agentskills-create-plugin` | Creates a new plugin repo from the Agentskills template, with Claude Code and Codex manifests, a bundled MCP server and a first skill. |
| `agentskills-design-workflow` | Designs what a plugin does on its own: hooks that run at set moments, subagents it hands work to, and the CI jobs that check it. |
| `agentskills-publish-plugin` | Publishes a new version of a plugin through its marketplace, with the version, CHANGELOG and both listings in step. |
| `agentskills-rebuild-plugin` | Rebuilds an existing plugin repo so it follows the house style, keeping everything it does and proving nothing was lost. |
| `agentskills-review-plugin` | Reviews a plugin repo against the house style, listing what breaks it most serious first without changing anything. |
| `agentskills-show-usage` | Shows which plugin skills ran in Claude Code and Codex, from the local skill log. |
| `agentskills-write-skill` | Writes one skill for a plugin, new or rewritten, that triggers on the right requests and follows the house style. |

The MCP server behind them has five tools: `get_house_style` and `get_patterns` return the rules and the reasons for them, `check_plugin` checks a repo against them, and `scaffold_plugin` and `add_skill` write new plugins and skills from the template.

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

In Antigravity, install the plugin folder from a clone:

```bash
git clone https://github.com/SidecutStudio/sidecut-agentskills
agy plugin install ./sidecut-agentskills/plugins/sidecut-agentskills
```

## Use

- "Make me a plugin that keeps my release checklist and runs it before every tag."
- "Is my notes plugin ready to publish?"
- "Bring my old deploy plugin up to the Agentskills template without losing anything."

The repos it makes run four commands from it: `npm exec --no -- sidecut-check` checks a repo against the house style, `npm exec --no -- sidecut-sync` applies the shared files and tool versions from the pinned release, `sidecut-icon` draws a Sidecut-style icon, and `sidecut-version` syncs the version across manifests and changelogs. Every plugin it makes also installs in Antigravity: sync writes its `.antigravity-plugin/plugin.json`, `mcp_config.json` and `hooks.json` from the Claude Code and Codex files.

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIDECUT_SKILL_LOG` | on | Set to `0` to turn off the local usage log described under Privacy |

The first time you make a plugin, `scaffold_plugin` asks who publishes it and saves the answers to `~/.config/agentskills/settings.json`:

| Setting | Default |
| --- | --- |
| GitHub owner and author | Asked once |
| Plugin-id prefix, such as `acme-` | None |
| Marketplace | The plugin's own repo, so anyone can install it from GitHub |
| CI | GitHub-hosted `ubuntu-24.04` |
| Licence and brand color | MIT, `#3B82F6` |

Each new repo records its answers in `.agentskills.json`, which the checker and sync read. Sidecut Studio's own values live in one optional profile, `sidecut`, that nothing uses unless you ask for it.

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
