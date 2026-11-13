# House style

Read this when writing or changing anything in a Sidecut plugin, skill, MCP server or plugin repo. Every rule has one answer. Rules marked yes in the Checked column fail `bun run check`; the rest are for review. The reasons behind the rules are in [patterns.md](patterns.md).

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

A repo exists to ship one plugin when it holds one plugin whose manifest `repository` is `https://github.com/SidecutStudio/<plugin-id>`. That repo has exactly these top-level entries, plus `node_modules/` when installed and `bunfig.toml` when used. A repo that ships a plugin next to other work, such as `sidecut-ops`, keeps its own top level and follows the rules from `plugins/<plugin-id>/` down.

```text
.github/workflows/check.yml
.gitignore
AGENTS.md
CHANGELOG.md
CLAUDE.md
LICENSE
README.md
SECURITY.md
biome.json
bun.lock
lefthook.yml
package.json
plugins/<plugin-id>/
scripts/build-server.ts
solo-workflow.toml
tests/
tsconfig.json
```

| Item | Rule | Checked |
| --- | --- | --- |
| `CLAUDE.md` | One line: `@AGENTS.md` | yes |
| `LICENSE` | MIT, `Copyright (c) <year> Sidecut Studio` | yes |
| Marketplace | Not in the plugin repo; the plugin is listed from the `sidecut-plugins` marketplace | yes |
| Plugins per repo | One | review |
| `.gitignore` | Exactly `node_modules/`, `.DS_Store`, `*.log` and `.env*`, one per line | yes |
| `package.json` | `name` is the plugin id, `version` matches the manifests, `packageManager` is a pinned `bun@x.y.z`, every dependency is an exact version or a tagged GitHub source | yes |
| Code formatting | Biome with the template's `biome.json`: 2-space indent, single quotes, 100-character lines; it also formats every JSON file | yes |
| Unexpected top-level files | Fail the check | yes |

## Plugin layout

```text
plugins/<plugin-id>/
  .claude-plugin/plugin.json  Claude Code manifest
  .codex-plugin/plugin.json   Codex manifest
  .mcp.json                   Claude Code MCP config, only with an MCP server
  mcp.json                    Codex MCP config, only with an MCP server
  CHANGELOG.md                copy of the repo's, kept identical
  LICENSE                     copy of the repo's, kept identical
  README.md                   copy of the repo's, kept identical
  assets/icon.png             512 by 512 PNG from sidecut-icon, the only asset
  agents/<role>.md            only with subagents
  codex/agents/<prefix>-<role>.toml  Codex profile of each subagent, generated
  evals/<case>/               trigger and near-miss evals, one folder per case
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
| Icon | `bunx sidecut-icon <lucide-name>` draws it in Sidecut Builder's style: a near-black rounded tile, one white [Lucide](https://lucide.dev/icons) mark and Builder's orange full stop. One mark per plugin, never another plugin's | no |

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
| Codex extra fields | After the shared fields: `skills` (`./skills/`), `mcpServers` (`./mcp.json`) with an MCP server, `hooks` (`./hooks/codex-hooks.json`) with hooks, then `interface` last | yes |
| `interface`, in order | `displayName`, `shortDescription` (the description), `longDescription` (2 or 3 sentences), `developerName` (`Sidecut Studio`), `category`, `capabilities`, `websiteURL`, `defaultPrompt` (1 to 3 prompts, each at most 128 characters), `brandColor` (`#FF6B00`, Sidecut Builder's orange), `composerIcon` and `logo` (both `./assets/icon.png`) | yes |
| Unknown fields | None | yes |

## MCP servers

