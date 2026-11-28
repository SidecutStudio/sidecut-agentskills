# Changelog

## [2.18.0] - 2026-11-27

### Added

- `sidecut-check` blocks hard-coded home-directory paths (`LEAK_PATH`), local machine and runner hostnames (`LEAK_HOSTNAME`), and links to private repositories or private sites in shipped or public files (`LEAK_LINK`).

### Changed

- Heuristic copy, staleness, pointer, bloat and skill-description phrasing checks (`STALE_DATED`, `DEAD_POINTER`, `AGENTS_BUDGET`, `SKILL_DESCRIPTION_SHAPE`, `COPY_WEAK`) report as advisories and warnings and never fail `sidecut-check`.
- Repo-kind detection on a clean checkout reads `web/package.json` alongside root `package.json` and detects sites kept under `web/` or marked by `sitemap.xml`.
- Both the text scanner and `TEST_GIT_ENV` skip nested git repositories ignored by `.gitignore`.
- `sidecut-sync` supports Bun repositories (`bun.lock` with no `package-lock.json`), protecting `bun.lock`, keeping `packageManager`, and running `bun install` when `package.json` changes.

## [2.17.0] - 2026-11-27

### Added

- `get_settings` and `save_settings` MCP tools. `get_house_style` puts your own house style guide first when your settings name one.

### Changed

- A stranger's first use now sets Agentskills up for them. Before any skill names or creates anything, it asks, together and once: your GitHub owner, author name and URL, plugin id prefix (none is fine), marketplace, licence, CI mode, and the house style and voice to follow (Agentskills' own, adapted, or your own guide). It saves the answers to `~/.config/agentskills/settings.json`, says in one line where they live and how to change them, and every later skill reads them and says which it's applying. The setup questions no longer offer the `sidecut` profile; Sidecut Studio's values apply only when you name that profile.
- New repos made with your own settings carry no Sidecut names. Agentskills' marked blocks, `package.json` key and usage log go under `agentskills` (`agentskills:start`, `agentskills.keep`, `AGENTSKILLS_SKILL_LOG`, `~/.agentskills/skill-log.jsonl`). The `sidecut-check`, `sidecut-icon` and `sidecut-sync` commands keep their names. The checker reads both namespaces, and a repo keeps the one it already uses, so repos made before this keep passing unchanged. Your house style and voice guides stay in your own settings file, never in a repo. Repos with the `sidecut` profile come out byte for byte as before.
- Skills mean your house style when they say "the house style", starting from Agentskills' own, and mention Sidecut only for the Sidecut profile. `agentskills-show-usage` reads both usage logs.

## [2.16.0] - 2026-11-27

### Added

- `sidecut-check` checks a whole repo of any kind: `plugin`, `app`, `marketplace`, `ops`, `site` or `data`, declared as `sidecut.kind` in `package.json`, read from the profile's repo index or guessed from the files. Each kind other than a plugin repo keeps the AGENTS.md sections of its template in `templates/kinds/`; an app's starts with a "Read this when" map. AGENTS.md carries the current Solo block and CLAUDE.md imports AGENTS.md.
- Rules over every repo's text: internal links, retired names (CHANGELOG and tests may keep them), dated "as of" notes, pointer-only files, identical copies that nothing keeps the same, an AGENTS.md past 200 lines or 32 KiB, the owner described in public copy, and facts `owners.toml` gives to another repo (runner labels, plugin and CI action versions, the merge gate) written out in docs.
- Advisories for another repo's reserved port written out, Markdown nothing links to, docs over 500 lines, reference files under 30 lines that one skill reads, and stock phrases and hedges. In GitHub Actions the checker prints problems as errors and advisories as warnings on changed lines only, with one notice per kind.
- `sidecut-check --fast` runs the quick text and shape rules for a pre-push guard (`templates/kinds/lefthook.yml.tmpl`), and `--links` checks external links, for a scheduled job.
- `sidecut-sync --fix` writes the current Solo block, adds CLAUDE.md's `@AGENTS.md` import and replaces the retired studio name, in a repo of any kind.

### Changed

