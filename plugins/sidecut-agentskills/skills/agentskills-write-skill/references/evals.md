# Trigger evals

Read this when adding or running evals that prove a skill fires on the right requests. Claude Code runs them with `claude plugin eval`, once with the plugin and once without it, and reports the difference.

## Where they live

Each case is a folder in the repository-root `evals/` folder, outside the installed plugin. A skill's cases are named `<skill>-<what>`, such as `write-skill-new`, and cases that no skill in the plugin should answer are named `negative-<what>`. A case holds `prompt.md` and a `graders/` folder. Every skill has at least one trigger case.

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

`input_match` is a regular expression searched in the tool's input, so it also matches any longer skill name that starts the same way. For the router, whose name starts every other skill's name, anchor it on the closing quote:

```markdown
input_match: '"skill"\s*:\s*"<plugin-id>:<prefix>"'
```

## A near-miss case

Use the same `prompt.md` shape with `tags: [negative]` and the close request that belongs elsewhere. Its grader sets `min: 0` and `max: 0` and `arm: both`, with `input_match` naming the skill that should stay quiet, or the plugin id for a `negative-` case.

## Running them

```bash
npm run eval -- --case "<skill>-*" --ablation none
```

The dev command stages the plugin and cases in a temporary folder, runs Claude Code with publication disabled, and removes the staged files. Reports go in the ignored repository folder `eval-results/`. Evals may use model credits; run them only with permission.

Run every case after changing any description in the plugin. A case that fails twice in a row is a description problem; fix it with [descriptions.md](descriptions.md).
