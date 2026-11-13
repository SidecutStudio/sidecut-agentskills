# Remote servers

Read this when a plugin should connect to an MCP server hosted somewhere else instead of, or as well as, its bundled one. The plugin only holds the connection; the server is built and hosted in its own project.

## The two config files

Claude Code reads `.mcp.json` and Codex reads `mcp.json`. Both name the server with the same key, the plugin id without `sidecut-`.

```json
{
  "mcpServers": {
    "builder": {
      "type": "http",
      "url": "https://mcp.sidecut.dev/mcp"
    }
  }
}
```

`mcp.json` holds exactly the same entry: Codex accepts `"type": "http"` too.

## Sign-in

- Let the host handle sign-in. Claude Code and Codex both run OAuth for a remote server the first time it's used.
- Never put a token, key or header with a secret in either file, in a skill or in the repo.
- When a server only accepts a token, tell the user which environment variable their client expects and let them set it themselves.

## Checking it

1. Run `bun run check`; it confirms the two files match.
2. Start a `--plugin-dir` session and ask for something that needs the server. The host prompts for sign-in, then the tools appear.
3. When the server is unreachable, report the URL and the error once. Don't retry in a loop.

## One server per plugin

A plugin has one MCP server, bundled or remote. When it needs both local work and hosted data, the bundled server calls the hosted one, so agents see one set of tools.
