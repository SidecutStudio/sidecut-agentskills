# Hooks

Read this when adding or changing a hook in a Sidecut plugin. A hook is a script the host runs at a fixed moment, such as after a tool call or when a session starts. Every hook runs in both Claude Code and Codex.

## Registering a hook

Claude Code reads `hooks/hooks.json` and Codex reads `hooks/codex-hooks.json`, which `.codex-plugin/plugin.json` names. Both files register the same scripts, each with that host's matcher:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Skill",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/post-tool-use-skill-log.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

The Codex file is the same except for `"matcher": "Bash"`. Codex fills in `${CLAUDE_PLUGIN_ROOT}` for plugin hooks, so the command is identical.

The script's file name starts with its event in kebab-case, then what it does: `session-start-load-rules.mjs`.

## Tool names in matchers

| Tool | Claude Code | Codex |
| --- | --- | --- |
| Shell command | `Bash` | `Bash` |
| File edit | `Edit`, `Write` | `apply_patch`, also matched by `Edit` and `Write` |
| Skill | `Skill` | none: Codex opens a skill by reading its `SKILL.md` with `Bash` |
| MCP tool | `mcp__<server>__<tool>` | `mcp__<server>__<tool>` |

A hook that reacts to a skill matches `Skill` in Claude Code and `Bash` in Codex, then checks the command for a read of the plugin's own `SKILL.md`. The usage log does exactly this.

## Writing the script

- Node ESM with only built-in `node:` modules, so it runs without an install.
- Read the event as JSON from standard input. Find the plugin's own files from `import.meta.url`.
- Tell the hosts apart by the input: Codex sends a `turn_id` with every hook and Claude Code doesn't.
- Wrap the work in `try` and always exit 0; a failing hook must never break the session.
- Print nothing unless the hook's job is to add context for the agent.
- Make no network calls.

## Choosing the event

| Event | Runs |
| --- | --- |
| `SessionStart` | When a session starts, resumes or is cleared |
| `UserPromptSubmit` | Before the agent sees each prompt |
| `PreToolUse` | Before a tool call; it can block the call |
| `PostToolUse` | After a tool call |
| `Stop` | When the agent finishes its turn |
| `SessionEnd` | When the session ends |

Both hosts have every event in this table. Prefer `PostToolUse` with a narrow matcher. A `SessionStart` or `UserPromptSubmit` hook runs in every session and every prompt, so it costs time even when the plugin isn't involved.

## Trust in Codex

Codex skips a plugin's hooks until the user trusts them, and asks again whenever a hook definition changes. The plugin's README says so under "Settings", so a hook that doesn't run isn't mistaken for a bug.

## Testing it

Add a test that runs the script with `spawnSync`, passes sample input from each host on standard input with a clean environment and a temporary `HOME`, and checks what it wrote. The template's usage-log tests show the pattern.
