# Testing in Codex

Read this when trying a plugin in Codex before it's published. Codex installs plugins only from a marketplace, and a plugin repo has none, so the test makes a throwaway one that points at the local folder.

## Steps

1. Make an empty folder for the test, and set `CODEX_HOME` to another empty folder. Never use the user's own `~/.codex`.
2. In the test folder, make a `plugins` folder and link the plugin into it with `ln -s <repo>/plugins/<plugin-id> plugins/<plugin-id>`. Codex reads only paths inside the marketplace folder.
3. Write `.agents/plugins/marketplace.json` with `"name": "local-test"` and one entry for the plugin whose source is `{"source": "local", "path": "./plugins/<plugin-id>"}`.
4. Run `codex plugin marketplace add <test folder>`, then `codex plugin add <plugin-id>@local-test`.
5. Run `codex mcp list` and check the server is there, then ask for something that needs the tool.

## Notes

- Codex installs a copy into `$CODEX_HOME/plugins/cache/`. After a rebuild, run `codex plugin add` again.
- Codex runs plugin hooks only after the user trusts them, so a hook test needs that step too.
- Delete both folders when done.
