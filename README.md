# Sidecut Demo

Shows how a Sidecut plugin is put together.

## What it does

| Skill | Does |
| --- | --- |
| `demo-check-status` | Checks that the Sidecut Demo MCP server is running and reports its version. |

## Install

In Claude Code, run `/plugin install sidecut-demo@sidecut-plugins`. In Codex, run `codex plugin add sidecut-demo@sidecut-plugins`.

## Use

- "Check that Sidecut Demo is working."

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIDECUT_SKILL_LOG` | off | Set to `1` to keep the local usage log described under Privacy |

In Codex, the usage log is a plugin hook, and Codex runs plugin hooks only after you trust them. Codex asks again whenever a hook changes.

## Privacy

The plugin keeps a usage log only when you set `SIDECUT_SKILL_LOG=1`, and never when `DO_NOT_TRACK=1` is set or it runs in CI. Each time one of its skills runs in Claude Code or Codex, it adds one line to `~/.sidecut/skill-log.jsonl` with the fields `time`, `plugin`, `skill` and `host`. Nothing is sent anywhere.

## Develop

The commands are in `AGENTS.md` at the root of the repo.

## License

MIT. See [LICENSE](LICENSE).
