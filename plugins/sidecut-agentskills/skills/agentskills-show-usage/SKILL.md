---
name: agentskills-show-usage
description: "Shows which Sidecut plugin skills ran in Claude Code and Codex, from the local skill log. Use when the user asks which Sidecut skills or plugins get used, on which host, or whether usage is being recorded. Not for changing a plugin's hooks (use `agentskills-design-workflow`)."
argument-hint: "[days]"
---

# Show usage

Count the Sidecut plugin skills that ran over a period, by plugin, skill and host, and say plainly what the log can't show. It covers only plugins that ship the Sidecut skill-log hook, and only skill starts the hook sees.

## Steps

1. Check the switch in this host: `SIDECUT_SKILL_LOG` must be `1`, and `DO_NOT_TRACK=1` or a CI variable turns it off. You can't see the other host's settings.
2. Read `~/.sidecut/skill-log.jsonl`. Each line has `time`, `plugin`, `skill` and `host`, and nothing else. Use the last seven days unless the user names a period.
3. When the switch is on, look for this run's own line: an `agentskills-show-usage` line for this host from the last few minutes. If it's there, recording works in this host; leave it out of every count. If it isn't, recording here is unconfirmed. In Codex that's expected for a skill started by a `$` mention; in Claude Code it means the hook didn't run.
4. For each host, give the newest other line. If one host's newest is days older than the other's, say recording may be off there. A missing file or a host with no lines only means nothing was recorded, not that the log is off.
5. Count runs per plugin, per skill and per host.
6. Name skills that never ran only among the plugin skills loaded in this session, and only for plugins whose loaded root has `hooks/post-tool-use-skill-log.mjs`. Say the list covers this host's plugins only.
7. Say what the log never records: plugins without the hook, and Codex skills put straight into the prompt by a `$` mention without a file read. Draw no conclusion from their absence.
8. For more than a handful of rows, use `server/data/visual-reports.md` from the loaded plugin root for a small chart. Open it in the host's local browser view, not an Artifact or other hosted page, unless the user asks.
9. Explain it in a few short lines and name the one thing most worth acting on, such as a recorded skill that never starts or recording that has stopped in one host.

## Rules

Read only: don't edit the log, hooks or settings. Changing a host's settings needs the user's yes. The log holds no prompts, commands or file paths, so the answer can't include them.

## Done when

The answer gives the period, counts by plugin, skill and host without this run, whether recording is confirmed in each host, and what the log can't see.
