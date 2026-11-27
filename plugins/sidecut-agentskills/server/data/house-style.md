# Plugin standards

Read this when writing or changing anything in a plugin, skill, MCP server or plugin repo made with Agentskills. Every rule has one answer. Rules marked yes in the Checked column fail `npm run check`; the rest are for review. The reasons behind the rules are in [patterns.md](patterns.md).

## Settings

Who publishes a plugin comes from the user's settings, not from these rules: the GitHub owner (`org`), the author's name and URL, the homepage, a plugin-id `prefix`, the `marketplace` that lists the plugin, the CI mode (`hosted`, or `sidecut` for that profile's own runners), the licence, the brand color, and the user's own `houseStyle` and `voice` guides, as a path or URL. These rules are Agentskills' house style: the starting point. Where the user's own guide differs, it wins. Where a rule below says `<org>`, `<author>`, `<homepage>` or `<prefix>`, it means the value from settings.

| Where | Holds | Read by |
| --- | --- | --- |
| A tool call or `npm run new` flags | Answers for that one call | scaffolding, over the user's file |
| `~/.config/agentskills/settings.json` (or under an absolute `$XDG_CONFIG_HOME`) | The user's answers, saved once | scaffolding, over the defaults |
| `.agentskills.json` at the repo root | The answers a repo was scaffolded with | check and sync, over what the manifests say |

Scaffolding reads the call's answers, then the user's file, then the defaults; a new repo has no answers file yet. Check and sync read only the repo: its answers file, or, without one, what its manifests say. The defaults are hosted CI, no prefix, MIT, and the plugin's own repo as its marketplace. Owner, author, URLs and brand color are refused if they'd need escaping in JSON or YAML. One optional profile, `sidecut`, holds Sidecut Studio's own values and adds the rules in `profiles/sidecut.md`, which `get_house_style` appends when that profile is in use and returns as the section `Sidecut profile`. Nothing in it applies to a repo made with your own settings. A repo with no answers file is checked with the owner and author its manifest names. With no settings saved, `get_settings` and `scaffold_plugin` return the questions to ask and write nothing. A skill asks them all together, once, before it names or writes anything, never answers them itself, and saves the answers with `save_settings`. The `sidecut` profile is used only when the user names it; nothing falls back to it.

Agentskills' own markers, `package.json` key and usage log sit under one namespace: `agentskills` (`agentskills:start` blocks, `agentskills.keep`, `AGENTSKILLS_SKILL_LOG`, `~/.agentskills/`), or `sidecut` in repos with the `sidecut` profile. The checker reads both, and `sidecut-sync --fix` moves an older repo's blocks to its namespace. Below, `<ns>` stands for it.

## Names

| Item | Rule | Checked |
| --- | --- | --- |
| Repo | `<prefix><name>`, lowercase kebab-case | yes |
| Plugin id | `<prefix><name>`, lowercase kebab-case, at most 64 characters; the same as the repo name when the repo exists to ship it | yes |
| Plugin display name | The id with hyphens as spaces, each word capitalized and acronyms in capitals: `acme-notes` is `Acme Notes`, `acme-ci` is `Acme CI`. The acronyms are ai, api, aws, cdn, ci, cli, css, dns, gpu, html, http, json, llm, mcp, pdf, pr, sdk, sql, ssh, ui, url, ux and yaml | yes |
| Skill | The plugin prefix, then a verb and a singular object of 2 or 3 words, kebab-case: `agentskills-write-skill`, `notes-find-note`. The prefix is the plugin id without the configured prefix (`acme-` in `acme-notes`). Skills from every installed plugin share one list of names, and Codex prompts and Claude Desktop show the bare name, so the prefix keeps it unique | yes |
| Router skill | The prefix alone, `agentskills`, present only in plugins with 4 or more other skills | yes |
| Subagent | A role noun, one word: `reviewer`, `verifier` | yes |
| MCP server key | The plugin id without the configured prefix | yes |
| MCP tool | Verb then object in snake_case: `get_pr_checks`, `scaffold_plugin` | yes |
| Hook script | `<event>-<what>.mjs` in kebab-case: `post-tool-use-skill-log.mjs` | yes |
| Script, reference or example file | kebab-case, describing what's inside: `house-style.md`, `list-tools.mjs` | yes |
| Environment variable | The plugin id then the setting, in upper snake case, such as `ACME_NOTES_DIR` for `acme-notes`; the usage log's shared switch is `<NS>_SKILL_LOG` in every plugin | review |
| Acronyms in prose and headings | Upper case: MCP, CLI, CI, PR, URL | review |

## Repo layout

A repo exists to ship one plugin when it holds one plugin whose manifest `repository` is `https://github.com/<org>/<plugin-id>`. A repo that kept its older name, the plugin id without `<prefix>`, counts too when `package.json` is named after the plugin. That repo has exactly these top-level entries, plus `node_modules/` when installed, `bin/`, `vitest.config.ts`, `VOICE.md`, and `RELEASING.md` when used, `docs/` for longer documentation, such as a specification, a `.claude/` folder that holds only worktrees Claude Code registered under `.claude/worktrees/` and files `.gitignore` ignores, and a `.codex/` folder that holds only files `.gitignore` ignores, such as the subagent profiles under `.codex/agents/`. A public repo also has its install source, `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`, described under Install source.

A renamed plugin can keep its historical repository name by listing `REPO_PLUGIN_ID` with a reason under `<ns>.keep` in `package.json`. When the package names the plugin, that explicit exception retains full repository checks and template sync.

A repo that ships a plugin next to other work, such as an app or a tools repo, keeps its own top level and follows the rules from `plugins/<plugin-id>/` down, whatever its package is called. The rest of it is checked as its kind, under Repo kinds. It can still list deliberate differences under `<ns>.keep`.

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
evals/
package-lock.json
lefthook.yml
package.json
plugins/<plugin-id>/
scripts/build-server.ts
scripts/release.ts
tests/
tsconfig.json
```

| Item | Rule | Checked |
| --- | --- | --- |
| `CLAUDE.md` | One line: `@AGENTS.md` | yes |
| `LICENSE` | MIT, `Copyright (c) <year> <author>` | yes |
| Install source | A repo with no `marketplace` setting carries its own marketplace for each host, listing only its plugin. A repo listed in a shared marketplace may carry its own in `hosted` CI mode; in `sidecut` mode a public repo, one whose CI jobs all run on `ubuntu-24.04`, carries its own and a private repo carries none | yes |
| Plugins per repo | One | review |
| `.gitignore` | Starts with the template's `house-style` block; the repo's own lines go after it | yes |
| `package.json` | `name` is the plugin id, `version` matches the manifests, `packageManager` is a pinned `npm@x.y.z`, every dependency is an exact version or a tagged GitHub source | yes |
| Code formatting | Biome with the template's `biome.json`: 2-space indent, single quotes, 100-character lines; it also formats every JSON file | yes |
| Unexpected top-level files | Fail the check | yes |

## Repo kinds

`sidecut-check` checks a whole repo of any kind: `plugin`, `app`, `marketplace`, `ops`, `site` or `data`. A repo declares its kind as `"<ns>": { "kind": "app" }` in `package.json`. Without one, the checker takes it from the profile's repo index when that is on disk, and otherwise guesses: a repo that exists to ship one plugin is a plugin repo, one with `bundled/` or a multi-plugin marketplace is a marketplace, one with `.github/actions/` is ops, one with no `package.json` is data, one built with a site generator is a site, and anything else is an app. The first line of its output says which kind it used and how it knew.

A plugin repo follows the rest of this house style. Every other kind keeps the H2 sections of its template in `templates/kinds/<kind>.md.tmpl`, in that order, and may add its own between them. An app's AGENTS.md starts with `## Read this when`, a table from what someone is working on to the doc to read, so it is the map of the repo. `templates/kinds/lefthook.yml.tmpl` is the pre-push guard such a repo adds: `sidecut-check --fast`, the quick exact rules.

| Item | Rule | Checked |
| --- | --- | --- |
| Kind | `<ns>.kind`, when set, is one of the six kinds | yes |
| AGENTS.md | Every kind but data has one; data has a README.md | yes |
| Sections | The kind template's H2 sections, in order, with the repo's own between them | yes |
| Workflow block | With a workflow profile, AGENTS.md carries the workflow's block word for word; `sidecut-sync --fix` writes it | yes |
| CLAUDE.md | Imports AGENTS.md with an `@AGENTS.md` line, so the two never drift; `sidecut-sync --fix` adds it | yes |

## Whole-repo text

These rules read every file in the repo that git tracks, in every kind. CHANGELOG history and tests keep old names, dates and facts as they were. Skills a skills manager installs into a host folder (`.claude/skills/`, `.agents/skills/` and the like) and an app builder's own folders are checked where they come from.

Exact rules block a merge. Heuristic rules can't tell intent, so they are advisories: the output names each kind once with where it shows up, and in GitHub Actions they appear as annotations on the lines a pull request changed. An advisory becomes blocking in a later checker version once a sweep of every repo shows none left.

| Item | Rule | Checked |
| --- | --- | --- |
| Internal links | Every relative link in Markdown outside history and tests resolves inside the repo | yes |
| External links | Answer, checked with `sidecut-check --links` on a schedule, since the result depends on other sites | scheduled |
| Copies | The same Markdown in two places either has one copy generated (listed under `protected_paths` in the workflow settings) or becomes a link | yes |
| Owned facts | A fact the profile's ownership map gives to one file (runner labels, plugin and CI action versions, the repo's merge gate) isn't written out elsewhere; point to the owning file. A repo may say its own version | yes |
| Reserved ports | Another repo's reserved port written out is an advisory (`OWNED_PORT`), since reservations share numbers with framework defaults; a repo may say its own | advisory |
| Retired names | None of the profile's retired names written as names in text people read; a URL, path or package name that still carries one is an identifier and stays. `sidecut-sync --fix` replaces a retired studio name | yes |
| Dated notes | No "as of", "read on" or "last checked" note with a date; say what is true and link the source | yes |
| Pointer-only files | No Markdown file that only sends the reader to another | yes |
| AGENTS.md budget | 200 lines and 32 KiB at most: it loads on every task, and Codex stops reading at 32 KiB | yes |
| Unlinked Markdown | Every Markdown file is linked or named somewhere, unless a host loads it by name | advisory |
| Long docs | A doc over 500 lines is split by what readers come for | advisory |
| Small references | A reference file under 30 lines that only one skill reads goes into that SKILL.md | advisory |
| Stock phrases and hedges | Say the specific thing instead ("seamless", "robust", "it's worth noting") | advisory |
| The owner in public copy | READMEs and a site's pages never describe the person behind the work, such as "built by a solo maker"; describing who it's for is fine | yes |

