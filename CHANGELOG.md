# Changelog

## [2.5.0] - 2026-11-24

### Changed

- `agentskills-review-plugin` and `agentskills-rebuild-plugin` choose the report format in a numbered step: 5 or more problems, or a parity table, go out as an HTML report with the verdict in chat.
- `server/data/visual-reports.md` replaces "when it makes the answer clearer" with a concrete test, and drops the lines that steered reviews back into chat.
- `server/data/user-input.md` adds Offer follow-ups: a finished review offers its next actions as one question through the host's question tool, instead of a prose "want me to" line; `agentskills-review-plugin` uses it.
- The house style's Visual reports section adds review rows for where the format is chosen and how follow-ups are offered.

## [2.4.3] - 2026-11-24

### Changed

- Refreshed `README.md`, `AGENTS.md`, and `server/data/house-style.md` to match current repository layout (`bin/`, `evals/`, `scripts/`), CLI commands (`sidecut-icon`, `sidecut-version`), `SCAN_TEXT` rules, and Gemini/Antigravity guidance.

## [2.4.2] - 2026-11-24

### Changed

- `agentskills-build-mcp-server` and `agentskills-design-workflow` document Antigravity/Gemini (`mcp_config.json`, `variables`, and `agents/<role>.md` with `subagent: true` and native tool names) alongside Claude Code and Codex.

## [2.4.1] - 2026-11-24

### Changed

- `agentskills-build-mcp-server` documents `mcp-remote` as a stdio bridge option in `references/remote-servers.md` for hosts without native remote OAuth, when OAuth origin/redirect checks fail, or for legacy SSE endpoints, along with `--header` and `--transport` flags.

## [2.4.0] - 2026-11-24

### Added

- `check_plugin` warns about a step or paragraph over 120 words (`SKILL_LONG_STEP`) and a line of 12 or more words that two of a plugin's skills both carry (`SKILL_REPEATED_TEXT`), such as one failure list pasted into every skill. A pointer to the plugin root or a shared file may repeat.

### Changed

- The house style says SKILL.md is the skill's source, written by hand: an MCP prompt or command that needs the same instructions reads the file, and a repo rule that regenerates skills is drift to remove.
- `agentskills-rebuild-plugin` replaces a skill generator with hand-written skills, and matches the user's other plugins in the same marketplace. `agentskills-review-plugin` checks for a generator and reads the plugin next to two of its siblings. `agentskills-write-skill` says shared text once.

## [2.3.0] - 2026-11-23

### Changed

- The guide skills follow before asking a question is `server/data/user-input.md`, and the house style, templates and skills say "user" where they meant the person being asked. `sidecut-sync` removes a repo's old `owner-input.md` and points its skills at the new file.

## [2.2.0] - 2026-11-23

### Added

- `get_house_style` takes a `profile` and adds that profile's extra rules, from the user's saved profile when none is given.
- A portability test fails when a shipped file names a private repo, Sidecut Studio's own workflow or products, or a personal path outside the `sidecut` profile.

### Changed

- Agentskills works for anyone with no private setup: with no profile, `scaffold_plugin` writes no workflow settings file or markers, and the checker no longer asks for them.
- Everything Sidecut Studio uses only for itself, its workflow, private CI repo and shared marketplace, lives in the optional `sidecut` profile.
- `agentskills-publish-plugin` publishes to the plugin's own repo or any shared marketplace, following that marketplace's own instructions.
- The release script reads its required checks from a workflow settings file only when the repo keeps one, and otherwise requires `check` and `secrets`.
- `sidecut-icon` draws the full stop in the repo's brand color.
- `get_house_style` returns a profile's rules as a section of their own, such as `Sidecut profile`.
- The README, skills, examples and visual report frame describe plugins in general terms.

## [2.1.3] - 2026-11-23

### Changed

- Skill authoring guidance shows how to adapt upstream patterns, scope context, and make a skill's optional guidance and file changes discoverable.
- Workflow design guidance covers setup inspection, scoped repair, context packs and evidence-backed docs scaffolding and refresh.

