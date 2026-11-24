---
name: agentskills-review-plugin
description: "Reviews a plugin repo against the house style, listing what breaks it most serious first without changing anything. Use when the user asks for a plugin review, wants to know if a plugin is ready to publish, or another agent changed one. Not for fixing what it finds unless asked, or for reworking a whole plugin (use `agentskills-rebuild-plugin`)."
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
3. Read the rows marked review in `get_house_style` and check those by reading the files: voice, sentence length, link text, transport and the rest. Check that nothing in the repo writes a SKILL.md, such as a script or a test that regenerates the skills from code.
4. Read the skills as a set, then next to two of the user's other plugins in the same marketplace. Report what this one does differently that the others agree on: the shape of each skill, failure handling said once or pasted into every skill, steps that are paragraphs, a missing usage log. `check_plugin` passes a plugin that differs from its siblings this way, so this reading is the only check of it.
5. In a public repo, run the README's install steps from a throwaway `CLAUDE_CONFIG_DIR` and `CODEX_HOME`, then delete both. For unmerged work, add the marketplace from the local checkout's path instead of `<org>/<repo>`, which serves `main`. A step that fails, or needs a marketplace the public can't reach, won't work; if the steps can't run, say which host went unproven.
6. Sort the problems into three groups, most serious first:
   - **Won't load or work:** validator errors, a server that doesn't start, a stale bundle, a missing manifest.
   - **Breaks the house style:** every other `check_plugin` problem.
   - **For review:** the review-only rows that don't hold, and where it differs from its sibling plugins, each with the file and a suggested fix.
7. When someone else will act on the review, or it's about to ship, take the change's review level from the repo's own workflow, or standard when it sets none. At light, go to step 8. At standard, also hand the repo, its commit and what changed to the `sidecut-agentskills:reviewer` subagent on a cheaper model, `sonnet` unless the project's `review_model` says otherwise; at deep, on your own model. Ask it for problems with evidence, not a general opinion. In Codex it is `agentskills_reviewer`; if the project's `.codex/agents/agentskills-reviewer.toml` is missing, copy it from this plugin's `codex/agents/` first. Merge its findings into the groups, dropping duplicates.
8. Write the one-line verdict: ready to publish, or the number of problems left.
9. Choose the format with the test in `server/data/visual-reports.md` from the loaded plugin root. When it calls for HTML, publish the three groups and the verdict as an HTML report saved outside the reviewed repo, and give the verdict and the top three problems in chat. Otherwise write the groups and the verdict in chat.
10. When fixes, `sidecut.keep` entries or a rerun remain, ask about them last, as one question following Offer follow-ups in `server/data/user-input.md` from the loaded plugin root. Change nothing until the user picks one.

## Rules

- Leave the reviewed repository unchanged. When the user asks for fixes, make them, run `npm run check`, and report what changed.
- Report each problem once, even when the checker finds it in both copies of a file.

## Done when

The user has the three groups, each problem with its file and fix, in the format step 9 chose, the one-line verdict, and any follow-ups offered as a question.
