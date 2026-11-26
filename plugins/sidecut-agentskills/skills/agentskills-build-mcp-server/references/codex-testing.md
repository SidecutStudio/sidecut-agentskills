# Testing in Codex

Read this when trying a plugin in Codex before it's published. Codex installs plugins only from a marketplace. A public repo carries its own, so set an empty `CODEX_HOME`, run `codex plugin marketplace add <repo>` and `codex plugin add <plugin-id>@<plugin-id>`, and go on from step 5. A private repo has none, so the test makes a throwaway one that points at the local folder.

## Steps

1. Make an empty folder for the test, and set `CODEX_HOME` to another empty folder. Never use the user's own `~/.codex`.
2. In the test folder, make a `plugins` folder and link the plugin into it with `ln -s <repo>/plugins/<plugin-id> plugins/<plugin-id>`. Codex reads only paths inside the marketplace folder.
3. Write `.agents/plugins/marketplace.json` with `"name": "local-test"` and one entry for the plugin whose source is `{"source": "local", "path": "./plugins/<plugin-id>"}`.
4. Run `codex plugin marketplace add <test folder>`, then `codex plugin add <plugin-id>@local-test`.
5. Run `codex mcp list` and check the server is there, then ask for something that needs the tool.
6. For a server that signs in, run `codex mcp login <server>` with the same `CODEX_HOME`, have the user finish the sign-in in the browser, then ask for a harmless read. Never run `codex mcp get` or print the config: they show the tokens.

## Notes

- Codex installs a copy into `$CODEX_HOME/plugins/cache/`. After a rebuild, run `codex plugin add` again.
- Codex runs plugin hooks only after the user trusts them, so a hook test needs that step too.
- The same goes for Claude Code: a `claude` command that isn't a plain `--plugin-dir` session sets `CLAUDE_CONFIG_DIR` to an empty folder.
- This plugin's subagents are held to this by a hook, which refuses a `codex` or `claude` command without a throwaway home and any read of `~/.codex`, `~/.claude` or `~/.claude.json`.
- Delete both folders when done.
