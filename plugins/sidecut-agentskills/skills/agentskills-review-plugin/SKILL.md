---
name: agentskills-review-plugin
description: "Reviews a Sidecut plugin repo against the house style, listing what breaks it most serious first without changing anything. Use when the user asks for a plugin review, wants to know if a plugin is ready to publish, or another agent changed one. Not for fixing what it finds unless asked, or for reworking a whole plugin (use `agentskills-rebuild-plugin`)."
allowed-tools:
  - Bash(bun run style)
  - Bash(claude plugin validate *)
---

# Review plugin

Produces a short report of everything in a plugin repo that breaks the house style or won't load, with a fix for each.

## Steps

1. Call `check_plugin` with the repo's absolute path. Each problem comes with a code, a file and line, and a fix.
2. Run `claude plugin validate --strict plugins/<plugin-id>` for the problems Claude Code itself would reject.
3. Read the rows marked review in `get_house_style` and check those by reading the files: voice, sentence length, link text, transport and the rest.
4. Write the report in three groups, most serious first:
   - **Won't load or work:** validator errors, a server that doesn't start, a stale bundle, a missing manifest.
   - **Breaks the house style:** every other `check_plugin` problem.
   - **For review:** the review-only rows that don't hold, each with the file and a suggested fix.
5. End with one line: ready to publish, or the number of problems left.

## Rules

- Change nothing. When the user asks for fixes, make them, run `bun run check`, and report what changed.
- Report each problem once, even when the checker finds it in both copies of a file.

## Done when

The user has the three groups, each problem with its file and fix, and the one-line verdict.