- A repo that ships a plugin beside other work, or holds several plugins, gets the plugin checks and its kind's checks, instead of the plugin checks only. With no `sidecut.kind` and no repo index the kind is guessed, usually app or marketplace, so such a repo now needs its kind's AGENTS.md sections and CLAUDE.md import: declare `sidecut.kind`, or list a deliberate difference under `sidecut.keep`.
- `sidecut-sync` keeps `server/data/visual-reports.md` and `visual-report.css` identical in every plugin that carries them. The guide's agent-tooling table moved into the house style's Visual reports section, and the guide now covers Gemini/Antigravity.

## [2.15.0] - 2026-11-27

### Added

- `publish-plugin.yml` takes an optional `plugin` input, so a repo whose `package.json` names an app can release its plugin. The plugin's manifests then carry the version. Callers that leave it out behave as before.

## [2.14.0] - 2026-11-27

### Added

- Plugin scaffolds now write a status trigger and an adjacent-plugin near miss from the portable eval fixtures. Skill scaffolds seed a trigger from the skill description, and a `<prefix>-summarize-notes` skill gets both notes cases with their shared workspace file. `agentskills-write-skill` points to the bundled cases and shows how to adapt them.

### Changed

- On the next `sidecut-sync` after updating to this release, a dedicated plugin repo gets the new status prompts and routing graders in place of any untouched older starter cases. Edited cases and suites tracked by `evals-source.json` keep their current contents.
- `sidecut-check` now requires a router's own trigger case when its name also prefixes a specialist's case.

## [2.13.0] - 2026-11-27

### Added

- Antigravity can run more than the usage log hook. A script runs there once the plugin's root `hooks.json` names it, and `sidecut-sync` then writes its entries from its `PreToolUse`, `PostToolUse`, `Stop` and `SessionStart` ones in `hooks/hooks.json`, with Antigravity's tool names in the matcher, and drops it when the Claude Code hooks stop registering it. Solo had kept a hand-written `hooks.json` for its merge guard and turn guard; sync now writes the same file.

### Changed

- The user-input guide tells Gemini/Antigravity to show new options, drafts or results in a finished chat turn before calling `ask_question`, since the question prompt there covers what the same turn just wrote. Solo had carried this as a local difference.
- The hooks guide covers Antigravity's hooks and adds three lessons from Solo's guards: keep a hook's work linear in its input, decide from words or recorded state instead of parsing shell commands, and act in a prompt hook only on what the user typed.
- The `reviewer` agent can read current docs with WebFetch and WebSearch, and cites them or marks a finding unverified when it turns on how a host, library or service behaves.

## [2.12.1] - 2026-11-27

### Fixed

- `agentskills-build-mcp-server` said `.app.json` takes the `plugin_asdk_app_…` id from the ChatGPT plugins page. It takes the same id without the `plugin_` prefix (`asdk_app_…`), the form Codex's own code and installed plugins use.

## [2.12.0] - 2026-11-26

### Changed

- The Sidecut CI template scans for secrets with the studio's shared `scan-secrets` action, which installs the pinned TruffleHog without Bun and fails on any verified or unknown secret the commit reaches, in place of the curl, checksum and tar lines each repo carried. The hosted template keeps its pinned download, since a repo outside the studio can't use an action from a private repo.

## [2.11.1] - 2026-11-26

### Fixed

- The CI templates pinned `actions/setup-node` at v6 while repos that don't sync from them had moved to v7.1.0, so every plugin repo synced from Agentskills fell back to v6. They now pin v7.1.0. Dependabot can't see the templates, so a test fails when a template pins an action at a different commit than this repo's own workflows, and this repo now has a Dependabot config that moves those.

## [2.11.0] - 2026-11-26

### Added

- `agentskills-build-mcp-server` had a route for turning a new hosted server into a registered app: the owner registers it on the ChatGPT plugins page and copies its `plugin_asdk_app` id into `.app.json`, with the direct MCP route kept under the same name as its fallback. In Claude, the server stays a direct MCP entry in Claude Code and can be added as a custom connector or submitted to the directory. The steps link each host's current docs. Before, the only app route assumed a connector that was already registered, so a new server shipped to Codex as a plain server entry. A trigger case, from sidecut-evals, covers the request.
- A hook refused this plugin's subagents, such as the reviewer, any `codex` or `claude` command without a throwaway `CODEX_HOME` or `CLAUDE_CONFIG_DIR` in the same command, and any read of `~/.codex`, `~/.claude` or `~/.claude.json`, telling them what to run instead. Claude Code and Codex both send the subagent's name to the hook, so the main session is untouched. A reviewer had run `codex mcp list` against the owner's own config, which printed a live token. The reviewer's instructions in both hosts say the same.

