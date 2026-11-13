# Trigger evals

Read this when adding or running evals that prove a skill fires on the right requests. Claude Code runs them with `claude plugin eval`, once with the plugin and once without it, and reports the difference.

## Where they live

Each case is a folder in the plugin's `evals/` folder. A skill's cases are named `<skill>-<what>`, such as `write-skill-new`, and cases that no skill in the plugin should answer are named `negative-<what>`. A case holds `prompt.md` and a `graders/` folder. Every skill has at least one trigger case.

## A trigger case

`prompt.md` holds frontmatter, then the request exactly as a user would type it:

```markdown
---
tags: [trigger]
runs: 1
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---
I keep pasting the same release checklist into chat. Turn it into a skill.
```

`graders/skill-fired.md` passes when the skill ran:

```markdown
---
type: tool_used
tool: Skill
input_match: "<plugin-id>:agentskills-write-skill"
min: 1
arm: with-only
---
```

## A near-miss case

Use the same `prompt.md` shape with `tags: [negative]` and the close request that belongs elsewhere. Its grader sets `min: 0` and `max: 0` and `arm: both`, with `input_match` naming the skill that should stay quiet, or the plugin id for a `negative-` case.

## Running them

```bash
claude plugin eval plugins/<plugin-id> --case "<skill>-*" --ablation none --no-publish
```

Run every case after changing any description in the plugin. A case that fails twice in a row is a description problem; fix it with [descriptions.md](descriptions.md).
