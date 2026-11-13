---
name: demo-check-status
description: "Checks that the Sidecut Demo MCP server is running and reports its version. Use when the plugin's tools fail or seem missing, or after installing or updating it. Not for problems in other plugins."
---

# Check status

Confirms the Sidecut Demo MCP server answers and tells the user which version is running.

## Steps

1. Call the `get_status` tool.
2. Tell the user the plugin name and version from the result.

## When it goes wrong

- **Tool missing:** tell the user the MCP server isn't loaded and that restarting the session or reinstalling the plugin usually fixes it. Stop.
- **Tool returns an error:** report the error message once and stop.

## Done when

The user knows whether the server is running and which version it is.
