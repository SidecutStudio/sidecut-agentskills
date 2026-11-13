# Descriptions that trigger

Read this when writing or fixing a skill's description. The host reads every installed skill's description to decide which one to load, so the description is the only part that decides whether a skill runs.

## Shape

A description has three sentences in a fixed order.

1. What the skill does, starting with a third-person verb: "Writes", "Checks", "Publishes". This sentence also becomes the README row and the Codex summary.
2. "Use when" followed by the situations, in the words a user would type: "ship it", "fires too often", "a new plugin".
3. "Not for" followed by the closest requests that belong elsewhere, each with the skill that owns it in parentheses when that skill is in the same plugin.

Keep the whole description at 400 characters or fewer. A longer one usually repeats the body.

## Choosing the words

- Use the user's words, not the skill's internal terms. People say "publish" more than "release a version".
- Name the result, not the method: "a plugin that passes its checks", not "runs the scaffolder".
- Each trigger situation is a short phrase separated by commas, with no comma before the final "or".
- Leave out anything that is true of every skill, such as "follows the house style".

## Fixing a description

| Symptom | Change |
| --- | --- |
| Fires on a near miss | Add that request to "Not for" with the skill that owns it |
| Never fires | Add the user's own phrasing to "Use when" |
| Two skills fire together | Give each a "Not for" that names the other |
| Fires for an unrelated topic | Remove broad words such as "tooling" from "Use when" |

After each change, rerun the trigger evals for every skill in the plugin, since descriptions compete with each other.
