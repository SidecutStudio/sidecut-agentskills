# Parity record

Read this when recording a plugin before and after a rebuild. The same record, taken twice on the same machine, shows whether the rebuild kept everything the plugin did.

## What to record

| Part | How |
| --- | --- |
| Skills | Each skill's name, its description and three requests that should trigger it |
| Tools | The server's `tools/list` result, then each read-only tool called with fixed inputs |
| Hooks | Each event, matcher and script from `hooks.json` |
| Checks | The repo's `required_checks` and the result of its check command |
| Hosts | Whether the plugin loads in Claude Code and in Codex |

Save each record as JSON in the scratch folder, named `before.json` and `after.json`.

## Calling the tools

Start the bundled server over stdio with `node`, send `initialize`, `notifications/initialized`, `tools/list` and one `tools/call` per tool, and keep the replies. Use the same inputs both times. Call only tools with `readOnlyHint` set to true; changing tools are compared by reading their code.

Fields that change on every call, such as timestamps or counters, are compared by name and type only.

## Comparing

Compare the two records field by field and list:

- **Same:** nothing to say.
- **Changed by the house style:** a renamed tool, a new field order, a moved file. Name the rule.
- **Changed otherwise:** a regression until it is explained and the user agrees.

The rebuild is done when the third list is empty.