## [2.1.2] - 2026-11-22

### Fixed

- On Windows, `sidecut-check` and `check_plugin` no longer report every skill support file as `SKILL_FILE_UNEXPECTED`, and every reported file uses `/` separators, as on Linux and macOS. `scaffold_plugin` and `add_skill` list the files they wrote with `/` too.

## [2.1.1] - 2026-11-22

### Changed

- The hooks guide in `agentskills-design-workflow` shows how a `PreToolUse` hook blocks a call on both hosts, says that matching hooks run at the same time and any deny wins, says to treat hook input as untrusted, and says to start a new session after changing a hook.

## [2.1.0] - 2026-11-21

### Added

- `SCAN_TEXT`, an advisory that names each shipped text file mentioning credentials, CI secrets, your own CI runners, an unpinned package launcher or a download-and-run install. Claude's plugin scan reads those files, not the MCP server, and a plugin whose files stopped naming such things lost its Caution label. It never fails a check. A plugin whose job is that text lists its files under `scanTextAllow` in `.agentskills.json`.

### Changed

- The CI templates' runner labels, secret and token names, and pinned tool downloads now come from the server's code, so Agentskills' own shipped files have nothing for `SCAN_TEXT`. Generated CI files are unchanged.

## [2.0.0] - 2026-11-21

### Added

- Settings for who publishes a plugin: GitHub owner, author, homepage, plugin-id prefix, marketplace, CI mode, licence and brand color. Scaffolding reads a call's answers over `~/.config/agentskills/settings.json` (or under an absolute `$XDG_CONFIG_HOME`); each new repo records what it was made with in `.agentskills.json`, which check and sync read, falling back to what the manifests say. Values that would need escaping in JSON or YAML are refused, and `save: true` saves the settings only after the repo is written.
- The `sidecut` profile, which holds Sidecut Studio's values as one setting.
- A new plugin lists itself as a marketplace by default, with both marketplace files and the README steps that add this repo.
- Hosted CI by default: `check`, `secrets` and `gate` on GitHub-hosted `ubuntu-24.04`, and a release job on the same.

### Changed

- `scaffold_plugin` asks once: with no saved settings it writes nothing and returns the questions, then saves the answers when called again with `save: true`. `npm run new` takes the same answers as flags.
- The templates and `check_plugin` read the owner, author, homepage, prefix, marketplace, CI mode and brand color from settings instead of assuming Sidecut Studio.
- `agentskills-create-plugin` asks the settings questions once, and `agentskills-publish-plugin` publishes to the repo's marketplace instead of always to one shared marketplace.
- Upgrading: existing Sidecut repos keep working unchanged, since a repo with no `.agentskills.json` whose manifest points at a SidecutStudio repo is checked and synced with the `sidecut` profile. To pin it, add `.agentskills.json` with `{ "profile": "sidecut" }`.

## [1.4.1] - 2026-11-20

### Changed

- `check_plugin` and `sidecut-check` start the checked repo's server with only `PATH`, `HOME`, temp and locale variables, so it never sees a token from the environment they run in. The tool description and server instructions say it builds that server with the repo's own `esbuild` and starts it.
- The usage log hook in `hooks.json` runs as `"command": "node"` with the script in `args`, so it starts on Windows without Git Bash. The template and `HOOK_COMMAND` follow; `codex-hooks.json` keeps the one-line form.
- The README's Privacy section lists what the plugin runs on your machine and what each part reads and writes.

### Removed

- The rules hook that rebuilt `~/.codex/AGENTS.md` from `~/.claude/rules` at the start of each session. It moved out of Agentskills, so Agentskills runs no hook at session start.

## [1.4.0] - 2026-11-19

### Added

- `README_INSTALL_BLOCK` in `check_plugin` and `sidecut-check` flags a plugin README whose Install section has no code block.

### Changed

- The README pattern shows rather than tells: install commands sit in a code block with short `#` comments, and a plugin built around a file people write ends Use with one commented example of it. The template's README follows it.
- The public install check ignores a trailing `#` comment on each step.

