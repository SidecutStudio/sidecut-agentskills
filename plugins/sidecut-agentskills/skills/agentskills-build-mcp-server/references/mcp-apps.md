# Views in the chat

Read this when a tool's result should appear as a view in the chat, such as a chart or a dashboard. The MCP Apps extension does this with an HTML page the server provides, which the host draws next to the tool's result.

## When a view is worth it

- The result is easier to read as a picture than as text, such as a trend over time or a table people sort.
- The same data still works as text, because hosts in a terminal show only the text.

When neither is true, return text and structured data only.

## How it fits together

1. Register the page as a resource with a `ui://` address, such as `ui://<server-key>/usage.html`, the MIME type `text/html;profile=mcp-app`, and the whole HTML document as its text.
2. Point the tool at it with `_meta.ui.resourceUri` set to that same address.
3. The tool still returns `content` with a short text summary and `structuredContent` with the data, so text-only hosts and tests keep working.
4. The host reads the page separately and sends it the tool's result. The page reads it in its `ontoolresult` handler from `@modelcontextprotocol/ext-apps`.

## Rules

- Bundle the page's scripts and styles into the HTML. Loading them from elsewhere needs the domains declared in `_meta.ui.csp`.
- Draw the view in both light and dark, and at phone width.
- The page shows data and sends nothing anywhere.

## Testing it

- Test the tool over stdio as usual, checking `structuredContent` and that `_meta.ui.resourceUri` names a resource the server lists.
- Open the page in a browser through the ext-apps `AppBridge`, send it a recorded tool result, and check it at chat and phone widths in light and dark.
- Check it in a chat app that draws views, such as Claude or the Codex desktop app. Claude Code and the Codex CLI show the text summary instead.
