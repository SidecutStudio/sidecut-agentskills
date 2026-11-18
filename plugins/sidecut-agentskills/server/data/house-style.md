# Plugin standards

Read this when writing or changing anything in a Sidecut plugin, skill, MCP server or plugin repo. Every rule has one answer. Rules marked yes in the Checked column fail `npm run check`; the rest are for review. The reasons behind the rules are in [patterns.md](patterns.md).

## Names

| Item | Rule | Checked |
| --- | --- | --- |
| Repo | `sidecut-<name>`, lowercase kebab-case | yes |
| Plugin id | `sidecut-<name>`, lowercase kebab-case, at most 64 characters; the same as the repo name when the repo exists to ship it | yes |
| Plugin display name | The id with hyphens as spaces, each word capitalized and acronyms in capitals: `sidecut-agentskills` is `Sidecut Agentskills`, `sidecut-ci` is `Sidecut CI`. The acronyms are ai, api, aws, cdn, ci, cli, css, dns, gpu, html, http, json, llm, mcp, pdf, pr, sdk, sql, ssh, ui, url, ux and yaml | yes |
| Skill | The plugin prefix, then a verb and a singular object of 2 or 3 words, kebab-case: `agentskills-write-skill`, `ci-diagnose-jobs`. The prefix is the plugin id without `sidecut-`. Skills from every installed plugin share one list of names, and Codex prompts and Claude Desktop show the bare name, so the prefix keeps it unique | yes |
| Router skill | The prefix alone, `agentskills`, present only in plugins with 4 or more other skills | yes |
| Subagent | A role noun, one word: `reviewer`, `verifier` | yes |
| MCP server key | The plugin id without the `sidecut-` prefix | yes |
| MCP tool | Verb then object in snake_case: `get_pr_checks`, `scaffold_plugin` | yes |
| Hook script | `<event>-<what>.mjs` in kebab-case: `post-tool-use-skill-log.mjs` | yes |
| Script, reference or example file | kebab-case, describing what's inside: `house-style.md`, `list-tools.mjs` | yes |
| Environment variable | `SIDECUT_<PLUGIN>_<SETTING>` in upper snake case for one plugin's setting; `SIDECUT_<SETTING>` for one shared by every Sidecut plugin, such as `SIDECUT_SKILL_LOG` | review |
| Acronyms in prose and headings | Upper case: MCP, CLI, CI, PR, URL | review |

## Repo layout

A repo exists to ship one plugin when it holds one plugin whose manifest `repository` is `https://github.com/SidecutStudio/<plugin-id>`. A repo that kept its older name, the plugin id without `sidecut-`, counts too when `package.json` is named after the plugin. That repo has exactly these top-level entries, plus `node_modules/` when installed, `bunfig.toml` when used, `docs/` for longer documentation, such as a specification, a `.claude/` folder that holds only worktrees Claude Code registered under `.claude/worktrees/` and files `.gitignore` ignores, and a `.codex/` folder that holds only files `.gitignore` ignores, such as the subagent profiles under `.codex/agents/`. A public repo also has its install source, `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`, described under Install source.

A renamed plugin can keep its historical repository name by listing `REPO_PLUGIN_ID` with a reason under `sidecut.keep` in `package.json`. When the package names the plugin, that explicit exception retains full repository checks and template sync.

A repo that ships a plugin next to other work, such as `sidecut-ops` or an app repo, keeps its own top level and follows the rules from `plugins/<plugin-id>/` down, whatever its package is called. It can still list deliberate differences under `sidecut.keep`.

```text
.github/workflows/check.yml
.github/workflows/release.yml
.gitignore
AGENTS.md
CHANGELOG.md
CLAUDE.md
LICENSE
README.md
SECURITY.md
biome.json
package-lock.json
lefthook.yml
package.json
plugins/<plugin-id>/
scripts/build-server.ts
scripts/release.ts
solo-workflow.toml
tests/
tsconfig.json
```