## Install source

A public repo has to install for people with no access to anything private. A shared marketplace may be private, so a public repo carries a marketplace of its own: one file per host, at the path each host reads, both named after the plugin id and listing only `./plugins/<plugin-id>`. A shared marketplace that bundles the plugin copies only `plugins/<plugin-id>/`, so these files don't reach it.

`.claude-plugin/marketplace.json`, for Claude Code:

```json
{
  "name": "<plugin-id>",
  "owner": { "name": "<author>", "url": "<author URL>" },
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
/plugin marketplace add <org>/<repo>
/plugin install <plugin-id>@<plugin-id>
codex plugin marketplace add <org>/<repo>
codex plugin add <plugin-id>@<plugin-id>
```

| Item | Rule | Checked |
| --- | --- | --- |
| Both files | Present in a public repo | yes |
| Root `.claude-plugin/` and `.agents/` | Hold nothing but these two files, in any repo; files `.gitignore` ignores don't count | yes |
| Contents | `name` is the plugin id and `plugins` holds one entry for the plugin at `./plugins/<plugin-id>` | yes |
| README install steps | In a public repo, both hosts add the marketplace from `<org>/<repo>` and install `<plugin-id>@<plugin-id>`; no step names a marketplace the repo doesn't provide | yes |
| Proof | Before a public repo's install steps are published anywhere, they run from a clean Claude Code profile and a clean Codex home, or `claude plugin validate .` passes and the gap is named | review |
| Private repo | No marketplace files | yes |
| Private repo README | Installs from the shared marketplace that lists it | review |

