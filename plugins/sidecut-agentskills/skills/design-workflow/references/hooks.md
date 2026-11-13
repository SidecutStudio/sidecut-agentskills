# Hooks

Read this when adding or changing a hook in a Sidecut plugin. A hook is a script the host runs at a fixed moment, such as after a tool call or when a session starts.

## Registering a hook

Hooks live in `hooks/hooks.json`, one entry per event:

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

The script's file name starts with its event in kebab-case, then what it does: `session-start-load-rules.mjs`.

## Writing the script

- Node ESM with only built-in `node:` modules, so it runs without an install.
- Read the event as JSON from standard input. Find the plugin's own files from `import.meta.url`.
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
| `SessionEnd` | When the session ends |

Prefer `PostToolUse` with a narrow matcher. A `SessionStart` or `UserPromptSubmit` hook runs in every session and every prompt, so it costs time even when the plugin isn't involved.

## Testing it

Add a test that runs the script with `spawnSync`, passes sample JSON on standard input with a clean environment and a temporary `HOME`, and checks what it wrote. The template's usage-log tests show the pattern.
