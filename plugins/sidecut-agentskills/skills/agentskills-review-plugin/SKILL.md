---
name: agentskills-review-plugin
description: "Reviews a Sidecut plugin repo against the house style, listing what breaks it most serious first without changing anything. Use when the user asks for a plugin review, wants to know if a plugin is ready to publish, or another agent changed one. Not for fixing what it finds unless asked, or for reworking a whole plugin (use `agentskills-rebuild-plugin`)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
  - Bash(npm run style)
  - Bash(claude plugin validate *)
---

# Review plugin

Produces a short report of everything in a plugin repo that breaks the house style or won't load, with a fix for each.

## Steps

1. Call `check_plugin` with the repo's absolute path. Each problem comes with a code, a file and line, and a fix.
2. Run `claude plugin validate --strict plugins/<plugin-id>` for the problems Claude Code itself would reject.
3. Read the rows marked review in `get_house_style` and check those by reading the files: voice, sentence length, link text, transport and the rest.
4. In a public repo, run the README's install steps from a throwaway `CLAUDE_CONFIG_DIR` and `CODEX_HOME`, then delete both. For unmerged work, add the marketplace from the local checkout's path instead of `SidecutStudio/<repo>`, which serves `main`. A step that fails, or needs a marketplace the public can't reach, won't work; if the steps can't run, say which host went unproven.
5. Write the report in three groups, most serious first:
   - **Won't load or work:** validator errors, a server that doesn't start, a stale bundle, a missing manifest.
   - **Breaks the house style:** every other `check_plugin` problem.
   - **For review:** the review-only rows that don't hold, each with the file and a suggested fix.
6. When someone else will act on the review, or it's about to ship, take the review level that `solo-review-change` picks for the change. At light, stop here. At standard, also hand the repo, its commit and what changed to the `sidecut-agentskills:reviewer` subagent on a cheaper model, `sonnet` unless the project's `review_model` says otherwise; at deep, on your own model. Ask it for problems with evidence, not a general opinion. In Codex it is `agentskills_reviewer`; if the project's `.codex/agents/agentskills-reviewer.toml` is missing, copy it from this plugin's `codex/agents/` first. Merge its findings into the groups, dropping duplicates.
7. End with one line: ready to publish, or the number of problems left. If the requested follow-through depends on a choice between fixes or a missing permission, ask using `server/data/owner-input.md` from the loaded plugin root. A review-only request ends with the report.

Use `server/data/visual-reports.md` from the loaded plugin root when examples or visual structure make the review easier to act on. Preserve the three groups and verdict. A read-only review may save a report artifact in a task-owned folder; leave the reviewed repository unchanged.

## Rules

- Leave the reviewed repository unchanged. When the user asks for fixes, make them, run `npm run check`, and report what changed.
- Report each problem once, even when the checker finds it in both copies of a file.

## Done when

The user has the three groups, each problem with its file and fix, and the one-line verdict.