## Plugin layout

```text
plugins/<plugin-id>/
  .antigravity-plugin/plugin.json  Antigravity manifest, written by sidecut-sync
  .claude-plugin/plugin.json  Claude Code manifest
  .codex-plugin/plugin.json   Codex manifest
  .app.json                   registered app connector, only when bundled
  .mcp.json                   Claude Code MCP config, only with an MCP server
  mcp.json                    Codex MCP config, only with an MCP server
  mcp_config.json             Antigravity MCP config, written by sidecut-sync from .mcp.json
  CHANGELOG.md                copy of the repo's, kept identical
  LICENSE                     copy of the repo's, kept identical
  README.md                   copy of the repo's, kept identical
  assets/icon.png             512 by 512 PNG from sidecut-icon, the only asset
  agents/<role>.md            only with subagents
  codex/agents/<prefix>-<role>.toml  Codex profile of each subagent, generated
  hooks/hooks.json            Claude Code hooks, only with hooks
  hooks/codex-hooks.json      Codex hooks, the same scripts
  hooks.json                  Antigravity hooks, written by sidecut-sync, only with the usage log hook
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
| Hosts | Claude Code, Codex and Antigravity only | yes |
| Copies of repo files | Byte-identical to the repo root | yes |
| Empty folders | None | yes |
| Icon | `npm exec --no -- sidecut-icon <lucide-name>` draws it: a near-black rounded tile, one white [Lucide](https://lucide.dev/icons) mark and a full stop in the brand color. One mark per plugin, never another plugin's | no |

## Manifests

Claude Code reads only `.claude-plugin/plugin.json`. Codex reads `.codex-plugin/plugin.json`. There is no root `plugin.json`: Codex prefers an Agent Plugins 1.0 root manifest and then loads none of the plugin's hooks (openai/codex#47925). Shared fields are identical in both manifests and appear in this order: `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`.

| Item | Rule | Checked |
| --- | --- | --- |
| `name` | The plugin id | yes |
| `version` | SemVer; the same in both manifests, `package.json` and the newest CHANGELOG entry | yes |
| `description` | One sentence, at most 120 characters, ends with a full stop; the same text as the README's first paragraph | yes |
| `author` | `{ "name": "<author>", "url": "<author URL>" }` | yes |
| `homepage` | `<homepage>` | yes |
| `repository` | `https://github.com/<org>/<repo>` | yes |
| `license` | `MIT` | yes |
| `keywords` | 3 to 8, lowercase, no plugin name | yes |
| Claude extra fields | None; skills, agents and hooks are found by folder | yes |
| Codex extra fields | After the shared fields: `skills` (`./skills/`), `mcpServers` (`./mcp.json`) with an MCP server, `apps` (`./.app.json`) with a registered connector, `hooks` (`./hooks/codex-hooks.json`) with hooks, then `interface` last | yes |
| `interface`, in order | `displayName`, `shortDescription` (the description), `longDescription` (2 or 3 sentences), `developerName` (`<author>`), `category`, `capabilities`, `websiteURL`, `defaultPrompt` (1 to 3 prompts, each at most 128 characters), `brandColor` (the configured brand color), `composerIcon` and `logo` (both `./assets/icon.png`) | yes |
| Unknown fields | None | yes |