### Changed

- `agentskills-publish-plugin` stopped before releasing a plugin whose hosted server signs in until sign-in had been done through Claude Code and Codex themselves, ending in a harmless read. A scripted OAuth client doesn't count. A host left unproven needs the user's agreement and is named in the CHANGELOG entry. Codex's `codex-testing.md` gained the sign-in step in an isolated profile.

## [2.10.1] - 2026-11-26

### Fixed

- `sidecut-sync` put the `git-env` block after a test preload's imports when the file has no line it can anchor to. It used to go at the very top, above the imports, which Biome's import ordering rejects.

## [2.10.0] - 2026-11-26

### Added

- `sidecut-check` reported `TEST_GIT_ENV` when test code runs git and nothing drops the `GIT_*` variables a git hook exports, so a test run from a pre-push hook can't write into the real checkout (one set `core.bare=true` there). Dropping them in the test preload (Vitest, Jest or Bun), in the test itself or in a helper it imports all count, as does giving git an env of its own; reading them doesn't. git run through a variable or an alias, or from the code under test, isn't seen. The template's `tests/setup.ts` carries a `git-env` block that does it, and `sidecut-sync` adds the block to a repo's existing `tests/setup.ts`.
- `sidecut-check` reported `SOLO_REQUIRED` for any `required_checks` entry that no workflow job reports, such as `secrets` left behind after the two-job CI template, since the merge gate would wait for it forever. A job's `name:`, matrix entries, called workflows and names built from expressions count. A check another service reports goes under `sidecut.keep`.
- `sidecut-evals-stamp` checked a repo's copied evals against `evals-source.json` without the rest of `sidecut-check`, for repos not built from the template. The tree hash now lives in one place: `sidecut-check` and `sidecut-evals-stamp` use it, and sidecut-evals imports the same code from `bin/evals-hash.mjs`. A symlink loop in a copied folder is a finding instead of a hang.

### Changed

- `sidecut-sync` synced a repo that ships its plugin beside other work, such as an operations repo with its CI plugin, instead of printing "Nothing to sync": the usage log hook, the Antigravity files, the packaged guide, `scripts/eval.mjs` once the repo has `evals/`, the marked blocks it already carries and the checker pin. It leaves that repo's other files and its own tool versions alone, and `sidecut-check` reports the same drift there as `REPO_SYNC`.
- The template's `scripts/eval.mjs` found its plugin as the one folder in `plugins/` with a Claude Code manifest, so it runs where the package is named after other work.
- A repo without esbuild got a `SERVER_BUILD` problem that says the checker builds the server with the repo's own esbuild and that Bun's bundler can't stand in, instead of "Cannot find module 'esbuild'". The house style says a Bun-only repo adds esbuild too.

## [2.9.0] - 2026-11-26

### Changed

- The Sidecut CI template ran a pull request in two jobs instead of three: the TruffleHog secret scan moved to the last steps of `check`, which now clones full history, and the `secrets` job is gone, so a PR takes one fewer runner slot. The runner picker job skipped itself in `air` mode instead of taking a light runner to answer, and pinned the picker's newest release, which counts only private-repo hosted minutes. A new Sidecut-CI repo's Solo settings and release script required only `check`; hosted CI keeps its `secrets` job. An existing Sidecut-CI repo that takes the new `check.yml` drops `"secrets"` from `required_checks` first.

## [2.8.1] - 2026-11-26

### Fixed

- Two quick merges each publish their own version. The release script used to quit when main had moved past its commit, so the earlier version was never tagged (sidecut-home 0.3.0 and 0.4.0). It now publishes any checked commit still on main, and marks it Latest only when no newer version is tagged. The template's Release workflow keeps every waiting run (`queue: max`), so a third quick merge no longer cancels the second one's release. This applies to the template's `scripts/release.ts`, so repos pick it up with `sidecut-sync`, and to this repo's own release script.
- `scaffold_plugin` says which Agentskills version its templates came from (`templatesVersion`). A session's server can be older than the release a repo pins, and copying its files into that repo brought back old versions of `scripts/eval.mjs` and the usage-log hook. The rebuild skill now checks the version before copying.