| Item | Rule | Checked |
| --- | --- | --- |
| Config files | `.mcp.json` for Claude Code and `mcp.json` for Codex, defining the same servers under the same keys; they differ only in the fields this table names | yes |
| Local server in `.mcp.json` | `"command": "node"`, `"args": ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs"]`, no `env` block, no `PATH` | yes |
| Local server in `mcp.json` | `"command": "node"`, `"args": ["server/index.mjs"]`, `"cwd": "."`. Codex fills in no root variable for MCP servers, but resolves `cwd` from the plugin's folder | yes |
| Remote server | `"type": "http"` and `"url"`, the same in both files; nothing else; auth handled by the host | yes |
| Finding its own files | The server resolves paths from `import.meta.url`, never from the working directory, which is the user's project in Claude Code | yes |
| Source and build | TypeScript in `server/src/`, bundled to `server/index.mjs` with every dependency inlined, built file committed; CI rebuilds and fails on any difference | yes |
| Build script | `bun run build` is `bun scripts/build-server.ts`, the same file in every plugin repo; it also writes `server/THIRD_PARTY_LICENSES.txt` with the licence of every package the bundle inlines, and the Codex profile of each subagent | yes |
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
| `SKILL.md` length | At most 200 lines | yes |
| Reference file length | At most 300 lines | yes |
| Every supporting file | Linked from the References table in `SKILL.md` | yes |
| Unfinished text | No `TODO` anywhere; the skill template's `TODO` markers fail the check until replaced | yes |
| Links to other skills' files | None; name the skill instead | yes |
| Scripts | Node ESM, built-in modules only, `--help` flag, exit 0 on success and 1 on failure, plain-text output | yes |
| `agents/openai.yaml` | `interface:` with `display_name` (the SKILL.md H1), `short_description` (the description's first sentence), `icon_small` and `icon_large` (both `../../assets/icon.png`, the plugin's icon), `brand_color` (the plugin's) and `default_prompt` (`Use $<skill> to <first sentence with its verb in base form>`, so "Checks that" becomes "check that"), each value in double quotes. A skill with `disable-model-invocation: true` adds `policy:` with `allow_implicit_invocation: false`, the Codex equivalent, which Codex reads only from this file | yes |

## Skill frontmatter

Fields appear in this order and no others are used: `name`, `description`, `argument-hint`, `allowed-tools`, `user-invocable`, `disable-model-invocation`, `paths`, `model`, `effort`, `context`, `agent`. Only `name` and `description` are required; add the others where they change what the skill does. Codex reads only `name` and `description` from here and takes the rest from `agents/openai.yaml`.

| Item | Rule | Checked |
| --- | --- | --- |
| `name` | The folder name | yes |
| `description` | One line in double quotes, at most 400 characters | yes |
| Description shape | `<Does what>. Use when <situations>. Not for <thing> (use <skill>).` The `(use <skill>)` part appears when a skill in the same plugin covers it. The first sentence starts with a third-person verb: Writes, Builds, Checks | yes |
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

A skill is either a task skill or the router. Knowledge that isn't a procedure goes in `references/`.

Task skill, in this order:

1. `# <Title>`: the name without its prefix, hyphens as spaces, first word capitalized, acronyms upper case. `agentskills-build-mcp-server` is `# Build MCP server`; the router's title is the plugin's display name.
2. One paragraph of 1 to 3 sentences saying what the skill produces. No heading.
3. `## Before you start` (optional): what to check once before doing anything, including cost. A skill that spends money asks before spending.
4. `## Steps` (required): a numbered list, or `### 1. <Step>` subsections when a step needs more than 3 lines.
5. `## Rules` (optional): constraints that apply across steps.
6. `## When it goes wrong` (optional): each known failure, what to do once, and when to stop and report.
7. `## Done when` (required): one sentence or a short list the agent can verify.
8. `## References` (required when supporting files exist): a table with columns `Read` and `When`.

Router skill, in this order: `# Start`, one paragraph, `## Pick a skill` (a table with columns `Need` and `Skill`), `## Not this plugin` (requests that look close but belong elsewhere), `## Done when`.

| Item | Rule | Checked |
| --- | --- | --- |
| Section names and order | Exactly as above | yes |
| Other H2 sections | None | yes |
| "When to use" sections, role lines, footers | None | yes |
| Cross-skill pointers | Inline in Steps or in the description's Not for, written as the skill name in backticks: `agentskills-write-skill` | review |
| Pointers to skills or tools that don't exist in the plugin | None: a backticked `<plugin>:<skill>` names a real skill and a backticked `snake_case` name is a tool on the plugin's server | yes |

## Reference and example files

| Item | Rule | Checked |
| --- | --- | --- |
| Frontmatter | None | yes |
| Opening | `# <Title>`, then one sentence starting `Read this when` | yes |
| Sections | No heading level is skipped | yes |
| Sets of similar files | Same headings in the same order in every file of the set | review |
| Example files | `# <Title>`, `## Request`, `## What the agent does`, `## Result` | yes |

## Subagents

| Item | Rule | Checked |
| --- | --- | --- |
| Frontmatter | `name` (the file name), `description` in the skill shape, `tools` as the narrowest list that works, `model: inherit` | review |
| Body | `# <Role>`, one paragraph, `## Steps`, `## Return` | review |
| Codex | Codex loads subagents only from a project's `.codex/agents/`, not from a plugin (openai/codex#18988). `bun run build` writes each one as `codex/agents/<prefix>-<role>.toml`, named `<prefix>_<role>` with the prefix's hyphens as underscores, and the skill that uses it copies the profile into the project before the first use. It never overwrites a file there and never writes to `~/.codex/` | yes |
| Naming one in a skill | `<plugin id>:<role>` for Claude Code and `<prefix>_<role>` for Codex, both in backticks: `sidecut-agentskills:reviewer` (`agentskills_reviewer` in Codex). A `<plugin id>:<name>` pointer must name one of the plugin's skills or subagents | yes |
| Limits | A subagent's tool limits are enforced in Claude Code only; in Codex it runs with the parent session's permissions, and its profile says so | yes |

## Evals

| Item | Rule | Checked |
| --- | --- | --- |
| Location | `evals/` in the plugin folder, one folder per case, run with `claude plugin eval` | yes |
| Case names | `<skill>-<what>` for a skill's cases, `negative-<what>` for requests no skill in the plugin should answer | yes |
| Case files | `prompt.md` with frontmatter, then `graders/` with at least one grader | yes |
| Coverage | Every skill has at least one trigger case; the plugin has at least one `negative-` case | yes |
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
| Switch | Off unless `SIDECUT_SKILL_LOG=1`; `DO_NOT_TRACK=1` or a CI environment turns it off even then; tests in the template prove all three | yes |
| Record | One JSON line per skill run with `time`, `plugin`, `skill`, `host` and nothing else | yes |
| Location | `~/.sidecut/skill-log.jsonl`, never sent anywhere | yes |
| Ownership | Records only this plugin's skills | yes |
| Mentions in skills | None; skills never ask the agent to log, report or send feedback | review |

## Wording

| Item | Rule | Checked |
| --- | --- | --- |
| Spelling | US English | review |
| Lists in prose | No comma before the final "and" or "or" | review |
| Voice in skills | Imperative, talking to the agent: "Run", "Ask", "Stop" | review |
| Voice in descriptions | Third person present: "Writes a skill" | yes |
| The person using it | "the user" in skills; "you" in READMEs | review |
| Sentence length | At most 25 words; one idea per sentence | review |
| Shouting | No words in capitals for emphasis: `IMPORTANT`, `MUST`, `NEVER`, `ALWAYS`, `CRITICAL`, `MANDATORY` | yes |
| Banned words | `ultimate`, `comprehensive`, `seamless`, `robust`, `leverage`, `utilize`, `simply`, `just`, `please`, `expert`, `powerful`, `effortless`; the checker skips inline code and fences | yes |
| Contractions | Used: don't, it's, isn't | review |
| Version facts | Not written into skills; the skill says how to check the current version | review |
| Dates | Only in CHANGELOG entries | yes |
| Jargon | Explained in plain words the first time it appears | review |

## Markdown

| Item | Rule | Checked |
| --- | --- | --- |
| Headings | ATX (`#`), sentence case, no closing punctuation, one H1 per file, no skipped levels | yes |
| Paragraphs | One line each, no hard wrapping, at most 4 sentences | yes |
| Bullets | `-` only | yes |
| Numbered lists | `1.`, `2.` in order, only when order matters | yes |
| Bold | Only for a lead term in a bullet: `- **Term:** text` | yes |
| Italics, HTML, emoji, horizontal rules, blockquotes | None, except the two Solo Workflow marker comments in AGENTS.md | yes |
| Dashes | No em or en dashes; use a colon, comma or parentheses | yes |
| Arrows | None in prose; write "then" | yes |
| Quotes and apostrophes | Straight only | yes |
| Inline code | Commands, paths, file names, tool names, field names, environment variables | review |
| Code fences | Always tagged: `bash` for shell, `ts`, `js`, `json`, `yaml`, `toml`, `text` for trees and output | yes |
| Shell blocks | One command per line, no `$` prompt, no output mixed in | yes |
| Tables | Leading and trailing pipes, `---` in every separator cell, no alignment padding | yes |
| Links | Relative paths without `./` that resolve inside the repo; no bare URLs | yes |
| Link text | The file name for files, a short description for web pages | review |
| End of file | Exactly one newline | yes |

## README

Sections in this order:

1. `# <Display name>`, then one paragraph that is the manifest description.
2. `## What it does`: a table with columns `Skill` and `Does`, one row per skill, using each description's first sentence.
3. `## Install`: install through the Sidecut marketplace in Claude Code and Codex.
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

## AGENTS.md

Sections in this order: `# <Repo name>`, one paragraph, `## Commands` (a table with columns `Command` and `Does`), `## Layout` (a `text` tree of the top two levels), `## Rules` (repo-specific rules only), then the Solo Workflow markers. The generator writes the markers empty and `solo-workflow-configure-project` fills them; the checker skips the text between them, since Solo owns it.

| Item | Rule | Checked |
| --- | --- | --- |
| Commands | Every `package.json` script appears once as `bun run <script>`, in `package.json` order, and nothing else | yes |
| Counts, versions, dates | None | review |

## Checks and CI

| Item | Rule | Checked |
| --- | --- | --- |
| `bun run check` | Exactly `biome check . && tsc --noEmit && bun run style && bun test && bun scripts/build-server.ts --check`; the last step fails when the bundle or its licence notices are stale | yes |
| `bun run style` | `sidecut-check`, from the `sidecut-agentskills` dev dependency pinned to a tag; it includes the bundle drift check | yes |
| Checker output | One line per problem: code, file and line, plain message, how to fix; `--json` for tools | yes |
| Network | Checks pass offline | review |
| Tests | Usage log forced off by a preload file; fetch stubbed | review |
| CI | `check.yml` copied from sidecut-ops' runner-picker pattern; actions pinned by full SHA; Bun from `packageManager`; no hosted macOS or Windows | yes |
| Public repo CI | Every job runs on `ubuntu-24.04`, free for public repos, and tools come from pinned downloads with a checksum check; a public repo never uses the self-hosted runners or sidecut-ops' private actions | yes |
| Private repo CI | Keeps the runner picker, whose budget guard stops hosted jobs near the monthly credit; the checker can't tell a private repo from a public one, so a hosted-only private repo is caught in review | review |
| Merge gate | `required_checks` in `solo-workflow.toml` includes `check` | yes |
