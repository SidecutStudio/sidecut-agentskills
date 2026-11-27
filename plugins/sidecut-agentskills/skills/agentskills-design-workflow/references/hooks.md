# Hooks

Read this when adding or changing a hook in a plugin. A hook is a script the host runs at a fixed moment, such as after a tool call or when a session starts. Every hook runs in both Claude Code and Codex. Antigravity runs the usage log hook and any other script its root `hooks.json` names; see [Antigravity](#antigravity).

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
            "command": "node",
            "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/post-tool-use-skill-log.mjs"],
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

In Claude Code the interpreter goes in `command` and the script in `args`, so the hook starts on Windows without Git Bash. The Codex file uses `"matcher": "Bash"` and the one-line form, `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/post-tool-use-skill-log.mjs\""`; Codex fills in `${CLAUDE_PLUGIN_ROOT}` for plugin hooks.

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
- Treat the input as untrusted. A file path in it can contain `..` or point outside the project, so resolve it and check where it lands before reading or judging the file.
- Keep the work linear in the size of the input. A prompt can be a pasted megabyte, and the hook has five seconds; a scan that backtracks or rescans per match can run out of time.
- Don't parse shell commands to judge them. Quoting, `bash -lc`, wrappers and `$(...)` give endless forms, and each fix finds another. Refuse on words in the text, and decide anything subtler from state the plugin records or reads from the source, such as GitHub.
- A prompt hook sees text the user didn't write: pasted content, quoted lines, code, other sessions' and agents' messages, notifications the host adds. Act only on what the user typed themselves, such as an exact slash command on its own line.

## Blocking or adding context

A `PreToolUse` hook blocks a call by printing one JSON object and still exiting 0:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Writes outside the project are blocked."
  }
}
```

Both hosts read this form. The reason goes to the agent, so say what was blocked and what to do instead. A `SessionStart` or `UserPromptSubmit` hook adds context by printing it. Otherwise a hook prints nothing.

All hooks that match an event run at the same time, the user's own hooks included, and a deny from any one of them wins. Don't rely on another hook running first or seeing what this one did.

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

## Antigravity

Antigravity reads the `hooks.json` at the plugin root, not `hooks/`, and has its own events, tool names, input and output: read [its hooks docs](https://antigravity.google/docs/hooks/). A script runs there once that file names it, and the script has to tell Antigravity's input apart and answer in Antigravity's form, so opt one in only after it does. `sidecut-sync` then writes the script's entries from its `PreToolUse`, `PostToolUse`, `Stop` and `SessionStart` ones in `hooks/hooks.json`, as a group named for the script without its event prefix, with `Bash` as `run_command`, `Skill` and `Read` as file reads, `Edit` and `Write` as file writes, and `Grep` and `Glob` as Antigravity's searches. It leaves out the rest: Antigravity has no `UserPromptSubmit` or `SessionEnd`, a script that needs the user's latest prompt reads `lastUserInput` instead, and a handler with arguments besides the script, or a `SessionStart` matcher, has no exact equivalent. A script left with no entry drops out of the file, so name it again once its registration can carry over.

A blocking answer differs by host. A `PreToolUse` deny is `{"decision": "deny", "reason": ...}` there, and a `Stop` hook keeps the turn going with `"decision": "continue"` where Claude Code and Codex take `"block"`.

## Trust in Codex

Codex skips a plugin's hooks until the user trusts them, and asks again whenever a hook definition changes. The plugin's README says so under "Settings", so a hook that doesn't run isn't mistaken for a bug.

## Testing it

Both hosts read hooks when a session starts, so start a new session after changing `hooks.json`, `codex-hooks.json` or a script. In Claude Code, `claude --debug` logs each hook run and its output.

Add a test that runs the script with `spawnSync`, passes sample input from each host on standard input with a clean environment and a temporary `HOME`, and checks what it wrote. The template's usage-log tests show the pattern.