### Antigravity

Antigravity reads `.antigravity-plugin/plugin.json`, the manifest a plugin that also ships `.claude-plugin/` uses, and the same `skills/` folder. It ignores `.mcp.json`, `mcp.json` and `hooks/`, so a plugin carries Antigravity's own `mcp_config.json` and `hooks.json` at its root. All three follow from the Claude Code and Codex files: scaffolding writes them, `sidecut-sync` rewrites them, and the checker reports any other content as `ANTIGRAVITY_SYNC`, a missing one as `ANTIGRAVITY_MISSING` and one with nothing to describe as `ANTIGRAVITY_UNEXPECTED`.

| Item | Rule | Checked |
| --- | --- | --- |
| Manifest, in order | `$schema` (`https://antigravity.google/schemas/v1/plugin.json`), `name`, `displayName` (the Codex `interface.displayName`), `version`, `description`, `logo` (`assets/icon.png`), `suggestedPrompts` (the Codex `defaultPrompt`), then `author`, `homepage`, `repository`, `license` and `keywords` as in the Claude Code manifest | yes |
| `mcp_config.json` | With `.mcp.json` only: the same servers under the same keys. A local server is `"command": "node"` with `"args": ["${PLUGIN_ROOT}/server/index.mjs"]`, the root variable Antigravity fills in; a remote one is its `url` alone | yes |
| `hooks.json` | A `skill-log` group running `node ./hooks/post-tool-use-skill-log.mjs` after `read_file`, `view_file` and `run_command`, from the plugin's folder, as Antigravity runs plugin hooks. Another script runs there once the file names it: sync then writes its group, named for the script without its event prefix, from its `PreToolUse`, `PostToolUse`, `Stop` and `SessionStart` entries in `hooks/hooks.json`, with Antigravity's tool names in the matcher. Events and tools Antigravity lacks are left out | yes |

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
| Source and build | TypeScript in `server/src/`, bundled with esbuild to `server/index.mjs` with every dependency inlined, built file committed; CI rebuilds and fails on any difference. The checker builds with the repo's own esbuild, so a Bun-only repo adds esbuild to its devDependencies too: Bun's bundler writes different bytes | yes |
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
| Own MCP tools | Every read-only tool of the plugin's own server that the skill calls is listed, as `mcp__plugin_<plugin id>_<server key>__<tool>`; tools that write stay unlisted so Claude Code asks first. An entry naming a tool the server doesn't have fails, and so does a read-only tool the skill names but doesn't list | yes |
| `argument-hint` | Only on a skill that takes an argument, in the form `[issue-number]` | review |
| `disable-model-invocation` | `true` only for a skill that must never start without the user asking for it by name | review |
| `effort` | One of `low`, `medium`, `high`, `xhigh`, `max`, only when the skill needs a different level from the session | yes |
| `context` and `agent` | Together or not at all: `context: fork` runs the skill in the named subagent | yes |
| Booleans | Only written when they differ from the default | yes |
| Versions, licenses, metadata blocks | None | yes |

