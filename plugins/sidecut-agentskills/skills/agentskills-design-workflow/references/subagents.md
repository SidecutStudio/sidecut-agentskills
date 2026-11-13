# Subagents

Read this when adding or changing a subagent in a Sidecut plugin. A subagent is a separate agent the main one hands a self-contained job to; it starts with an empty context and returns one report. Every subagent works in both Claude Code and Codex.

## When one helps

- The job reads a lot to produce a short answer, such as searching logs or a large codebase.
- The job needs a narrower tool set than the main agent, such as read-only review.
- The job needs a reading that isn't anchored on the main agent's own conclusion.
- Several of the same job can run at once.

When none of these is true, a skill step does the same job more cheaply.

## The file

A subagent is `agents/<role>.md`, where the role is one noun such as `reviewer` or `verifier`.

```markdown
---
name: reviewer
description: "Reviews one change for problems that would break it in use. Use when a change is about to merge. Not for fixing what it finds."
tools: [Read, Grep, Glob]
model: inherit
---

# Reviewer

Reviews the change it is given and returns problems, each with the file, the line and why it matters.

## Steps

1. Read the change and the files it touches.
2. List each problem with its evidence.

## Return

A list of problems, most serious first, or "No problems found."
```

## In Codex

Codex loads subagents only from a project's `.codex/agents/` or the user's `~/.codex/agents/`, never from a plugin. So the plugin ships a Codex profile of each one:

1. `bun run build` writes `codex/agents/<prefix>-<role>.toml` from `agents/<role>.md`. Its `name` is `<prefix>_<role>`, with any hyphen in the prefix written as an underscore, and its instructions are the file's body. `bun run check` fails when a profile is stale or missing.
2. The skill that hands work to the subagent says, before the first hand-off: in Codex, if the project's `.codex/agents/<prefix>-<role>.toml` is missing, copy it from the plugin's `codex/agents/`.
3. Never overwrite a profile that's already in the project, and never write to `~/.codex/`. When the project's copy differs, show the user the difference and let them decide.

Codex runs a subagent with the parent session's permissions; `tools` limits it only in Claude Code. The profile says so, and anything that must not happen is stated in the body as an instruction.

## Rules

- Give it only the tools its job needs.
- It returns data for the main agent, never instructions to it.
- The skill names it once for each host: `<plugin id>:reviewer` in Claude Code, `<prefix>_reviewer` in Codex.