## [2.8.0] - 2026-11-26

### Added

- `sidecut-check` reported `EVAL_SOURCE` when a repo's `evals-source.json` lists a copied evals folder whose files no longer match its recorded hash, so evals generated from another repo can't be edited in place unnoticed. A repo without the file is unchanged, and the file is part of the repo layout.

## [2.7.0] - 2026-11-26

### Added

- `agentskills-rebuild-plugin` shipped `scripts/record-parity.mjs`, which records a plugin's tools, read-only tool output on fixed inputs, skills, hard-rule lines and hooks as JSON in one run, for the before and after comparison.
- `sidecut-check` reported `SKILL_ALLOWED_MCP_MISSING` when a skill names a read-only tool of its plugin's server that `allowed-tools` doesn't list. A repo moving to 2.7.0 lists each read-only tool its skills name, usually `get_status` in its status skill; `sidecut-sync` doesn't add it. The template's status skill lists `get_status`, and `agentskills-publish-plugin` lists `get_house_style`, which it reads.

### Changed

- `agentskills-rebuild-plugin`'s parity record included the trigger evals before and after, and treated a case that already failed before the rebuild as a known failure to rerun, not a regression.
- The template's `scripts/eval.mjs` passed `--trust-plugin`, so `npm run eval` ran in a background or CI shell instead of stopping at the trust prompt. `sidecut-sync` carries it to each repo.
- The house style let a plugin for a product with its own results view name that view as the visual for its comparisons.

### Fixed

- The usage log hook counted an Antigravity `read_file` or `view_file` read of a skill on macOS, where `/var` resolves to `/private/var` and the path the host sent never matched the plugin's resolved folder.

## [2.6.3] - 2026-11-25

### Fixed

- The Sidecut profile routes delivery through Solo and describes the review and setup jobs without naming specialist skills. A regression check catches direct skill references in the profile.

## [2.6.2] - 2026-11-24

### Changed

- `VOICE.md` exempts skill descriptions, labels and manifest text from the Oxford comma. These are routing text with a length budget, and no Sidecut plugin's descriptions used it. Run `npm exec --no -- sidecut-sync` after updating the pin.

## [2.6.1] - 2026-11-24

### Fixed

- The usage log hook counted skill runs in the Antigravity CLI, which reads a `SKILL.md` with `read_file` and a `Path` argument; 2.6.0 matched only the app's `view_file` and `AbsolutePath`. Antigravity's `hooks.json` now runs it after `read_file` too. Run `npm exec --no -- sidecut-sync` after updating the pin.

## [2.6.0] - 2026-11-24

### Added

- Every plugin installs in Antigravity. Scaffolding writes `.antigravity-plugin/plugin.json`, `mcp_config.json` (with an MCP server) and a root `hooks.json` (with the usage log hook), all from the Claude Code and Codex files, and `sidecut-sync` writes them into plugins made before. The checker reports them as `ANTIGRAVITY_MISSING`, `ANTIGRAVITY_SYNC` or `ANTIGRAVITY_UNEXPECTED`.
- The usage log hook counts Antigravity's skill reads, with `host: "antigravity"`: the first `view_file` read of a `SKILL.md` inside the installed plugin, or a shell read through `run_command`. A failed read, a later chunk and a read of another copy of the plugin aren't counted.
- New READMEs show how to install the plugin folder in Antigravity from a clone.

### Changed

- `sidecut-sync` restores the usage log hook from the template, so a plugin picks up hook changes without a manual copy. A hook kept under `HOOK_SKILL_LOG`, or by its path, is left alone; a keep under `REPO_SYNC` alone no longer covers it.
- `sidecut-version` sets the version in the Antigravity manifest too, when the plugin has one.
- The house style covers Antigravity's manifest, MCP config and hooks, and the skills that build MCP servers, hooks and subagents say what Antigravity gets from sync and what it doesn't.

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