| Item | Rule | Checked |
| --- | --- | --- |
| `CLAUDE.md` | One line: `@AGENTS.md` | yes |
| `LICENSE` | MIT, `Copyright (c) <year> Sidecut Studio` | yes |
| Install source | A public repo, one whose CI jobs all run on `ubuntu-24.04`, carries its own marketplace for each host, listing only its plugin. A private repo has none; its plugin is listed from the `sidecut-plugins` marketplace | yes |
| Plugins per repo | One | review |
| `.gitignore` | Starts with the template's `house-style` block; the repo's own lines go after it | yes |
| `package.json` | `name` is the plugin id, `version` matches the manifests, `packageManager` is a pinned `npm@x.y.z`, every dependency is an exact version or a tagged GitHub source | yes |
| Code formatting | Biome with the template's `biome.json`: 2-space indent, single quotes, 100-character lines; it also formats every JSON file | yes |
| Unexpected top-level files | Fail the check | yes |

## Install source

A public repo has to install for people with no access to anything private. The `sidecut-plugins` marketplace is private, so a public repo carries a marketplace of its own: one file per host, at the path each host reads, both named after the plugin id and listing only `./plugins/<plugin-id>`. sidecut-plugins still bundles the plugin folder for the owner's own installs; it copies only `plugins/<plugin-id>/`, so these files don't reach it.

`.claude-plugin/marketplace.json`, for Claude Code:

```json
{
  "name": "<plugin-id>",
  "owner": { "name": "Sidecut Studio", "url": "https://sidecut.dev" },
  "description": "<manifest description>",
  "plugins": [
    {
      "name": "<plugin-id>",
      "source": "./plugins/<plugin-id>",
      "description": "<manifest description>",
      "category": "development"
    }
  ]
}
```

`.agents/plugins/marketplace.json`, for Codex, which reads this path before the Claude Code one:

```json
{
  "name": "<plugin-id>",
  "interface": { "displayName": "<display name>" },
  "plugins": [
    {
      "name": "<plugin-id>",
      "source": { "source": "local", "path": "./plugins/<plugin-id>" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Developer Tools"
    }
  ]
}
```

The README's Install section then gives these steps, with no command output. It says "In Claude Code, add this repo's marketplace, then install the plugin:" above a `text` block with the first two lines, and "In Codex, run:" above a `bash` block with the last two:

```text
/plugin marketplace add SidecutStudio/<repo>
/plugin install <plugin-id>@<plugin-id>
codex plugin marketplace add SidecutStudio/<repo>
codex plugin add <plugin-id>@<plugin-id>
```

| Item | Rule | Checked |
| --- | --- | --- |
| Both files | Present in a public repo | yes |
| Root `.claude-plugin/` and `.agents/` | Hold nothing but these two files, in any repo; files `.gitignore` ignores don't count | yes |
| Contents | `name` is the plugin id and `plugins` holds one entry for the plugin at `./plugins/<plugin-id>` | yes |
| README install steps | In a public repo, both hosts add the marketplace from `SidecutStudio/<repo>` and install `<plugin-id>@<plugin-id>`; no step names a marketplace the repo doesn't provide | yes |
| Proof | Before a public repo's install steps are published anywhere, they run from a clean Claude Code profile and a clean Codex home, or `claude plugin validate .` passes and the gap is named | review |
| Private repo | No marketplace files | yes |
| Private repo README | Installs from `sidecut-plugins` | review |

## Plugin layout

```text
plugins/<plugin-id>/
  .claude-plugin/plugin.json  Claude Code manifest
  .codex-plugin/plugin.json   Codex manifest
  .app.json                   registered app connector, only when bundled
  .mcp.json                   Claude Code MCP config, only with an MCP server
  mcp.json                    Codex MCP config, only with an MCP server
  CHANGELOG.md                copy of the repo's, kept identical
  LICENSE                     copy of the repo's, kept identical
  README.md                   copy of the repo's, kept identical
  assets/icon.png             512 by 512 PNG from sidecut-icon, the only asset
  agents/<role>.md            only with subagents
  codex/agents/<prefix>-<role>.toml  Codex profile of each subagent, generated
  hooks/hooks.json            Claude Code hooks, only with hooks
  hooks/codex-hooks.json      Codex hooks, the same scripts
  hooks/<event>-<what>.mjs
  server/index.mjs            bundled MCP server, generated
  server/THIRD_PARTY_LICENSES.txt  licence notices of the packages the bundle inlines, generated
  server/src/                 MCP server source
  server/data/                files the server reads at run time, only when needed
  skills/<skill>/
```

