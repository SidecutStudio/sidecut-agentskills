---
name: agentskills-write-skill
description: "Writes one skill for a Sidecut plugin, new or rewritten, that triggers on the right requests and follows the house style. Use when the user wants a new skill, a skill that fires too often or not at all, a long SKILL.md cut down, or evals for a skill. Not for a whole new plugin (use `agentskills-create-plugin`) or MCP tools (use `agentskills-build-mcp-server`)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Write skill

Produces one skill folder that passes `check_plugin` and has trigger evals that prove when it fires and when it stays quiet.

## Before you start

- Derive the outcome, three triggers, two near misses and the acceptance check from the request and existing materials. Ask only about gaps that would change the skill or its checks. Follow `server/data/owner-input.md` from the loaded plugin root.
- Read the "Skill folder", "Skill frontmatter" and "SKILL.md layout" sections of `get_house_style`.
- For a rewrite, read the old skill only to list what it covers. Write the new text from that list; don't copy sentences, headings or layout.

## Steps

1. For a new skill, call `add_skill` with the plugin folder, a verb-then-object name and the one-sentence summary. It writes `SKILL.md` and `agents/openai.yaml`. For the router a plugin needs once it has 4 or more other skills, pass the prefix alone as the name; it writes a router skeleton.
2. Write the description: the summary, then "Use when" with the trigger situations, then "Not for" with the near misses and the sibling skill that handles each one. Follow [descriptions.md](references/descriptions.md).
3. Write the body around the actual work. Put constraints and recovery beside the relevant steps, and make completion verifiable when proof matters. Use only headings that help.
4. Move anything the agent only needs sometimes into `references/`, one topic per file, and add a row for it to the References table saying when to read it.
5. Update `agents/openai.yaml` so its title, summary and starter prompt match the new H1 and description.
6. Add trigger evals as described in [evals.md](references/evals.md): one case per trigger request and one per near miss.
7. Run `npm run style`, fix every problem it names, then run the evals.

When choosing the output format, read `server/data/visual-reports.md` from the loaded plugin root. For skills that benefit from visual outputs, write the procedure and package its needed assets with that plugin. Preserve any other product's own design. Don't require another installed plugin or a maintainer checkout.

Keep the skill instructions in Markdown.

## Rules

- A step tells the agent what to do; background and explanation go in references.
- Name other skills in backticks and tools by their exact names. `check_plugin` fails on a skill or tool that doesn't exist.
- Never put a version number or a date into a skill. Say how to check the current version instead.

## Fix validation failures

- **The skill fires on a near miss:** make the "Not for" clause name that request and the skill that owns it, then rerun its eval.
- **The skill never fires:** put the words the user would say into "Use when", then rerun the trigger evals.
- **SKILL.md passes 200 lines:** move the longest explanation into a reference file.

## Done when

`npm run style` reports no problems for the skill and every trigger and near-miss eval passes.

## References

| Read | When |
| --- | --- |
| [descriptions.md](references/descriptions.md) | Writing or fixing a description |
| [evals.md](references/evals.md) | Adding or running trigger evals |
