# Subagents

Read this when adding or changing a subagent in a Sidecut plugin. A subagent is a separate agent the main one hands a self-contained job to; it starts with an empty context and returns one report.

## When one helps

- The job reads a lot to produce a short answer, such as searching logs or a large codebase.
- The job needs a narrower tool set than the main agent, such as read-only review.
- Several of the same job can run at once.

When none of these is true, a skill step does the same job more cheaply.

## The file

A subagent is `agents/<role>.md`, where the role is one noun such as `reviewer` or `verifier`.

```markdown
---
name: reviewer
description: "Reviews one change for problems that would break it in use. Use when a change is about to merge."
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

## Rules

- Give it only the tools its job needs.
- It returns data for the main agent, never instructions to it.
- Codex plugins don't load subagents; anything Codex users need goes in a skill step.