## [1.3.0] - 2026-11-19

### Added

- `CI_TOOLS` in `check_plugin` and `sidecut-check` flags a job that uses `setup-ci-tools` without installing Bun first.

### Changed

- The template's pull request jobs ask for the lighter runner label the runner picker now routes them to, and the secrets job no longer installs Node.js.

### Fixed

- The template's Check and Release workflows install trufflehog and gh from their pinned downloads with a checksum check. The `setup-ci-tools` action runs on Bun, which plugin repos no longer install, so repos made from 1.2.x failed their secrets job and would fail their first release.

## [1.2.2] - 2026-11-18

- New skills from the template point to the owner-input guide in a plain sentence instead of a leftover comment.

## [1.2.1] - 2026-11-18

- Ask for material owner choices through the active host's question tool, with a chat fallback. Reuse settled requirements and keep unanswered permission requests pending.
- Include the shared owner-input guide in plugin scaffolds and skill templates.

## [1.2.0] - 2026-11-18

### Added

- Generate both host versions and the npm lock version with sidecut-version.
- Share the checked GitHub release workflow across Sidecut plugin repositories.

## [1.1.0] - 2026-11-18

### Changed

- Keep behavioural eval cases in the development repository, outside installed plugins. Stage a temporary plugin for native Claude Code evals.
- Simplified the workflow section of `AGENTS.md`.

## [1.0.0] - 2026-11-18

### Changed

- Use Node.js, npm, esbuild and Vitest for plugin development, checks and distribution.
- Separate editorial guidance from functional standards; remove mandatory prose structures.

## [0.12.0] - 2026-11-17

### Changed

- The usage log hook is on by default. It still records only `time`, `plugin`, `skill` and `host` to `~/.sidecut/skill-log.jsonl` and sends nothing. `SIDECUT_SKILL_LOG=0` (or `false`, `off`, `no`), `DO_NOT_TRACK=1` or a CI environment turns it off. Plugins copy the new `post-tool-use-skill-log.mjs` from the template to pass `HOOK_SKILL_LOG`.
- The house style's usage log switch, the template README, SECURITY and plugin tests, `agentskills-show-usage` and the Expo pattern verdict say the same.

## [0.11.0] - 2026-11-16

### Added

- Added this repo's own install source, `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`, so anyone can install Sidecut Agentskills from GitHub without a private marketplace.
- Added the Install source section to the house style: a public repo carries both marketplace files and its README gives install steps that work without any private marketplace.
- Added `README_INSTALL` to `check_plugin` and `sidecut-check`, which flags a public repo's README whose install steps name a marketplace the repo doesn't provide.
- Added `public-install.md` to `agentskills-publish-plugin`, which proves a public repo's install steps from clean Claude Code and Codex profiles.

### Changed

- Changed the README's Install section to the public steps for Claude Code and Codex.
- Changed `REPO_MARKETPLACE` to require both marketplace files in a public repo, listing only its plugin, and to allow none in a private one.
- Changed `agentskills-create-plugin`, `agentskills-rebuild-plugin`, `agentskills-review-plugin` and `agentskills-publish-plugin` to set up, check and prove a public repo's install source.

## [0.10.0] - 2026-11-16

### Added

- `agentskills-show-usage` reads the shared skill log and shows which Sidecut plugin skills ran in Claude Code and Codex, whether recording is confirmed in each host, and what the log can't see, such as plugins without the hook.
- The house style's usage log rules say how the log is read: one reader for every plugin that keeps it, and a plugin with richer usage of its own may add a `<prefix>-show-usage` skill that checks recording works.
- The house style's visual report rules ask for two or three rendered directions with the real words, after researching real examples, before a new page or identity is built.

### Changed

- Visual reports open where the user already is: an Artifact or the built-in browser in Claude Code, the in-app browser in Codex. They are no longer handed over as files to download.

## [0.9.2] - 2026-11-16

### Fixed

