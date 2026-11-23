# Public install

Read this when a public plugin repo has a new release and its README install steps need proving. Strangers can't read a private marketplace, so a public repo installs from its own marketplace files, and only a clean install from GitHub shows that works.

## Steps

1. Make two empty folders in the scratch folder, one for each host. Never use the user's own `~/.claude` or `~/.codex`.
2. In Claude Code, run the README's two steps as terminal commands with `CLAUDE_CONFIG_DIR` set to the first folder: `claude plugin marketplace add <org>/<repo>`, then `claude plugin install <plugin-id>@<plugin-id>`. Both report success, and `claude plugin list` shows the plugin at the new version.
3. In Codex, run the README's two steps with `CODEX_HOME` set to the second folder: `codex plugin marketplace add <org>/<repo>`, then `codex plugin add <plugin-id>@<plugin-id>`. `codex plugin list` shows it installed at the new version.
4. Delete both folders.

## Notes

- Both hosts fetch the repo anonymously from GitHub, so a step that works here works for anyone. A step that fails here fails for everyone.
- When a host can't run, such as no network, run `claude plugin validate .` at the repo root for the marketplace file and say which host went unproven.
- Copy install commands for a website or announcement from the README, word for word, with no output lines.
