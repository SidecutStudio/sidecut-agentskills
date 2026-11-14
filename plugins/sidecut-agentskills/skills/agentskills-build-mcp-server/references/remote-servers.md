# Remote servers

Read this when a plugin connects to an existing hosted MCP server or bundles its registered app connector with skills. The server and its MCP Apps views stay in their owning project; the plugin packages the connection.

## Choose the connection

- **Direct MCP:** use the verified server endpoint in `.mcp.json` for Claude Code and `mcp.json` for Codex. Let the host handle authentication.
- **Managed app:** when the user wants an existing registered connector in the bundle, add `.app.json` and its Codex manifest reference. Confirm the connector's identity, endpoint and account access before editing.
- **Both routes:** keep a direct MCP fallback when API-key sessions need it. Give it the same declaration name as the app, so Codex selects one route for that backend.

Preserve the plugin's identity, skills and working Claude Code connection. A working account connector can remain that host's connection; do not replace it merely to make the files symmetric. List a deliberate host difference under `sidecut.keep` with its reason when the checker needs it.

## Direct MCP files

Both files use the plugin id without `sidecut-` as the server key. For a plugin named `sidecut-example`, they contain:

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

## Managed app declaration

Find the connector id in its installed `.app.json`, supported connector metadata or the owning registration. Copy it unchanged after checking the connector's name and endpoint. A plugin id, a plugin URL and an MCP endpoint are not connector ids; if the registration cannot be verified, resolve it before wiring the package.

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
4. In the intended host, confirm the managed connector is authenticated and perform a harmless read. Exercise the direct route separately when API-key support is required; a working managed connection does not prove its fallback works.
5. If the server provides MCP Apps views, check a rendered tool result in the intended chat host. Installation, authentication and rendering are separate checks; report only what was observed. A package-only change needs no server deployment.

When sign-in expires, reconnect the managed app in the host's connector settings, or use the direct MCP client's login flow for that route. When the server is unreachable, report the endpoint and error once.

## Sources

Check current host documentation before relying on routing or manifest behavior. OpenAI's [plugin packaging guide](https://developers.openai.com/plugins/build/plugins) covers registered app mappings; Codex's [app parser](https://github.com/openai/codex/blob/main/codex-rs/connectors/src/plugin_config.rs) and [routing policy](https://github.com/openai/codex/blob/main/codex-rs/core-plugins/src/app_mcp_routing.rs) define the declaration fields and name matching.