- The `agentskills-unsure` router eval counted any Agentskills skill as the router, because `input_match` is a regular expression and every skill name starts with the router's. It now anchors on the closing quote, and `agentskills-write-skill`'s eval reference says how to do the same for any router.

## [0.9.1] - 2026-11-16

### Added

- `REPO_CHECKER_VERSION`: the checker reports when the sidecut-agentskills in `node_modules` isn't the version `package.json` pins, so a stale install can't pass a check that CI fails. `agentskills-publish-plugin` says what to do about it.
- `agentskills-write-skill` says how to scaffold the router with `add_skill`.

### Fixed

- `scaffold_plugin` pinned `sidecut-check` to the new plugin's own version (`#v0.1.0`) instead of this release, so a fresh repo failed `bun run check` and had no `sidecut-icon`. It now pins the Agentskills version that generated it.
- `add_skill` refused the router's name, though the checker requires a router once a plugin has 4 or more skills. It now writes a router skeleton for the prefix alone.
- The heading-case check rejected a router's display-name title, which `SKILL_TITLE` requires. `SKILL_TITLE` already pins every skill's H1, so the case check skips it.
- The house style named the router's H1 `# Start`; it is the plugin's display name, as the checker and the title rule say.
- The layout check flagged a `.codex/` folder holding only the ignored subagent profiles skills copy into `.codex/agents/`. It now treats that folder as host state, like `.claude/`, and the template `.gitignore` ignores `.codex/agents/`.

## [0.9.0] - 2026-11-15

### Added

- Added visual-report guidance, a Sidecut HTML/CSS layout and licensed offline Geist fonts for useful comparisons, diagrams and reports.
- Added the Visual reports house-style section, available through `get_house_style`.

### Changed

- Plugin reviews, rebuilds, workflow designs and tool comparisons used visual reports where helpful. Skill authoring covered visual-output procedures and packaged assets when applicable.

## [0.8.5] - 2026-11-14

### Changed

- `agentskills-publish-plugin` names the repo in every `gh` command and counts a release only when its repo, version and commit all match the merge.
- `agentskills-rebuild-plugin` settles the whole rename with the user before building: plugin id, skill prefix, repo name, config and state file names, and how existing installs move over.

## [0.8.4] - 2026-11-14

### Changed

- `agentskills-publish-plugin` ships a plugin built in another repo by bundling the released tag or `main` commit into its shared marketplace, since claude.ai can't install straight from a private plugin repo. It no longer edits `git-subdir` pins in both marketplace files.

## [0.8.3] - 2026-11-14

### Fixed

- The repo layout check no longer fails a checkout where Claude Code keeps its worktrees in `.claude/worktrees/` next to ignored local settings. Anything else in `.claude/`, a tracked or unregistered worktree, or a symlinked `.claude/` still fails.

## [0.8.2] - 2026-11-14

### Fixed

- Renamed plugins can retain their original repository URL through an explicit `REPO_PLUGIN_ID` exception. Full repository checks and template sync stay active instead of treating the repository as an app that merely contains a plugin.

## [0.8.1] - 2026-11-14

### Changed

- Guidance and checker messages use the workflow's shorter skill names.

## [0.8.0] - 2026-11-14

### Added

- The MCP skill covers bundling an existing registered app connector, with verified identity, managed and direct connection routes, and separate installation, authentication and view checks.
- The checker accepts `.app.json` and its Codex manifest reference, validates declarations and catches mismatched names or a managed app hiding a local server.

### Changed

- Hosted connections take their own path through the skill without local-server build steps. View checks use the intended host instead of assuming all Codex editions render text only.
- Generated project guidance includes the managed connector and remote fallback rule.

## [0.7.2] - 2026-11-14

### Changed

- `agentskills-publish-plugin` also publishes a plugin that lives inside another product's repo, such as an app. That kind is pinned in its marketplace to one commit of `main` by its `sha`, not to a release tag. The skill says how to tell the two apart from the marketplace entry.

## [0.7.1] - 2026-11-14

### Fixed

