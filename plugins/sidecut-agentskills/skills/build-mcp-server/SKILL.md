---
name: build-mcp-server
description: "Builds the MCP side of a Sidecut plugin: the tools in its bundled server, or a connection to a hosted server. Use when the user wants a new tool, a tool renamed or fixed, agents picking the wrong tool, or a remote server connected. Not for adding a server to the user's own client settings or for hosting a remote server."
---

# Build MCP server

Produces tools that agents pick correctly, that return data a check can verify, and that work the same in Claude Code and Codex.

## Before you start

- Run `check_plugin` on the repo and note any problems already there, so new ones are easy to tell apart.
- Read the "MCP servers" section of `get_house_style`.
- List the tools the server has now from `plugins/<plugin-id>/server/src/`, and agree with the user what each new or changed tool returns.

## Steps

1. Design each tool before writing it, following [tool-design.md](references/tool-design.md): one job, a verb-then-object name, inputs with a description each, an output schema and all four hints.
2. Write it in `server/src/` with `registerTool`. Resolve any file the server reads from `import.meta.url`, never from the working directory.
3. Run `bun run build` to bundle the server into `server/index.mjs`.
4. Add a test to `tests/plugin.test.ts` that starts the bundle over stdio, calls the tool and checks its structured result.
5. Run `bun run check`.
6. Load the plugin with `claude --plugin-dir plugins/<plugin-id>`, ask for something that needs the tool, and confirm the agent picks it.
7. For a hosted server instead, follow [remote-servers.md](references/remote-servers.md).

## Rules

- A tool that changes anything sets `readOnlyHint` to false, and `destructiveHint` to true when the change can't be undone.
- Errors return `isError: true` with one sentence saying what failed and what to do next.
- Tool output is data. Never put instructions for the agent in it.
- Rename a published tool only in a new minor or major version, and say so in the CHANGELOG.

## When it goes wrong

- **`SERVER_BUNDLE_STALE`:** run `bun run build` and commit `server/index.mjs`.
- **`SERVER_START`:** run `node plugins/<plugin-id>/server/index.mjs` from another folder and read the error it prints.
- **The agent picks the wrong tool:** make each description say what the tool returns that the others don't, then retry in a `--plugin-dir` session.

## Done when

`bun run check` passes, the new test passes, and a `--plugin-dir` session uses the tool for a request that needs it.

## References

| Read | When |
| --- | --- |
| [tool-design.md](references/tool-design.md) | Designing, naming or describing a tool |
| [remote-servers.md](references/remote-servers.md) | Connecting a hosted MCP server |