## SKILL.md layout

Write for the task, not a fixed outline. Lead with the outcome and use headings that name the actual work. Put prerequisites, constraints, and recovery beside the operation they affect. Include verification when the outcome needs proof.

When the user's input can change the work, point the skill to [user-input.md](user-input.md) in the loaded plugin's data directory. Put the pointer at the step that needs the input so a directly invoked skill works without its router. Keep the host rules there. Scaffolds include the guide and `sidecut-sync` refreshes its packaged copy. A built-in question tool comes from the active host, so it needs no MCP declaration, Codex interface metadata or Claude Code permission preapproval.

Keep procedures in SKILL.md and move detail into references when it is useful. Reference supporting files where they are needed. A router maps requests to actual skills and makes ambiguous routing clear. Cross-skill and tool pointers must resolve.

SKILL.md is the skill's source: write it by hand, never generate it from code, a template string or another file. When something else needs the same instructions, such as an MCP prompt or a command's help, it reads the SKILL.md at run time. A repo rule or test that regenerates skills is drift to remove, not a rule to follow.

| Item | Rule | Checked |
| --- | --- | --- |
| Source | SKILL.md and `agents/openai.yaml` are edited by hand; nothing in the repo writes them | review |
| Steps | A sentence or two each; one past 120 words is several steps or belongs in a reference | advisory |
| Shared text | Said once, in a file under `server/data/` that each skill points to, or in the skill that owns it; a line of 12 or more words two skills both carry is flagged | advisory |
| The set | A plugin's skills, and the user's plugins in one marketplace, share one shape: headings that name the work, the same failure handling, the usage log | review |

## Reference and example files

Use ordinary Markdown. Keep examples realistic and references easy to find. Supporting files must be packaged and referenced; no frontmatter in reference files. Prefer short files, but length alone does not block a release.

## Subagents

| Item | Rule | Checked |
| --- | --- | --- |
| Frontmatter | `name` (the file name), `description` in the skill shape, `tools` as the narrowest list that works, `model: inherit` | review |
| Model | A skill that starts a reviewer picks its model from the change's review level, as the repo's own workflow sets it (standard when it sets none): no reviewer at light, a cheaper model such as `sonnet` at standard, the parent's at deep | review |
| Body | `# <Role>`, one paragraph, `## Steps`, `## Return` | review |
| Codex | Codex loads subagents only from a project's `.codex/agents/`, not from a plugin (openai/codex#18988). `npm run build` writes each one as `codex/agents/<prefix>-<role>.toml`, named `<prefix>_<role>` with the prefix's hyphens as underscores, and the skill that uses it copies the profile into the project before the first use. It never overwrites a file there and never writes to `~/.codex/` | yes |
| Naming one in a skill | `<plugin id>:<role>` for Claude Code and `<prefix>_<role>` for Codex, both in backticks: `sidecut-agentskills:reviewer` (`agentskills_reviewer` in Codex). A `<plugin id>:<name>` pointer must name one of the plugin's skills or subagents | yes |
| Limits | A subagent's tool limits are enforced in Claude Code only; in Codex it runs with the parent session's permissions, and its profile says so | yes |
| Host config | A subagent that tries a plugin in a host runs `codex` and `claude` only with `CODEX_HOME` or `CLAUDE_CONFIG_DIR` set to an empty folder in the same command, and never reads the user's own host config. Agentskills' own subagents are held to it by its `pre-tool-use-host-home.mjs` hook, which both hosts run with the subagent's name | review |

## Evals

