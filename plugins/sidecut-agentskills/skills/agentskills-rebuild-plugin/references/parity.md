# Parity record

Read this when recording a plugin before and after a rebuild. The same record, taken twice on the same machine, shows whether the rebuild kept everything the plugin did.

## What to record

| Part | How |
| --- | --- |
| Skills | Each skill's name, its description and three requests that should trigger it |
| Rules | Each skill's hard rules, quoted: every sentence that says never, always, only when, don't or must, and the safety lines in its references |
| Tools | The server's `tools/list` result, then each read-only tool called with fixed inputs |
| Hooks | Each event, matcher and script from `hooks.json`, then the decision each hook makes on fixed inputs: the cases in its tests, plus any spellings the old script handles specially, such as quotes, backslashes and line breaks |
| Checks | The repo's `required_checks` and the result of its check command |
| Hosts | Whether the plugin loads in Claude Code and in Codex, and how each skill can be started there |
| Names | The plugin id, each skill and tool name and the plugin's path, and every file outside the repo that uses one: other repos, both marketplaces, README install commands |

Save each record as JSON in the scratch folder, named `before.json` and `after.json`.

## Calling the tools

Start the bundled server over stdio with `node`, send `initialize`, `notifications/initialized`, `tools/list` and one `tools/call` per tool, and keep the replies. Use the same inputs both times. Call only tools with `readOnlyHint` set to true; changing tools are compared by reading their code.

Fields that change on every call, such as timestamps or counters, are compared by name and type only.

## Calling the hooks

Pipe each recorded input to the hook script as the JSON its host sends for that event and matcher: `tool_input.command` and `cwd` for a Bash guard, `tool_input.skill` for a Skill hook, and so on. Keep what it returns and what it writes: a guard's allow, deny or ask; a logging hook's record. Run the old and new scripts on the same inputs.

## Finding names in use

For each name that changes, search the user's other repos with `grep -rn`, leaving out `node_modules`, `.git` and `dist`. Count a hit in a marketplace file, an install command, a skill reference, a test or code that matches on the name. Leave out changelogs and dated records.

## Comparing

Compare the two records field by field and list:

- **Same:** nothing to say.
- **Changed by the house style:** a renamed tool, a new field order, a moved file. Name the rule.
- **Changed otherwise:** a regression until it is explained and the user agrees. A hard rule that is gone or weaker, or a hook that decides differently, always lands here.

The rebuild is done when the third list is empty.
