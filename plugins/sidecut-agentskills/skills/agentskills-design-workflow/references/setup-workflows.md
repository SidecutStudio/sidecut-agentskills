# Design setup and repair workflows

Start with an inspection step. Report the resolved repository, checkout and settings sources, the capabilities the task needs, and evidence for each problem. Identify which missing capabilities block the task and which simply limit coverage.

When the user asks to repair setup, recheck the actual destination checkout and preserve its existing settings. Show affected files and record how to verify each edit. Surface local machine and account decisions for the user. For unattended work, keep repository changes reviewable in an ordinary diff and report unresolved decisions.

Use accepted review fixes, corrective commits and documented solutions when deciding whether to teach a project convention. Count repeat comments on one PR as one incident. Put setup commands in the repository instructions, enforceable rules in checks, and detailed review examples in references read by the relevant reviewer.

## Design reusable project guidance

For a context pack workflow, give the project one discoverable index. Each entry says when to open the pack, and the pack points to individually scoped rules with evidence and a check. Wire the index into the skills that plan, build or review. A change under review should be judged using the guidance already present on its base. Verify that a relevant task opens a rule and an unrelated task skips it.

For a docs scaffold, find existing guidance before choosing destinations. Draft missing standards and review policy from accepted fixes and current checks. Point the project's instructions and confirmed reviewers to the docs they need. Test repeated scaffold requests against an existing file and preserve its contents.

For a docs refresh, use changes since the last substantive edit as the starting point. Ask the workflow to propose additions, revisions and retirements with sources, then check that it reports no change when the evidence is unchanged or insufficient. Exercise preview and apply separately, including when review history is unavailable.

[Compound Engineering pack scaffold](https://github.com/EveryInc/compound-engineering-plugin/blob/main/skills/ce-setup/references/pack-scaffold.md) · [Compound Engineering setup](https://github.com/EveryInc/compound-engineering-plugin/blob/main/skills/ce-setup/SKILL.md) · [Project guidance](https://github.com/EveryInc/compound-engineering-plugin/blob/main/skills/ce-setup/references/project-docs.md)