- An app repo that ships a plugin next to its own code gets the plugin checks only, even when its `package.json` is named after the plugin. The whole repo is checked only when the manifest's `repository` is named after the plugin, or after the plugin without `sidecut-` and the package is named after the plugin.
- `sidecut.keep` works when only the plugins are checked, and a key that no longer covers anything fails there too.

## [0.7.0] - 2026-11-13

### Added

- A session-start hook keeps your personal rules the same in both hosts. It rebuilds `~/.codex/AGENTS.md` from `~/.claude/rules/*.md`, so you only edit the rules folder. It does nothing until you run it once with `--init`.

## [0.6.1] - 2026-11-13

### Changed

- A plugin repo may have a `docs/` folder for longer documentation, such as a specification.

## [0.6.0] - 2026-11-13

### Added

- `sidecut-sync` keeps a plugin repo up to date with sidecut-agentskills. It moves the repo to the latest release, then rewrites the files the house style owns (`CLAUDE.md`, `scripts/build-server.ts`, `scripts/release.ts`), the blocks marked `sidecut:start house-style` in `.gitignore`, `AGENTS.md` and `SECURITY.md`, and raises the shared tool versions in `package.json`. Everything outside the blocks stays the repo's. `--check` lists the changes without making them.
- A repo lists deliberate differences under `sidecut.keep` in `package.json`, each with its reason. The checker shows them as kept and fails a key with no reason or one that no longer covers anything.
- The checker's first line says whether it checked the whole repo or only its plugins, and why. `check_plugin` returns the same, plus the kept differences.

### Changed

- `REPO_SYNC` replaces `REPO_CLAUDE_MD`, `REPO_GITIGNORE`, `REPO_RELEASE_SCRIPT` and the build-script copy check.
- `check` and `build` may add the repo's own steps, as long as the standard ones run in order.
- The template's `.gitignore` also ignores personal workflow overrides and `.claude/settings.local.json`.

## [0.5.1] - 2026-11-13

### Fixed

- The checker runs the repo checks on a plugin repo that kept an older name, when its `package.json` is named after the plugin. Before, such a repo skipped them all.

## [0.5.0] - 2026-11-13

### Added

- Every plugin repo releases itself. The template adds `release.yml` and `scripts/release.ts`, the same in every repo. After Check passes on `main`, they publish the manifest version if it has no release yet: the `v<version>` tag, a GitHub Release with the CHANGELOG entry, the plugin folder as a ZIP and its checksum. They never replace a published release.
- The checker reports a repo with no release workflow (`CI_RELEASE`) or a changed release script (`REPO_RELEASE_SCRIPT`).

### Changed

- `agentskills-publish-plugin`: merging the version bump is the release. It confirms the published release instead of tagging by hand.
- `agentskills-review-plugin` and the subagent guidance size reviews to the change, using review levels. Light gets no reviewer, standard gets the reviewer on a cheaper model, and deep gets it on the parent model. A rebuild is always deep.
- This repo now publishes its own releases this way.

## [0.4.0] - 2026-11-13

### Changed

- `agentskills-rebuild-plugin` records each skill's hard rules (every never, always, only when, don't and must) and each hook's decisions on fixed inputs, and counts a weaker rule or a changed decision as a regression even when the tests pass.
- `agentskills-rebuild-plugin` finds every place outside the repo that uses a name the rebuild changes, asks before renaming anything already in use, and updates the marketplaces and other repos after the release.
- `agentskills-rebuild-plugin` pushes a draft PR early and after each step, and keeps parity records and rebuild notes out of the repo's files.
- Skills name a subagent as `<plugin id>:<role>` in Claude Code, and the checker accepts that form instead of reporting a missing skill.
- Skills and the checker point at the workflow's renamed skills.

## [0.3.0] - 2026-11-13

### Added

- `sidecut-icon` (`bun run icon` here) draws a plugin's icon: a near-black rounded tile, one white Lucide mark and an orange full stop. A new plugin starts with a plain box mark, and `agentskills-create-plugin` asks which mark it should have.

### Changed

