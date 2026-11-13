---
name: start
description: "Routes a request about Sidecut plugins, skills, MCP servers or plugin repos to the right Sidecut Agentskills skill. Use when the user wants agent tooling made, fixed, checked or shipped but hasn't said which part. Not for using an installed plugin or configuring someone else's MCP server."
---

# Start

Picks the one skill in this plugin that fits the request and hands over to it. Every skill here follows the Sidecut house style, which `get_house_style` returns.

## Pick a skill

| Need | Skill |
| --- | --- |
| A new plugin or a new plugin repo | `create-plugin` |
| A new skill, or a skill that triggers badly, runs long or needs evals | `write-skill` |
| A new or changed MCP tool, or a remote MCP server wired in | `build-mcp-server` |
| Something that happens on its own: a hook, a subagent or a CI job | `design-workflow` |
| A check of a plugin against the house style, changing nothing | `review-plugin` |
| An older plugin brought into the house style without losing anything | `rebuild-plugin` |
| A new version released to the Sidecut marketplace | `publish-plugin` |

When a request spans several, start with the one whose result the others need: `create-plugin` before `write-skill`, and `review-plugin` before `rebuild-plugin`.

## Not this plugin

- Using a plugin that is already installed: follow that plugin's own skills.
- Adding an MCP server to the user's own Claude Code or Codex settings: edit that client's config directly.
- Changes to an app's code, merges and releases of apps: use Solo Workflow.

## Done when

The user's request is in the hands of one named skill, or the user knows it belongs outside this plugin.
