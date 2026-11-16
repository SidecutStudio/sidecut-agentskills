---
name: agentskills-show-usage
description: "Shows which Sidecut plugin skills ran in Claude Code and Codex, from the local skill log. Use when the user asks which Sidecut skills or plugins get used, on which host, or whether usage is being recorded. Not for changing a plugin's hooks (use `agentskills-design-workflow`)."
argument-hint: "[days]"
---

# Show usage

Count the Sidecut plugin skills that ran over a period, by plugin, skill and host, and explain what stands out in plain words. Every Sidecut plugin writes to the same local log, so this covers all of them, in Codex as well as Claude Code.

## Steps

1. Read `~/.sidecut/skill-log.jsonl`. Each line has `time`, `plugin`, `skill` and `host`, and nothing else. Use the last seven days unless the user names a period.
2. If the file is missing or empty, say the log is off and how to turn it on: set `SIDECUT_SKILL_LOG=1` in the environment each host starts with. The log stays off when `DO_NOT_TRACK=1` is set or in CI. Changing host settings needs the user's yes.
3. If the newest line is more than a day old while the user says they've been working, say recording may have stopped and check that the variable is still set for both hosts.
4. Count runs per plugin, per skill and per host. Compare each plugin's skills with the skills it ships, so skills that never ran are named too.
5. For more than a handful of rows, use `server/data/visual-reports.md` from the loaded plugin root for a small chart, shown in the host's own view. Keep it on the user's machine unless they ask to share it.
6. Explain it in a few short lines: what ran most, what never ran, and which host each plugin runs in. Name the one thing most worth acting on, such as a skill that never starts or a plugin used in only one host.

## Rules

Read only: don't edit the log, hooks or settings. The log holds no prompts, commands or file paths, so the answer can't include them.

## Done when

The answer gives the period, counts by plugin, skill and host, the skills that never ran and whether the log is recording.