- Every plugin's `brandColor` is `#FF6B00`, and the checker enforces it. `scaffold_plugin` and `bun run new` no longer take a brand color.
- Each skill's `agents/openai.yaml` sets `icon_small` and `icon_large` to `../../assets/icon.png`, so Codex shows the plugin's icon beside its skills.
- Sidecut Agentskills has its own icon, a blocks mark.

## [0.2.1] - 2026-11-13

### Changed

- `agentskills` asks what a request's result is for before handing over, and sends a view drawn in the chat to `agentskills-build-mcp-server`.
- `agentskills-build-mcp-server` checks the tool in Codex as well as Claude Code, works with any repo's build and test commands, and has new references on testing in Codex and on views drawn in the chat.
- The tool-design reference says why tools take the project's path, to keep required inputs few, and to keep the field names of JSON a tool wraps.

### Fixed

- `check_plugin` no longer crashes on a folder inside a skill's `references/`, `examples/` or `scripts/`. It reports the folder as `SKILL_FILE_UNEXPECTED`.

## [0.2.0] - 2026-11-13

### Added

- The `reviewer` subagent, which `agentskills-review-plugin` and `agentskills-rebuild-plugin` hand work to. `bun run build` writes its Codex profile to `codex/agents/`, and the skills copy it into the project before the first use in Codex.
- Skill metadata for both hosts: `argument-hint`, `model` and `effort` in the frontmatter, pre-approved MCP tools in `allowed-tools`, and `brand_color` and the invocation policy in `agents/openai.yaml`. The checker enforces each.
- `hooks/codex-hooks.json`, so every hook also runs in Codex. The usage log counts a skill in Codex when Codex reads its `SKILL.md`.

### Changed

- Every skill name starts with the plugin's short name: `agentskills-write-skill`. The router is `agentskills`, replacing `start`.
- Codex reads `.codex-plugin/plugin.json` and a `mcp.json` that runs the server with `cwd: "."`. The root Agent Plugins 1.0 `plugin.json` is gone, because with it Codex loads none of the plugin's hooks.
- The hooks and subagents guidance covers Codex, which has both.

### Fixed

- The usage log records `codex` as the host in Codex; it used to say `claude-code` in both.
- `bun run build` follows a licence file that is a symlink.

## [0.1.2] - 2026-11-13

### Added

- Every plugin repo builds with `scripts/build-server.ts`, which also writes `server/THIRD_PARTY_LICENSES.txt` with the licence of each package the bundle inlines. It reads every file whose name starts with licence, license or copying, in any case, and falls back to the package's `license` field. The checker requires both.
- `bun run check` ends with `bun scripts/build-server.ts --check`, so a stale bundle or licence notice fails it.

### Fixed

- Display names keep acronyms in capitals, so `acme-ci` is `Acme CI`. The house style lists them.
- The template server finds its manifest from its source as well as its bundle.
- The checker's public-repo CI rule no longer skips a job that has no `runs-on`, reads jobs at any indentation, and its runner hint fits public repos.
- `bun run new` rejects a long description that isn't 2 or 3 sentences, as the checker does.
- A package bundled from a nested `node_modules` or Bun's isolated store is credited to itself, not the package above it.
- `publish-plugin`'s marketplace reference uses the HTTPS URL, which Claude Code can clone without SSH keys.

## [0.1.1] - 2026-11-13

### Changed

- The checker accepts a public repo's CI when every job runs on `ubuntu-24.04`, and the house style says so.

## [0.1.0] - 2026-11-12

### Added

- `build-mcp-server` skill.
- `create-plugin` skill.
- `design-workflow` skill.
- `publish-plugin` skill.
- `rebuild-plugin` skill.
- `review-plugin` skill.
- `start` skill.
- `write-skill` skill.
- `get_house_style`, `get_patterns`, `check_plugin`, `scaffold_plugin` and `add_skill` tools.
- Plugin and repo templates, and the `sidecut-check` command that other plugin repos run as `bun run style`.
- Local usage log, off unless `SIDECUT_SKILL_LOG=1` is set.
