---
name: write-skill
description: "Writes one skill for a Sidecut plugin, new or rewritten, that triggers on the right requests and follows the house style. Use when the user wants a new skill, a skill that fires too often or not at all, a long SKILL.md cut down, or evals for a skill. Not for a whole new plugin (use `create-plugin`) or MCP tools (use `build-mcp-server`)."
---

# Write skill

Produces one skill folder that passes `check_plugin` and has trigger evals that prove when it fires and when it stays quiet.

## Before you start

- Get four things from the user: what the skill produces, three requests that should trigger it, two close requests that shouldn't, and how to tell the result is right.
- Read the "Skill folder", "Skill frontmatter" and "SKILL.md layout" sections of `get_house_style`.
- For a rewrite, read the old skill only to list what it covers. Write the new text from that list; don't copy sentences, headings or layout.

## Steps

1. For a new skill, call `add_skill` with the plugin folder, a verb-then-object name and the one-sentence summary. It writes `SKILL.md` and `agents/openai.yaml`.
2. Write the description: the summary, then "Use when" with the trigger situations, then "Not for" with the near misses and the sibling skill that handles each one. Follow [descriptions.md](references/descriptions.md).
3. Write the body in the house order: Before you start, Steps, Rules, When it goes wrong, Done when, References. Keep only the sections the skill needs; Steps and Done when are always there.
4. Move anything the agent only needs sometimes into `references/`, one topic per file, and add a row for it to the References table saying when to read it.
5. Update `agents/openai.yaml` so its title, summary and starter prompt match the new H1 and description.
6. Add trigger evals as described in [evals.md](references/evals.md): one case per trigger request and one per near miss.
7. Run `bun run style`, fix every problem it names, then run the evals.

## Rules

- A step tells the agent what to do; background and explanation go in references.
- Name other skills in backticks and tools by their exact names. `check_plugin` fails on a skill or tool that doesn't exist.
- Never put a version number or a date into a skill. Say how to check the current version instead.

## When it goes wrong

- **The skill fires on a near miss:** make the "Not for" clause name that request and the skill that owns it, then rerun its eval.
- **The skill never fires:** put the words the user would say into "Use when", then rerun the trigger evals.
- **SKILL.md passes 200 lines:** move the longest explanation into a reference file.

## Done when

`bun run style` reports no problems for the skill and every trigger and near-miss eval passes.

## References

| Read | When |
| --- | --- |
| [descriptions.md](references/descriptions.md) | Writing or fixing a description |
| [evals.md](references/evals.md) | Adding or running trigger evals |
