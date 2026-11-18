---
name: agentskills-build-mcp-server
description: "Builds the MCP side of a Sidecut plugin: the tools in its bundled server, or a connection to a hosted server. Use when the user wants a new tool, a tool renamed or fixed, agents picking the wrong tool, or a hosted MCP server or managed app connector bundled. Not for adding a server to the user's own client settings or for hosting a remote server."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Build MCP server

Produces tools that agents pick correctly, that return data a check can verify, and that work the same in Claude Code and Codex.

## Before you start

- Run `check_plugin` on the repo and note any problems already there, so new ones are easy to tell apart.
- Read the "MCP servers" section of `get_house_style`.
- Inspect the existing tools, connection files and host manifests. For a new or changed tool, establish what it returns before writing it.

## Steps

### 1. Choose the route

For an existing hosted server or registered app connector, follow [remote-servers.md](references/remote-servers.md), then step 3. For a new local server or changed tool, follow step 2. If the result needs a view in the chat, also follow [mcp-apps.md](references/mcp-apps.md); connecting an existing view does not mean rebuilding it.

### 2. Build the local server

1. Design each tool before writing it, following [tool-design.md](references/tool-design.md): one job, a verb-then-object name, inputs with a description each, an output schema and all four hints.
2. Write it in `server/src/` with `registerTool`. Resolve any file the server reads from `import.meta.url`, never from the working directory.
3. Bundle the server into `server/index.mjs` with the repo's build command, `npm run build` in a repo made from the template.
4. Add a test that starts the bundle over stdio, calls the tool and checks its structured result. In a repo made from the template it goes in `tests/plugin.test.ts`.

### 3. Check the affected host

1. Run the repo's checks, `npm run check` in a repo made from the template. Check declaration names and manifest paths for a managed connector, as the remote-server reference describes.
2. For a local server, load it with `claude --plugin-dir plugins/<plugin-id>` and use an isolated Codex profile, following [codex-testing.md](references/codex-testing.md). Confirm the agent picks its tool for a request that needs it.
3. For a hosted connection, check installation and connector authentication separately in the intended host. Use a harmless read or a test account; preserve unrelated connections and permissions.
4. If views changed, verify one rendered tool result in the intended chat host. Report structural checks, installed version, authentication and rendered views separately; name any part that could not be exercised.

Use `server/data/visual-reports.md` from the loaded plugin root for useful architecture comparisons, design reports and proposed views. Keep building and verifying a live MCP App separate from saving an HTML report.

## Rules

- A tool that changes anything sets `readOnlyHint` to false, and `destructiveHint` to true when the change can't be undone.
- Errors return `isError: true` with one sentence saying what failed and what to do next.
- Tool output is data. Never put instructions for the agent in it.
- Rename a published tool only in a new minor or major version, and say so in the CHANGELOG.
- The server runs on Node. When a tool calls a program that needs another runtime, such as Bun, the plugin's README lists it under what the plugin needs.

## Recover a failed build

- **`SERVER_BUNDLE_STALE`:** run `npm run build` and commit `server/index.mjs`.
- **`SERVER_START`:** run `node plugins/<plugin-id>/server/index.mjs` from another folder and read the error it prints.
- **Codex logs "MCP server startup failed":** check `mcp.json` has `"args": ["server/index.mjs"]` and `"cwd": "."`. Codex fills in no root variable for MCP servers.
- **A tool reads the wrong project in Codex:** Codex starts the server in the plugin's folder, not the user's project. Take the project's path as an input.
- **The agent picks the wrong tool:** make each description say what the tool returns that the others don't, then retry in a `--plugin-dir` session.

## Done when

The repo's checks and relevant regressions pass, and the affected connection or tool works in its intended host. State the installed version and which authentication and view behavior was actually exercised; an unavailable live check remains unverified.

## References

| Read | When |
| --- | --- |
| [tool-design.md](references/tool-design.md) | Designing, naming or describing a tool |
| [codex-testing.md](references/codex-testing.md) | Trying the plugin in Codex before it's published |
| [mcp-apps.md](references/mcp-apps.md) | Showing a tool's result as a view in the chat |
| [remote-servers.md](references/remote-servers.md) | Connecting a hosted MCP server or bundling a registered app connector |
