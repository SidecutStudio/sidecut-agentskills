---
name: agentskills-design-workflow
description: "Designs what a Sidecut plugin does on its own: hooks that run at set moments, subagents it hands work to, and the CI jobs that check it. Use when the user wants something to happen automatically, work split across agents, or a plugin check added to CI. Not for a project's own agent rules or a repeated mistake in an app repo (use Solo Workflow's improve-workflow)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Design workflow

Produces the smallest mechanism that makes the behavior happen every time, in the plugin where it belongs.

## Before you start

- Ask the user what should happen, when, and what they see when it has happened.
- Read the "Hooks" and "Usage log" sections of `get_house_style`.

## Steps

1. Pick the mechanism from the table below, choosing the first row that works.
2. Build it:
   - **Skill step:** add the step with `agentskills-write-skill`.
   - **Hook:** follow [hooks.md](references/hooks.md).
   - **Subagent:** follow [subagents.md](references/subagents.md).
   - **CI job:** add a step or job to `.github/workflows/check.yml` and, when it gates merges, its job name to `required_checks` in `solo-workflow.toml`.
3. Add a test that fails without the change: a hook test that pipes sample input into the script, or a CI step that runs a command a test already covers.
4. Run `bun run check`, then try it in a `--plugin-dir` session.

| Need | Mechanism |
| --- | --- |
| The agent does something as part of a task | A step in the skill |
| Something runs at a fixed moment no matter what the agent decides | A hook |
| A self-contained job that needs its own context or a narrower tool set | A subagent |
| A check that has to pass before a merge | A CI job |

## Rules

- A hook is never a safety boundary; when it fails or is missing, everything carries on.
- Every hook has a timeout of 5 seconds or less and makes no network calls.
- Every hook and subagent works in both Claude Code and Codex: register hooks in both hook files, and ship each subagent's Codex profile with `bun run build`.
- CI uses the sidecut-ops runner picker and pins every action by SHA.

## When it goes wrong

- **A hook never fires:** check its event and matcher in `hooks.json` or `codex-hooks.json`, then run the script by hand with sample input. In Codex, check the user has trusted the plugin's hooks.
- **A hook slows every session:** move the work into a skill step or a CI job.
- **A CI job queues for a long time:** use `sidecut-ci:diagnose`.

## Done when

The behavior happens in a real session or CI run, a test covers it, and `bun run check` passes.

## References

| Read | When |
| --- | --- |
| [hooks.md](references/hooks.md) | Adding or changing a hook |
| [subagents.md](references/subagents.md) | Adding or changing a subagent |