| Item | Rule | Checked |
| --- | --- | --- |
| Location | Repository-root `evals/`, one folder per case; never in the installed plugin. Run `npm run eval` to stage a temporary plugin for Claude Code | yes |
| Case names | `<skill>-<what>` for a skill's cases, `negative-<what>` for requests the skill or plugin under test should leave to another route | yes |
| Case files | `prompt.md` with frontmatter, then `graders/` with at least one grader. A case can add a `case.yaml` overlay for workspace setup | yes |
| Generated cases | When `evals/` is copied from another repo, `evals-source.json` at the root lists each copied folder and its hash (`sha256-` over each file's path and sha256, in path order). Edit the cases at their source and sync; delete the file to own them here | yes |
| Coverage | Every skill in a development repo has at least one trigger case, including the router. When skill names overlap, the longest match owns the case. The repo has at least one `negative-` case | yes |
| Graders | `tool_used` graders on the `Skill` tool; an `llm` grader only for what a tool grader can't see | review |

## Hooks

| Item | Rule | Checked |
| --- | --- | --- |
| Files | `hooks/hooks.json` for Claude Code and `hooks/codex-hooks.json` for Codex, registering the same scripts with each host's event and matcher names. Codex loads plugin hooks only once the user trusts them | yes |
| Command | `"command": "node"` with `"args": ["${CLAUDE_PLUGIN_ROOT}/hooks/<file>.mjs"]` in hooks.json, so it starts on Windows too; one line, `node "${CLAUDE_PLUGIN_ROOT}/hooks/<file>.mjs"`, in codex-hooks.json, where Codex fills in the same variable | yes |
| Timeout | Every hook sets `"timeout"` of at most 5 | yes |
| Scripts | Node ESM, built-in modules only, no network, exit 0 even when they fail themselves | yes |
| Output | Nothing on stdout unless the hook's job is to add context or refuse a call | review |
| Usage log hook | `post-tool-use-skill-log.mjs` is byte-identical to the template's copy, which `sidecut-sync` restores. It also counts Antigravity's skill reads, through the root `hooks.json` | yes |
| Registration | Every script in `hooks/` is registered in both files and every registered file exists; a test pins the list | yes |

## Usage log

The only telemetry a plugin made with Agentskills has.

| Item | Rule | Checked |
| --- | --- | --- |
| Trigger | `PostToolUse`: matcher `Skill` in Claude Code; matcher `Bash` in Codex, which has no skill tool and opens a skill by reading its `SKILL.md` with a shell command (openai/codex#17132). A skill Codex puts straight into the prompt, without a read, isn't logged. Matcher `read_file|view_file|run_command` in Antigravity, whose CLI reads a skill's `SKILL.md` with `read_file` (`Path`), its app with `view_file` (`AbsolutePath`), or either with a shell command. Those are its ordinary file readers, so only a successful first read of a `SKILL.md` inside the installed plugin's own folder counts | yes |
| Switch | On by default, because nothing leaves the machine; `<NS>_SKILL_LOG=0`, `DO_NOT_TRACK=1` or a CI environment turns it off; tests in the template prove all three | yes |
| Record | One JSON line per skill run with `time`, `plugin`, `skill`, `host` (`claude-code`, `codex` or `antigravity`) and nothing else | yes |
| Location | `~/.<ns>/skill-log.jsonl`, never sent anywhere | yes |
| Ownership | Records only this plugin's skills | yes |
| Mentions in skills | None; skills never ask the agent to log, report or send feedback. A skill that reads usage back to the user, as `agentskills-show-usage` does, is the one exception | review |
| Reading it | `agentskills-show-usage` reads this log for every plugin that keeps it, so no plugin ships its own reader for it. A plugin with richer usage data of its own may add a `<prefix>-show-usage` skill for that data. It checks recording still works before reporting | review |

## Wording

Use [VOICE.md](templates/repo/VOICE.md.tmpl) as editorial guidance. It is not a release gate. Keep literal commands, paths, tool names, and approval boundaries exact.

## Visual reports

| Item | Rule | Checked |
| --- | --- | --- |
| When to use HTML | The test in [visual-reports.md](visual-reports.md): an HTML report for 5 or more findings, 3 or more options compared, a parity table, a diagram, measured data over 10 rows or a design comparison; otherwise chat | review |
| Where the choice is made | A skill that ends in a review, audit, rebuild, research answer or comparison chooses its format in a numbered step that points to visual-reports.md, not in a note after the steps. A plugin for a product with its own viewer for that result, such as a results matrix, names that view as the visual in the step instead | review |
| Follow-ups | A skill whose result leaves next actions to choose offers them as one question, following Offer follow-ups in [user-input.md](user-input.md), never as a prose "want me to" line | review |
| Method and assets | Read [visual-reports.md](visual-reports.md); the sibling HTML, CSS and licensed Geist fonts provide the layout | review |
| Design and voice | Use the packaged tokens and the plain, specific voice in [VOICE.md](templates/repo/VOICE.md.tmpl); preserve the subject product's own design inside the report | review |
| Authored skills | Give skills that benefit from visual outputs their own procedure and necessary packaged assets; don't depend on a maintainer checkout or another installed plugin | review |
| Output boundaries | Save read-only reports outside the reviewed repository; an artifact doesn't grant implementation, publication or production-write permission | review |
| Verification | Inspect the saved report in a browser, including narrow layouts, themes, focus, refresh and print; keep source links and untested states visible | review |
| Showing it | Open the report where the user already is: an Artifact or the built-in browser in Claude Code, the in-app browser in Codex. Private data such as usage stays in the local browser view unless the user asks to share it. Never hand over a file to download and open; with no view at all, give the path | review |
| New pages and identities | Show two or three rendered directions with the real words, after researching real examples, before building one; copy alone in chat is never the draft | review |
| Markdown scope | The Markdown rules apply to instruction and documentation files; generated HTML reports and their packaged HTML/CSS assets use their own formats | review |

For agent tooling, these visuals fit:

| Work | Useful visual |
| --- | --- |
| Plugin or tool approaches | Source-linked options matrix and a labeled architecture diagram |
| Workflow design | Event, decision and action flow, with roles, permission boundaries and failure paths |
| Plugin review | Prioritized findings with file locations and observed examples; screenshots when reviewing rendered views |
| Plugin rebuild | Before-and-after parity matrix for skills, tools, hard rules, hooks and checks |
| Skill evaluation | Expected versus observed behavior, case groups and measured outcomes with sample counts |
| MCP view design | Matched proposed layouts or captured views, with a readable text fallback |
| Research | Source-linked comparisons, relevant diagrams and practical implications |

Keep the owning skill's review groups, severity, parity checks and verification requirements. Distinguish proposed behavior from observed results.

A saved HTML report isn't an MCP App. Building a live chat view needs the view procedure in `agentskills-build-mcp-server` and separate host verification.

## Markdown

Use standard Markdown with readable headings and code fences. The checker fails unresolved local links, links outside the repository, and unfinished template instructions. It does not enforce sentence length, punctuation or paragraph shape; Whole-repo text says which words and notes it flags.

## README

The template's README is the pattern: say in one paragraph what the plugin does, then show it. People scan a README, so commands, requests and settings go in code blocks and tables, with at most a line of prose around each.

Sections in this order:

1. `# <Display name>`, then one paragraph that is the manifest description.
2. `## What it does`: a table with columns `Skill` and `Does`, one row per skill, using each description's first sentence.
3. `## Install`: the install commands in a code block, with a short `#` comment naming the host where it helps. In a public repo, the steps under Install source; in a private repo, install from the shared marketplace that lists it, in Claude Code and Codex. Antigravity installs the plugin folder from a clone with `agy plugin install`. No command output.
4. `## Use`: 2 or 3 example requests. A plugin built around a file people write, such as a definition or a config, ends the section with one complete example of that file, with a short comment on each line that needs one.
5. `## Settings`: a table of environment variables with default and meaning, or the line "None." A plugin with hooks then says Codex runs them only once trusted.
6. `## Privacy`: every field the usage log records and where it goes, or the line "This plugin records nothing."
7. `## Develop`: the line "The commands are in `AGENTS.md` at the root of the repo."
8. `## License`: `MIT. See [LICENSE](LICENSE).`

| Item | Rule | Checked |
| --- | --- | --- |
| Section names and order | Exactly as above | yes |
| Install | Holds a code block | yes |
| Skill table | Lists every skill and nothing else | yes |
| Counts typed by hand | None | review |

## CHANGELOG

| Item | Rule | Checked |
| --- | --- | --- |
| Format | `# Changelog`, then Keep a Changelog entries: `## [<version>] - <YYYY-MM-DD>`, newest first | yes |
| Sections | `### Added`, `### Changed`, `### Fixed`, `### Removed`, in that order, only those with entries | yes |
| Entries | One line each, past tense, naming the skill or tool it touches | review |

## Shared files

sidecut-agentskills owns part of every plugin repo, and `npm exec --no -- sidecut-sync` keeps it current. Update the pinned dependency explicitly, then run the installed version. Sync never upgrades itself. The checker reports anything out of date as `REPO_SYNC`. In a repo that ships its plugin beside other work, sync keeps only the plugin's hook, Antigravity files and packaged guide, `scripts/eval.mjs` once the repo has `evals/`, the blocks in files that already carry the markers, and the checker pin; the repo's other files and tool versions are its own.

| What | Owned by sidecut-agentskills | Belongs to the repo |
| --- | --- | --- |
| `CLAUDE.md`, `scripts/build-server.ts`, `scripts/release.ts` | The whole file | Nothing |
| Starter status evals | Sync refreshes an exact copy of an older starter in a dedicated plugin repo | Edited, missing and stamped cases |
| `.gitignore`, `AGENTS.md`, `SECURITY.md` | The block between `<ns>:start house-style` and `<ns>:end house-style` | Everything outside it |
| `package.json` | `packageManager` and the versions of Biome, TypeScript, Lefthook, `@types/node` and `sidecut-agentskills`, which sync only ever raises | Everything else |
| `server/data/visual-reports.md` and `visual-report.css` in a plugin that carries them | The whole file, so every plugin that makes reports reads the same guide | Nothing; the report page itself (`visual-report.html`) carries the plugin's own name |
| `hooks/post-tool-use-skill-log.mjs`, `.antigravity-plugin/plugin.json`, `mcp_config.json`, `hooks.json` in the plugin | The whole file: the hook is the template's copy, and Antigravity's files are written from the Claude Code and Codex ones. They're reported under their own rules (`HOOK_SKILL_LOG`, `ANTIGRAVITY_*`), and a keep under that rule or the file's path stops sync rewriting them | Nothing |

| Item | Rule | Checked |
| --- | --- | --- |
| Changing a shared part | Change the template here, release, then sync each repo. Never edit a block or an owned file in one repo only | yes |
| A repo that got it right | When a repo's own version is better, move it into the template rather than syncing it away | review |
| Deliberate differences | Listed in `package.json` under `<ns>.keep`, as `"<file, folder, rule code or 'CODE file'>": "<why>"`. The checker lists them as kept; a key with no reason, or one that no longer covers a problem, fails | yes |
| What was checked | The checker's first line says whether it checked the whole repo or only the plugins, and why | yes |

## AGENTS.md

Sections in this order: `# <Repo name>`, one paragraph, `## Commands` (a table with columns `Command` and `Does`), `## Layout` (a `text` tree of the top two levels), `## Rules` (the shared `house-style` block, then the repo's own rules). A profile with its own workflow may add one more section after Rules, between markers that workflow fills.

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
| Checker output | What it checked and which kind it took the repo for, what it couldn't check here, one line per advisory kind, what is kept on purpose, then one line per problem: code, file and line, plain message, how to fix; `--json` for tools, `--fast` for the pre-push guard, `--links` for external links | yes |
| Annotations | In GitHub Actions the checker prints problems as errors, advisories as warnings on changed lines only, and one notice per advisory kind | yes |
| Network | Checks pass offline | review |
| Tests | Usage log forced off by a preload file; fetch stubbed | review |
| Git in tests | A test that runs git drops every `GIT_*` variable first, in the preload file or in its own code: a git hook exports `GIT_DIR` and friends, so the test's git would otherwise act on the checkout running the hook. The template's `tests/setup.ts` carries the `git-env` block that does it | yes |
| CI | `check.yml` from the template for the repo's CI mode; actions pinned by full SHA; Node.js pinned to an exact version and npm ci; no hosted macOS or Windows | yes |
| CI tools | Tools such as trufflehog and gh come from their pinned download with a checksum check; a secret scan uses an action that needs no Bun, or a pinned download; a job uses a `setup-ci-tools` action that runs on Bun only after installing Bun | yes |
| Release | `release.yml` runs `node scripts/release.ts`, the same file in every plugin repo, after Check passes on a push to `main`. It publishes the manifest version when that version has no published release: the `v<version>` tag on the checked commit, a GitHub Release with the CHANGELOG entry as notes, `<plugin-id>-<version>.zip` of the plugin folder and its `.sha256`. It never replaces a published release or moves Latest backwards, so merging a version bump is the release | yes |
| Public repo CI | Every job runs on `ubuntu-24.04`, free for public repos, and tools come from pinned downloads with a checksum check; a public repo never uses runners of its own or actions from a private repo | yes |
| Private repo CI | Keeps the runner picker, whose budget guard stops hosted jobs near the monthly credit; the checker can't tell a private repo from a public one, so a hosted-only private repo is caught in review | review |
| Merge gate | The release script requires the template's check jobs to pass on the release commit (`check`, plus `secrets` on hosted CI); a profile's workflow file may set its own list, which has to include `check`, and every name in it has to be a job some workflow runs | yes |
| Scan text | No shipped text file outside the server's bundle and source names credentials, CI secrets, your own CI runners, unpinned package launchers, SSH key paths, OS credential stores, or a download-and-run install, since Claude's plugin scan may then mark the plugin Caution; CI lines like these come from the server's code, and a plugin whose job is that text lists its files under `scanTextAllow` in `.agentskills.json` and says what it does with them in the README | advisory |
