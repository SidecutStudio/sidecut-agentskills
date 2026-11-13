# Patterns from the example plugins

Read this when you need the reason behind a house-style rule or want to know how other plugins handle something. The rules themselves are in [house-style.md](house-style.md).

Sources: Apify 1.0.2 (5 skills, remote MCP, one agent), Expo 1.13.9 (24 skills, remote MCP, four host manifests, opt-in telemetry), Firecrawl 1.0.9 (12 skills, CLI, one command) and Vercel 0.50.0 (37 skills, remote MCP, hooks, tests, CI, five host manifests). Each verdict is adopt, adapt or skip.

## Manifests

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| Claude manifest finds skills by folder convention, no `skills` list | Apify, Expo, Vercel | Adopt | A hand-kept list drifts; Firecrawl keeps the same 12 paths in two files |
| Explicit `commands` and `agents` path lists | Vercel | Skip | Convention finds them; lists are one more thing to keep in sync |
| Codex manifest in `.codex-plugin/` with an `interface` block | Expo | Adopt | Tested: Codex loads plugin hooks only from this layout (openai/codex#47925). It fills in no root variable for MCP servers, but resolves `cwd: "."` from the plugin's folder, so a bundled server runs |
| Agent Plugins 1.0 root `plugin.json` and `mcp.json` with `${PLUGIN_ROOT}`, Codex listing in `extensions.com.openai.interface` | sidecut-ci, Lovable Workbench | Skip | Tested: with this root manifest Codex starts the bundled server but loads none of the plugin's hooks |
| One manifest per extra host (Cursor, Grok, Kimi, open-plugin) | Expo, Vercel | Skip | Every extra file disagreed with the others: names, descriptions, keyword counts (8, 10, 14, 28) |
| Same description in every manifest | Apify | Adopt | Apify is the only example where all copies match |
| Version in every manifest, nothing checks they match | All four | Adapt | Keep one version in every file and let the checker fail on any mismatch |
| Two byte-identical MCP files (`.mcp.json` and `mcp.json`) | Expo | Adapt | Two files are needed for a local server because the hosts use different root variables; the checker keeps them identical apart from that |
| Non-standard fields such as a `note` on an MCP server | Vercel | Skip | Ignored by hosts and went stale ("read-only in initial release") |
| Marketplace entry with `category` and `tags` | Apify | Adopt | Helps the listing; lives in the marketplace repo, not the plugin |

## Skill names and frontmatter

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| Product prefix on every skill (`firecrawl-scrape`, `apify-actorization`) | Apify, Expo, Firecrawl | Adopt | Skills from every plugin share one list of names, so a bare `review-plugin` can clash (anthropics/claude-code#88838); Codex prompts and Claude Desktop show the bare name |
| Mixed name shapes: nouns, verbs, adjectives (`ultimate-scraper`) | Apify, Vercel | Skip | Pick one shape: verb then object |
| Only `name` and `description` plus host fields | Apify, Firecrawl | Adopt | Short frontmatter stays readable and checkable |
| Per-skill `version` and `license` | Expo | Skip | Three skills lacked them and one said "MIT License"; the plugin version covers it |
| Routing data in frontmatter (`pathPatterns`, `promptSignals`, `chainTo`, `validate`) | Vercel | Skip | Up to 507 frontmatter lines in one skill, a third of all lines, partly unused |
| `allowed-tools` scoped to the skill's CLI | Expo, Firecrawl | Adopt | Fewer permission prompts without opening everything |
| Mixed quoting, literal `\n` in descriptions | Expo, Firecrawl | Skip | One quoting rule, checked |
| Description: what it does, then "Use when" | All four | Adopt | The common shape across 60+ skills |
| "Not for" clause naming the sibling skill | Expo (5 of 24), Vercel (1 of 37) | Adopt | Stops two skills firing for the same request |
| Descriptions from 71 to 1,012 characters | Expo, Firecrawl, Vercel | Adapt | Cap the length; the long ones repeated their own bodies |

## SKILL.md body

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| `Done when` line ending every task skill | Firecrawl | Adopt | Gives the agent a clear stopping point |
| Phases that open with a goal and end with a checklist | Apify | Adapt | Becomes the fixed Steps then Done when order |
| Required section list enforced by a validator | Vercel commands | Adopt | The only example where structure stayed consistent across files |
| "When to use this skill" section | Apify, Expo, Vercel | Skip | Repeats the description |
| Copied footer in every skill (feedback, see also) | Expo (24 copies), Firecrawl | Skip | Boilerplate that costs context in every skill |
| Stub sections that only say "see references/x.md" | Apify (6 in one skill) | Skip | Use one References table instead |
| Shouting: `IMPORTANT`, `MUST`, `NEVER`, `CRITICAL` | Apify, Expo, Vercel | Skip | Plain instructions work as well and read calmer |
| Role line ("You are a ...") | Apify, Vercel | Skip | Says nothing the steps don't |
| Missing H1, H1 reused as a divider mid-file | Expo, Vercel | Skip | One H1 per file, checked |
| Five closing-section names, five cross-reference syntaxes | Vercel | Skip | One name and one link style, checked |
| Mixed fence tags (`sh` and `bash`, `ts` and `typescript`), untagged trees | Expo, Vercel | Skip | One tag per language, `text` for trees |
| Lines over 1,000 characters next to hard-wrapped files | Expo, Firecrawl, Vercel | Adapt | No hard wrap, one paragraph per line, short paragraphs |
| Mixed dash styles in one plugin (em dashes in one skill, hyphens in another) | Expo | Skip | One dash rule |

## References, examples and scripts

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| `references/` one level deep, kebab-case files | All four | Adopt | Common shape; Apify's second level was the one that went inconsistent |
| "Read X when Y" table instead of loading everything | Apify, Vercel | Adopt | Keeps context small |
| Reference file opens with where it's read from | Firecrawl | Adopt | Tells an agent landing on the file why it is there |
| Frontmatter on reference files whose names don't match | Firecrawl | Skip | References are not skills |
| Fixed template for every entry in a reference set | Apify workflows | Adopt | Makes 14 files read alike, where they followed it |
| `upstream/` copy plus overlay for vendored skills | Vercel | Skip | 122 duplicate files; we rewrite instead of vendoring |
| Small Node scripts with no dependencies inside a skill | Expo | Adopt | Runs anywhere the host runs |
| Fetch the live schema instead of trusting memory | Expo | Adopt | Avoids stale version facts |
| Hard-coded version facts inside rules | Vercel | Skip | Went stale against the product's own docs |

## Routers, agents and commands

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| Router skill with a need-to-skill table | Expo, Firecrawl | Adopt | The clearest routing form seen |
| "Do not load when" gate on the router | Expo | Adopt | Stops the router firing for nearby topics |
| Routing to skills or MCP tools the plugin doesn't ship | Expo, Firecrawl | Skip | Dangling targets; the checker must fail on them |
| Agent as the only entry point, skills hidden | Apify | Skip | Hides skills from people who know what they want |
| Transport detection once (MCP or CLI), then reuse | Apify | Adopt | Avoids each skill re-checking setup |
| Slash commands next to skills | Firecrawl, Vercel | Skip | Skills are already invocable; commands duplicate them |
| Agents and commands generated from skill sections with provenance comments | Vercel | Skip | Machinery a small plugin doesn't need; one template was byte-identical to its output |
| Subagent frontmatter with `tools` and `model: inherit` | Apify | Adopt | States what the agent can touch |
| Per-skill `agents/openai.yaml` with display name and starter prompt | Expo, Vercel (1 skill) | Adopt | How Codex shows a skill |

## Hooks, telemetry and feedback

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| Hooks as plain Node scripts run from `${CLAUDE_PLUGIN_ROOT}` | Expo, Vercel | Adopt | No build step, no dependencies |
| TypeScript hooks compiled to committed `.mjs` | Vercel | Skip | Drift checked only by function names |
| Timeout on every hook, exit 0 on own failure | Expo, Vercel (partly) | Adopt | Vercel's session-start hooks had none and could spend about 9 seconds |
| Hooks that scan the repo and inject context at session start | Vercel | Skip | Costs every session, including unrelated projects |
| Skill-use event on `PostToolUse` with matcher `Skill` | Expo, Vercel | Adapt | Keep the event, write a local file only |
| Opt-in marker file, `DO_NOT_TRACK` and CI turn it off | Expo | Adopt | The safest switch seen |
| Default-on network telemetry, install IDs, user-agent tags, `generatedBy` written into user files | Apify, Vercel | Skip | Data leaves the machine without a yes |
| Feedback sending folded into a skill's done criterion | Firecrawl | Skip | Mixes the vendor's goals into the user's task |
| Eval-candidate report the user approves before it's sent | Expo | Adapt | Feeds Solo Workflow's dogfood log instead |

## MCP servers

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| Remote server as `type: http` and `url`, OAuth handled by the host | Apify, Expo, Vercel | Adopt | Nothing secret in the repo |
| Local server bundled to one `index.mjs` | sidecut-ci | Adopt | Installs with no `npm install` |
| Runtime found through a hard-coded `PATH`, `bun` as the command | sidecut-ci | Skip | Breaks on any other machine layout; Codex already passes the user's `PATH` and `node` was found in testing |
| Skills that document tools the plugin's server doesn't have | Firecrawl | Skip | The checker must match tool names in skills against the server |

## Tests, checks and CI

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| Validator with issue codes, plain messages and hints | Vercel | Adopt | Failures say what to fix |
| `--check` mode for anything generated, run in CI before the build | Vercel | Adopt | The bundled MCP server is the one generated file |
| Per-skill tests that ban known-bad strings | Vercel | Adopt | Locks in fixes |
| Structural test pinning which hooks are registered | Vercel | Adopt | Stops a hook appearing or vanishing unnoticed |
| Telemetry forced off in tests by a preload file | Vercel | Adopt | Tests never write the log or touch the network |
| Validation that needs the network | Vercel | Skip | Checks must pass offline |
| CI actions pinned by tag, tool versions set to `latest` | Vercel | Skip | Pin actions by SHA and tools by version |
| Benchmark harness, fuzz files, playground scripts pointing at missing files | Vercel | Skip | Overkill and partly dead |
| No tests or CI at all | Apify, Expo, Firecrawl | Skip | Those three had the most drift between README, manifests and skills |

## Repo docs

| Pattern | Seen in | Verdict | Why |
| --- | --- | --- | --- |
| README with a component table near the top | Apify, Expo | Adopt | Shows what's inside in one look |
| README sections written once and never checked | All four | Skip | Every README listed things that didn't exist or left out real skills |
| Keep a Changelog with SemVer | Apify | Adapt | Add dates and cover skills, not only manifests |
| `CLAUDE.md` dev guide that opens with one line per command | Vercel | Adopt | Fast to scan; put it in `AGENTS.md` |
| Dev guide with counts and field lists typed by hand | Vercel | Skip | Every count in it was wrong; let the checker report counts |
| Privacy section saying what is recorded | Expo, Vercel | Adopt | Expo's left out half the fields; ours lists every field |

## Drift the checker must catch

Every example drifted in the same ways. Each line below is a checker rule.

- A name that differs between manifests (`vercel` and `vercel-plugin`, `expo` and `Expo`).
- A description, version or keyword list that differs between manifests.
- A skill, tool or file named in a skill, README or manifest that doesn't exist.
- A skill that exists but isn't in the README's skill table.
- A heading, fence tag, link style or frontmatter order that breaks the house style.
- A hook without a timeout, or a hook file that isn't registered.
- A bundled file that no longer matches its source.
