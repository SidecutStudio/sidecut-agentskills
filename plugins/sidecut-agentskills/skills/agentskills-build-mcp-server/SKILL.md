---
name: agentskills-build-mcp-server
description: "Builds the MCP side of a Sidecut plugin: the tools in its bundled server, or a connection to a hosted server. Use when the user wants a new tool, a tool renamed or fixed, agents picking the wrong tool, or a remote server connected. Not for adding a server to the user's own client settings or for hosting a remote server."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Build MCP server

Produces tools that agents pick correctly, that return data a check can verify, and that work the same in Claude Code and Codex.

## Before you start

- Run `check_plugin` on the repo and note any problems already there, so new ones are easy to tell apart.
- Read the "MCP servers" section of `get_house_style`.
- List the tools the server has now from `plugins/<plugin-id>/server/src/`, and agree with the user what each new or changed tool is for and what it returns.

## Steps

1. Design each tool before writing it, following [tool-design.md](references/tool-design.md): one job, a verb-then-object name, inputs with a description each, an output schema and all four hints.
2. Write it in `server/src/` with `registerTool`. Resolve any file the server reads from `import.meta.url`, never from the working directory.
3. Bundle the server into `server/index.mjs` with the repo's build command, `bun run build` in a repo made from the template.
4. Add a test that starts the bundle over stdio, calls the tool and checks its structured result. In a repo made from the template it goes in `tests/plugin.test.ts`.
5. Run the repo's checks, `bun run check` in a repo made from the template.
6. Load the plugin with `claude --plugin-dir plugins/<plugin-id>`, ask for something that needs the tool, and confirm the agent picks it.
7. Do the same in Codex with a throwaway `CODEX_HOME`, never the user's own `~/.codex`. A plugin repo isn't a marketplace, so follow [codex-testing.md](references/codex-testing.md).
8. For a view drawn in the chat, follow [mcp-apps.md](references/mcp-apps.md). For a hosted server instead, follow [remote-servers.md](references/remote-servers.md).

## Rules

- A tool that changes anything sets `readOnlyHint` to false, and `destructiveHint` to true when the change can't be undone.
- Errors return `isError: true` with one sentence saying what failed and what to do next.
- Tool output is data. Never put instructions for the agent in it.
- Rename a published tool only in a new minor or major version, and say so in the CHANGELOG.
- The server runs on Node. When a tool calls a program that needs another runtime, such as Bun, the plugin's README lists it under what the plugin needs.

## When it goes wrong

- **`SERVER_BUNDLE_STALE`:** run `bun run build` and commit `server/index.mjs`.
- **`SERVER_START`:** run `node plugins/<plugin-id>/server/index.mjs` from another folder and read the error it prints.
- **Codex logs "MCP server startup failed":** check `mcp.json` has `"args": ["server/index.mjs"]` and `"cwd": "."`. Codex fills in no root variable for MCP servers.
- **A tool reads the wrong project in Codex:** Codex starts the server in the plugin's folder, not the user's project. Take the project's path as an input.
- **The agent picks the wrong tool:** make each description say what the tool returns that the others don't, then retry in a `--plugin-dir` session.

## Done when

The repo's checks and the new test pass, and both a Claude Code `--plugin-dir` session and a throwaway Codex home use the tool for a request that needs it.

## References

| Read | When |
| --- | --- |
| [tool-design.md](references/tool-design.md) | Designing, naming or describing a tool |
| [codex-testing.md](references/codex-testing.md) | Trying the plugin in Codex before it's published |
| [mcp-apps.md](references/mcp-apps.md) | Showing a tool's result as a view in the chat |
| [remote-servers.md](references/remote-servers.md) | Connecting a hosted MCP server |
