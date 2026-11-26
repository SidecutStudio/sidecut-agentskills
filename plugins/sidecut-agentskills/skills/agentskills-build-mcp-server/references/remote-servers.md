# Remote servers

Read this when a plugin connects to a hosted MCP server, new or existing, or bundles its registered app connector with skills. The server and its MCP Apps views stay in their owning project; the plugin packages the connection.

## Choose the connection

- **Direct MCP:** use the verified server endpoint in `.mcp.json` for Claude Code and `mcp.json` for Codex. Let the host handle authentication.
- **Stdio bridge (`mcp-remote`):** when a host lacks native remote OAuth, rejects the host's OAuth origin or redirect (such as `Forbidden - origin invalid`), or only supports legacy SSE, bridge the remote endpoint over stdio with a pinned version such as `npx -y mcp-remote@0.16.7 <url>`. It runs a standard `http://localhost` OAuth callback in the browser.
- **Managed app:** when the user wants an existing registered connector in the bundle, add `.app.json` and its Codex manifest reference. Confirm the connector's identity, endpoint and account access before editing.
- **New registered app:** when the user wants a new hosted server to show up in Codex as an app rather than as a server the user authenticates by hand. Register it first, as [Register a new app](#register-a-new-app) describes, then wire it as a managed app with the direct MCP route kept as its fallback. Only the owner can register it, so tell them in one line before packaging and wait for the id; ship the direct route alone only when they choose that, and say what it looks like in each host.
- **Both routes:** keep a direct MCP fallback when API-key sessions need it. Give it the same declaration name as the app, so Codex selects one route for that backend.

Preserve the plugin's identity, skills and working Claude Code connection. A working account connector can remain that host's connection; do not replace it merely to make the files symmetric. List a deliberate host difference under `sidecut.keep` with its reason when the checker needs it.

## Direct MCP files

Both files use the plugin id without the configured prefix as the server key. For a plugin named `acme-example` with the prefix `acme-`, they contain:

```json
{
  "mcpServers": {
    "example": {
      "type": "http",
      "url": "https://example.com/mcp"
    }
  }
}
```

Use the actual verified endpoint. Keep tokens, credentials and secret headers out of the package; when the server needs a token, document how the client obtains it without storing it here.

When bridging over stdio with `mcp-remote`, use the same server key:

```json
{
  "mcpServers": {
    "example": {
      "command": "npx",
      "args": ["-y", "mcp-remote@0.16.7", "https://example.com/mcp"]
    }
  }
}
```

Pass `--header "Key: ${ENV_VAR}"` in `args` only when a host substitutes environment variables and the server requires a header instead of OAuth, or `--transport sse-only` / `http-only` when transport negotiation fails. Never hardcode API keys or bearer tokens in `args`. Because `sidecut-check` expects direct HTTP (`type: "http"` and `url`) for remote servers and `node server/index.mjs` for stdio servers, list `MCP_LOCAL` and `SERVER_FILES` under `sidecut.keep` in `package.json` with the reason when a plugin ships an `mcp-remote` bridge.

Antigravity reads `mcp_config.json` at the plugin root, which `sidecut-sync` writes from `.mcp.json`: a remote server as its `url` alone, a local one with `${PLUGIN_ROOT}`. For a bridged or header-auth server sync can't express, keep `mcp_config.json` under `sidecut.keep` and write it by hand: declare any `${VAR}` placeholders in the server's `variables` array (Antigravity does not expand OS environment variables in plugin MCP configs), or bridge with `mcp-remote@0.16.7` when the server rejects Antigravity's OAuth origin.

## Register a new app

A plugin can only point at an app that is already registered; nothing in the package creates one. The owner registers it, signed in to their own account. Read each host's current page before giving the steps, since these flows change:

- **ChatGPT and Codex:** OpenAI's [plugin packaging guide](https://developers.openai.com/plugins/build/plugins) has the owner add the server's URL as a custom MCP server on the ChatGPT plugins page and create it as a plugin. The connection's id, which starts with `plugin_asdk_app`, is what `.app.json` takes. Check the [submission page](https://developers.openai.com/plugins/deploy/submission) before planning a directory listing: it says which packages with app references it accepts.
- **Claude:** Claude has no app id for a plugin to declare. Claude Code keeps the direct MCP entry. To list the server as a connector in Claude's apps as well, the owner adds it as a [custom connector](https://claude.com/docs/connectors/custom/add-unlisted) or [submits it to the directory](https://claude.com/docs/connectors/building/submission).

Before registering, make sure the server's sign-in accepts each host's own OAuth client; the [Claude connector authentication guide](https://claude.com/docs/connectors/building/authentication) covers the ones Claude uses. A server that signs in a scripted client can still turn a host away, so the host sign-in in [Check each outcome](#check-each-outcome) is the proof.

Keep the direct MCP files under the same declaration name as the app, so API-key sessions and other hosts still reach the server. Record which account owns the registration in the plugin's README or the owning repo, never in the package.

## Managed app declaration

Find the connector id in its installed `.app.json`, supported connector metadata or the owning registration, or take the one the owner copied when registering a new app. Copy it unchanged after checking the connector's name and endpoint. A plugin id, a plugin URL and an MCP endpoint are not connector ids; if the registration cannot be verified, resolve it before wiring the package.

Add this file at the plugin root as `.app.json`, replacing the placeholder with that verified connector id:

```json
{
  "apps": {
    "example": {
      "id": "<verified-connector-id>"
    }
  }
}
```

In `.codex-plugin/plugin.json`, add `"apps": "./.app.json"` after `mcpServers`, when present, and before `hooks` or `interface`. Keep the existing manifests and their shared identity; this change does not require a manifest-format migration. The app entry may include a `category` string when needed.

In Codex sessions signed in with ChatGPT, the app uses the managed connector's connection. Codex suppresses a direct MCP entry with the same declaration name; API-key sessions retain the direct route. This comparison uses `example`, not the connector id or URL, so mismatched names can expose duplicate routes. Do not give a local stdio server that name, because its tools would be hidden by app routing.

An app declaration can stand alone when no direct fallback is needed. It does not create a registration, grant access, embed a server, deploy views or publish the hosted app. Preserve the connector's audience and permissions; verify that the bundle's intended users can access it.

## Check each outcome

1. Run the repo's checks. The checker validates the app-file shape, manifest reference, declaration key and remote fallback; it cannot prove registration ownership, endpoint identity or successful sign-in.
2. Test malformed declarations, a missing app file or manifest reference, mismatched names and an app that accidentally shadows a local server. A valid managed connection and a direct-only plugin must still pass.
3. After authorized delivery, refresh through the existing marketplace and read back the installed version and packaged app id. Do not replace unrelated installed plugins or create a second registration.
4. In each intended host, sign in through the host itself and perform a harmless read: the app's connection where there is one, and the direct route in an isolated profile ([codex-testing.md](codex-testing.md)). A scripted OAuth client proves the server, not the host. Exercise the direct route separately when API-key support is required; a working managed connection does not prove its fallback works. `agentskills-publish-plugin` doesn't release until each host is signed in or named as unproven.
5. If the server provides MCP Apps views, check a rendered tool result in the intended chat host. Installation, authentication and rendering are separate checks; report only what was observed. A package-only change needs no server deployment.

When sign-in expires, reconnect the managed app in the host's connector settings, or use the direct MCP client's login flow for that route. When the server is unreachable, report the endpoint and error once.

## Sources

Check current host documentation before relying on routing or manifest behavior. OpenAI's [plugin packaging guide](https://developers.openai.com/plugins/build/plugins) covers registered app mappings; Codex's [app parser](https://github.com/openai/codex/blob/main/codex-rs/connectors/src/plugin_config.rs) and [routing policy](https://github.com/openai/codex/blob/main/codex-rs/core-plugins/src/app_mcp_routing.rs) define the declaration fields and name matching.