| Item | Rule | Checked |
| --- | --- | --- |
| Slash commands | None; skills are invocable on their own | yes |
| Hosts | Claude Code and Codex only | yes |
| Copies of repo files | Byte-identical to the repo root | yes |
| Empty folders | None | yes |
| Icon | `npm exec --no -- sidecut-icon <lucide-name>` draws it in Sidecut Builder's style: a near-black rounded tile, one white [Lucide](https://lucide.dev/icons) mark and Builder's orange full stop. One mark per plugin, never another plugin's | no |

## Manifests

Claude Code reads only `.claude-plugin/plugin.json`. Codex reads `.codex-plugin/plugin.json`. There is no root `plugin.json`: Codex prefers an Agent Plugins 1.0 root manifest and then loads none of the plugin's hooks (openai/codex#47925). Shared fields are identical in both manifests and appear in this order: `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`.

| Item | Rule | Checked |
| --- | --- | --- |
| `name` | The plugin id | yes |
| `version` | SemVer; the same in both manifests, `package.json` and the newest CHANGELOG entry | yes |
| `description` | One sentence, at most 120 characters, ends with a full stop; the same text as the README's first paragraph | yes |
| `author` | `{ "name": "Sidecut Studio", "url": "https://sidecut.dev" }` | yes |
| `homepage` | `https://sidecut.dev` | yes |
| `repository` | `https://github.com/SidecutStudio/<repo>` | yes |
| `license` | `MIT` | yes |
| `keywords` | 3 to 8, lowercase, no plugin name | yes |
| Claude extra fields | None; skills, agents and hooks are found by folder | yes |
| Codex extra fields | After the shared fields: `skills` (`./skills/`), `mcpServers` (`./mcp.json`) with an MCP server, `apps` (`./.app.json`) with a registered connector, `hooks` (`./hooks/codex-hooks.json`) with hooks, then `interface` last | yes |
| `interface`, in order | `displayName`, `shortDescription` (the description), `longDescription` (2 or 3 sentences), `developerName` (`Sidecut Studio`), `category`, `capabilities`, `websiteURL`, `defaultPrompt` (1 to 3 prompts, each at most 128 characters), `brandColor` (`#FF6B00`, Sidecut Builder's orange), `composerIcon` and `logo` (both `./assets/icon.png`) | yes |
| Unknown fields | None | yes |

## MCP servers

| Item | Rule | Checked |
| --- | --- | --- |
| Config files | `.mcp.json` for Claude Code and `mcp.json` for Codex, defining the same servers under the same keys; they differ only in the fields this table names | yes |
| Local server in `.mcp.json` | `"command": "node"`, `"args": ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs"]`, no `env` block, no `PATH` | yes |
| Local server in `mcp.json` | `"command": "node"`, `"args": ["server/index.mjs"]`, `"cwd": "."`. Codex fills in no root variable for MCP servers, but resolves `cwd` from the plugin's folder | yes |
| Remote server | `"type": "http"` and `"url"`, the same in both files; nothing else; auth handled by the host | yes |
| Registered app | Optional `.app.json` has an `apps` object with one entry named after the MCP server key; its `id` is a nonempty connector id, and `category` is an optional string; credentials, plugin ids and server URLs do not belong there | yes |
| App identity | Verify the connector id, endpoint and intended users' access from its registration or installed metadata; the offline checker cannot prove them | review |
| App routing | A direct MCP fallback uses the same declaration key and a remote HTTP server; it must not shadow a local stdio server; an app can omit the direct fallback | yes |
| Connection and views | App declarations package a registered connection; building, deploying, authenticating and rendering MCP Apps views are separate outcomes | review |
| Finding its own files | The server resolves paths from `import.meta.url`, never from the working directory, which is the user's project in Claude Code | yes |
| Source and build | TypeScript in `server/src/`, bundled to `server/index.mjs` with every dependency inlined, built file committed; CI rebuilds and fails on any difference | yes |
| Build script | `npm run build` is `node scripts/build-server.ts`, the same file in every plugin repo; it also writes `server/THIRD_PARTY_LICENSES.txt` with the licence of every package the bundle inlines, and the Codex profile of each subagent | yes |
| Transport | stdio for local servers; a remote server is hosted elsewhere and only configured here | review |
| Tool annotations | Every tool sets `title`, `readOnlyHint`, `destructiveHint`, `idempotentHint` and `openWorldHint` explicitly | yes |
| Tool description | At most 2 sentences: what it returns, then when to use it; no "Use this tool to" | yes |
| Server instructions | 3 to 6 sentences: what the server covers, which tool to start with, what tool output is | yes |
| Errors | `isError: true` with one plain sentence saying what failed and what to do next | review |
| Output | JSON text with stable field names in camelCase; unknown values are `null`, never guessed | review |
| Names in skills | Every tool a skill mentions exists on the plugin's server | yes |

## Skill folder

```text
skills/<skill>/
  SKILL.md
  agents/openai.yaml
  references/<topic>.md     optional
  examples/<case>.md        optional
  scripts/<verb-object>.mjs optional
```

| Item | Rule | Checked |
| --- | --- | --- |
| Nesting | None below `references/`, `examples/` or `scripts/` | yes |
| `SKILL.md` length | Prefer at most 200 lines | advisory |
| Reference file length | Prefer at most 300 lines | advisory |
| Every supporting file | Referenced from `SKILL.md` | yes |
| Unfinished text | No `TODO` anywhere; the skill template's `TODO` markers fail the check until replaced | yes |
| Links to other skills' files | None; name the skill instead | yes |
| Scripts | Node ESM, built-in modules only, `--help` flag, exit 0 on success and 1 on failure, plain-text output | yes |
| `agents/openai.yaml` | `interface:` with `display_name` (the SKILL.md H1), `short_description` (the description's first sentence), `icon_small` and `icon_large` (both `../../assets/icon.png`, the plugin's icon), `brand_color` (the plugin's) and `default_prompt` (`Use $<skill> to <first sentence with its verb in base form>`, so "Checks that" becomes "check that"), each value in double quotes. A skill with `disable-model-invocation: true` adds `policy:` with `allow_implicit_invocation: false`, the Codex equivalent, which Codex reads only from this file | yes |

## Skill frontmatter

Fields appear in this order and no others are used: `name`, `description`, `argument-hint`, `allowed-tools`, `user-invocable`, `disable-model-invocation`, `paths`, `model`, `effort`, `context`, `agent`. Only `name` and `description` are required; add the others where they change what the skill does. Codex reads only `name` and `description` from here and takes the rest from `agents/openai.yaml`.

| Item | Rule | Checked |
| --- | --- | --- |
| `name` | The folder name | yes |
| `description` | One line in double quotes; prefer at most 400 characters | yes / advisory |
| Description | State the capability and concrete trigger. Include exclusions only when they disambiguate the request. | yes |
| First sentence | One main verb, so Codex's starter prompt reads correctly | review |
| `allowed-tools` | A YAML list, narrowest patterns that work: `Bash(gh pr view *)` | yes |
| Own MCP tools | Every read-only tool of the plugin's own server that the skill calls is listed, as `mcp__plugin_<plugin id>_<server key>__<tool>`; tools that write stay unlisted so Claude Code asks first. An entry naming a tool the server doesn't have fails | yes |
| `argument-hint` | Only on a skill that takes an argument, in the form `[issue-number]` | review |
| `disable-model-invocation` | `true` only for a skill that must never start without the user asking for it by name | review |
| `effort` | One of `low`, `medium`, `high`, `xhigh`, `max`, only when the skill needs a different level from the session | yes |
| `context` and `agent` | Together or not at all: `context: fork` runs the skill in the named subagent | yes |
| Booleans | Only written when they differ from the default | yes |
| Versions, licenses, metadata blocks | None | yes |

## SKILL.md layout

Write for the task, not a fixed outline. Lead with the outcome and use headings that name the actual work. Put prerequisites, constraints, and recovery beside the operation they affect. Include verification when the outcome needs proof.

When owner input can change the work, point the skill to [owner-input.md](owner-input.md) in the loaded plugin's data directory. Put the pointer at the step that needs the input so a directly invoked skill works without its router. Keep the host rules there. Scaffolds include the guide and `sidecut-sync` refreshes its packaged copy. A built-in question tool comes from the active host, so it needs no MCP declaration, Codex interface metadata or Claude Code permission preapproval.

Keep procedures in SKILL.md and move detail into references when it is useful. Reference supporting files where they are needed. A router maps requests to actual skills and makes ambiguous routing clear. Cross-skill and tool pointers must resolve.

## Reference and example files

Use ordinary Markdown. Keep examples realistic and references easy to find. Supporting files must be packaged and referenced; no frontmatter in reference files. Prefer short files, but length alone does not block a release.

## Subagents

| Item | Rule | Checked |
| --- | --- | --- |
| Frontmatter | `name` (the file name), `description` in the skill shape, `tools` as the narrowest list that works, `model: inherit` | review |
| Model | A skill that starts a reviewer picks its model from the review level `solo-review-change` reports: no reviewer at light, a cheaper model such as `sonnet` at standard, the parent's at deep | review |
| Body | `# <Role>`, one paragraph, `## Steps`, `## Return` | review |
| Codex | Codex loads subagents only from a project's `.codex/agents/`, not from a plugin (openai/codex#18988). `npm run build` writes each one as `codex/agents/<prefix>-<role>.toml`, named `<prefix>_<role>` with the prefix's hyphens as underscores, and the skill that uses it copies the profile into the project before the first use. It never overwrites a file there and never writes to `~/.codex/` | yes |
| Naming one in a skill | `<plugin id>:<role>` for Claude Code and `<prefix>_<role>` for Codex, both in backticks: `sidecut-agentskills:reviewer` (`agentskills_reviewer` in Codex). A `<plugin id>:<name>` pointer must name one of the plugin's skills or subagents | yes |
| Limits | A subagent's tool limits are enforced in Claude Code only; in Codex it runs with the parent session's permissions, and its profile says so | yes |

## Evals

| Item | Rule | Checked |
| --- | --- | --- |
| Location | Repository-root `evals/`, one folder per case; never in the installed plugin. Run `npm run eval` to stage a temporary plugin for Claude Code | yes |
| Case names | `<skill>-<what>` for a skill's cases, `negative-<what>` for requests no skill in the plugin should answer | yes |
| Case files | `prompt.md` with frontmatter, then `graders/` with at least one grader | yes |
| Coverage | Every skill in a development repo has at least one trigger case; the repo has at least one `negative-` case | yes |
| Graders | `tool_used` graders on the `Skill` tool; an `llm` grader only for what a tool grader can't see | review |

## Hooks

| Item | Rule | Checked |
| --- | --- | --- |
| Files | `hooks/hooks.json` for Claude Code and `hooks/codex-hooks.json` for Codex, registering the same scripts with each host's event and matcher names. Codex loads plugin hooks only once the user trusts them | yes |
| Command | `node "${CLAUDE_PLUGIN_ROOT}/hooks/<file>.mjs"`; Codex fills in the same variable | yes |
| Timeout | Every hook sets `"timeout"` of at most 5 | yes |
| Scripts | Node ESM, built-in modules only, no network, exit 0 even when they fail themselves | yes |
| Output | Nothing on stdout unless the hook's job is to add context | review |
| Usage log hook | `post-tool-use-skill-log.mjs` is byte-identical to the template's copy | yes |
| Registration | Every script in `hooks/` is registered in both files and every registered file exists; a test pins the list | yes |

## Usage log

The only telemetry a Sidecut plugin has.

| Item | Rule | Checked |
| --- | --- | --- |
| Trigger | `PostToolUse`: matcher `Skill` in Claude Code; matcher `Bash` in Codex, which has no skill tool and opens a skill by reading its `SKILL.md` with a shell command (openai/codex#17132). A skill Codex puts straight into the prompt, without a read, isn't logged | yes |
| Switch | On by default, because nothing leaves the machine; `SIDECUT_SKILL_LOG=0`, `DO_NOT_TRACK=1` or a CI environment turns it off; tests in the template prove all three | yes |
| Record | One JSON line per skill run with `time`, `plugin`, `skill`, `host` and nothing else | yes |
| Location | `~/.sidecut/skill-log.jsonl`, never sent anywhere | yes |
| Ownership | Records only this plugin's skills | yes |
| Mentions in skills | None; skills never ask the agent to log, report or send feedback. A skill that reads usage back to the user, as `agentskills-show-usage` does, is the one exception | review |
| Reading it | `agentskills-show-usage` reads this log for every plugin that keeps it, so no plugin ships its own reader for it. A plugin with richer usage data of its own, like Sidecut Solo, may add a `<prefix>-show-usage` skill for that data. It checks recording still works before reporting | review |

## Wording

Use [VOICE.md](templates/repo/VOICE.md.tmpl) as editorial guidance. It is not a release gate. Keep literal commands, paths, tool names, and approval boundaries exact.

## Visual reports

| Item | Rule | Checked |
| --- | --- | --- |
| When to use HTML | Use visual reports when comparisons, diagrams, observed screens or measured trends make the answer clearer; keep short factual answers in chat | review |
| Method and assets | Read [visual-reports.md](visual-reports.md); the sibling HTML, CSS and licensed Geist fonts provide the Sidecut layout | review |
| Design and voice | Use the shared Sidecut Builder tokens and Plainspoken Editorial voice; preserve the subject product's own design inside the report | review |
| Authored skills | Give skills that benefit from visual outputs their own procedure and necessary packaged assets; don't depend on a maintainer checkout or another installed plugin | review |
| Output boundaries | Save read-only reports outside the reviewed repository; an artifact doesn't grant implementation, publication or production-write permission | review |
| Verification | Inspect the saved report in a browser, including narrow layouts, themes, focus, refresh and print; keep source links and untested states visible | review |
| Showing it | Open the report where the user already is: an Artifact or the built-in browser in Claude Code, the in-app browser in Codex. Private data such as usage stays in the local browser view unless the user asks to share it. Never hand over a file to download and open; with no view at all, give the path | review |
| New pages and identities | Show two or three rendered directions with the real words, after researching real examples, before building one; copy alone in chat is never the draft | review |
| Markdown scope | The Markdown rules apply to instruction and documentation files; generated HTML reports and their packaged HTML/CSS assets use their own formats | review |

## Markdown

Use standard Markdown with readable headings and code fences. The checker fails unresolved local links, links outside the repository, and unfinished template instructions. It does not enforce sentence length, punctuation, paragraph shape, or a word blacklist.

## README

Sections in this order:

1. `# <Display name>`, then one paragraph that is the manifest description.
2. `## What it does`: a table with columns `Skill` and `Does`, one row per skill, using each description's first sentence.
3. `## Install`: in a public repo, the steps under Install source; in a private repo, install from the `sidecut-plugins` marketplace in Claude Code and Codex. No command output.
4. `## Use`: 2 or 3 example requests.
5. `## Settings`: a table of environment variables with default and meaning, or the line "None." A plugin with hooks then says Codex runs them only once trusted.
6. `## Privacy`: every field the usage log records and where it goes, or the line "This plugin records nothing."
7. `## Develop`: the line "The commands are in `AGENTS.md` at the root of the repo."
8. `## License`: `MIT. See [LICENSE](LICENSE).`

| Item | Rule | Checked |
| --- | --- | --- |
| Section names and order | Exactly as above | yes |
| Skill table | Lists every skill and nothing else | yes |
| Counts typed by hand | None | review |

## CHANGELOG

| Item | Rule | Checked |
| --- | --- | --- |
| Format | `# Changelog`, then Keep a Changelog entries: `## [<version>] - <YYYY-MM-DD>`, newest first | yes |
| Sections | `### Added`, `### Changed`, `### Fixed`, `### Removed`, in that order, only those with entries | yes |
| Entries | One line each, past tense, naming the skill or tool it touches | review |

## Shared files

sidecut-agentskills owns part of every plugin repo, and `npm exec --no -- sidecut-sync` keeps it current. Update the pinned dependency explicitly, then run the installed version. Sync never upgrades itself. The checker reports anything out of date as `REPO_SYNC`.

| What | Owned by sidecut-agentskills | Belongs to the repo |
| --- | --- | --- |
| `CLAUDE.md`, `scripts/build-server.ts`, `scripts/release.ts` | The whole file | Nothing |
| `.gitignore`, `AGENTS.md`, `SECURITY.md` | The block between `sidecut:start house-style` and `sidecut:end house-style` | Everything outside it |
| `package.json` | `packageManager` and the versions of Biome, TypeScript, Lefthook, `@types/node` and `sidecut-agentskills`, which sync only ever raises | Everything else |

| Item | Rule | Checked |
| --- | --- | --- |
| Changing a shared part | Change the template here, release, then sync each repo. Never edit a block or an owned file in one repo only | yes |
| A repo that got it right | When a repo's own version is better, move it into the template rather than syncing it away | review |
| Deliberate differences | Listed in `package.json` under `sidecut.keep`, as `"<file, folder, rule code or 'CODE file'>": "<why>"`. The checker lists them as kept; a key with no reason, or one that no longer covers a problem, fails | yes |
| What was checked | The checker's first line says whether it checked the whole repo or only the plugins, and why | yes |

## AGENTS.md

Sections in this order: `# <Repo name>`, one paragraph, `## Commands` (a table with columns `Command` and `Does`), `## Layout` (a `text` tree of the top two levels), `## Rules` (the shared `house-style` block, then the repo's own rules), then the Sidecut Solo markers. The generator writes the markers empty and `solo-configure-project` fills them; the checker skips the text between them, since Solo owns it.

| Item | Rule | Checked |
| --- | --- | --- |
| Commands | Every `package.json` script appears once as `npm run <script>`, in `package.json` order, and nothing else | yes |
| Counts, versions, dates | None | review |

## Checks and CI

| Item | Rule | Checked |
| --- | --- | --- |
| `npm run check` | Runs `biome check .`, `tsc --noEmit`, `npm run style`, `npm test` and `node scripts/build-server.ts --check` in that order, with the repo's own steps anywhere between; the last fails when the bundle or its licence notices are stale | yes |
| `npm run style` | `sidecut-check`, from the `sidecut-agentskills` dev dependency pinned to a tag; it includes the bundle drift check | yes |
| Installed checker | The sidecut-agentskills in `node_modules` is the version `package.json` pins; run `npm install` when it isn't | yes |
| Checker output | What it checked, then what is kept on purpose, then one line per problem: code, file and line, plain message, how to fix; `--json` for tools | yes |
| Network | Checks pass offline | review |
| Tests | Usage log forced off by a preload file; fetch stubbed | review |
| CI | `check.yml` copied from sidecut-ops' runner-picker pattern; actions pinned by full SHA; Node.js pinned to an exact version and npm ci; no hosted macOS or Windows | yes |
| Release | `release.yml` runs `node scripts/release.ts`, the same file in every plugin repo, after Check passes on a push to `main`. It publishes the manifest version when that version has no published release: the `v<version>` tag on the checked commit, a GitHub Release with the CHANGELOG entry as notes, `<plugin-id>-<version>.zip` of the plugin folder and its `.sha256`. It never replaces a published release or moves Latest backwards, so merging a version bump is the release | yes |
| Public repo CI | Every job runs on `ubuntu-24.04`, free for public repos, and tools come from pinned downloads with a checksum check; a public repo never uses the self-hosted runners or sidecut-ops' private actions | yes |
| Private repo CI | Keeps the runner picker, whose budget guard stops hosted jobs near the monthly credit; the checker can't tell a private repo from a public one, so a hosted-only private repo is caught in review | review |
| Merge gate | `required_checks` in `solo-workflow.toml` includes `check` | yes |
