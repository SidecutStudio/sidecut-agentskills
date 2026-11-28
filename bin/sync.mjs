#!/usr/bin/env node

// scripts/sync.ts
import { spawnSync as spawnSync4 } from "node:child_process";
import { existsSync as existsSync15, readFileSync as readFileSync15, writeFileSync as writeFileSync4 } from "node:fs";
import { join as join15, resolve as resolve2 } from "node:path";
import { parseArgs } from "node:util";

// plugins/sidecut-agentskills/server/src/check/repo.ts
import { existsSync as existsSync14, lstatSync as lstatSync4, readdirSync as readdirSync9, readFileSync as readFileSync14, realpathSync as realpathSync3 } from "node:fs";
import { join as join14 } from "node:path";

// plugins/sidecut-agentskills/server/src/scaffold.ts
import {
  existsSync as existsSync4,
  lstatSync,
  mkdirSync as mkdirSync2,
  readdirSync as readdirSync3,
  readFileSync as readFileSync4,
  statSync as statSync2,
  writeFileSync as writeFileSync2
} from "node:fs";
import { basename, dirname as dirname2, join as join4, relative as relative3 } from "node:path";
import { fileURLToPath } from "node:url";

// plugins/sidecut-agentskills/server/src/antigravity.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
var ANTIGRAVITY_SCHEMA = "https://antigravity.google/schemas/v1/plugin.json";
var ANTIGRAVITY_MANIFEST = ".antigravity-plugin/plugin.json";
var ANTIGRAVITY_MCP = "mcp_config.json";
var ANTIGRAVITY_HOOKS = "hooks.json";
var SKILL_LOG_HOOK = "post-tool-use-skill-log.mjs";
var COPIED = ["author", "homepage", "repository", "license", "keywords"];
var isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function antigravityManifest(claude, codex) {
  const ui = isRecord(codex.interface) ? codex.interface : {};
  const prompts = Array.isArray(ui.defaultPrompt) ? ui.defaultPrompt.slice(0, 3) : [];
  const manifest = {
    $schema: ANTIGRAVITY_SCHEMA,
    name: claude.name,
    displayName: ui.displayName ?? claude.name,
    version: claude.version,
    description: claude.description,
    logo: "assets/icon.png"
  };
  if (prompts.length) manifest.suggestedPrompts = prompts;
  for (const field of COPIED) if (claude[field] !== void 0) manifest[field] = claude[field];
  return manifest;
}
function antigravityMcp(claudeMcp) {
  const servers = isRecord(claudeMcp.mcpServers) ? claudeMcp.mcpServers : {};
  const out = {};
  for (const [name, server] of Object.entries(servers)) {
    if (!isRecord(server)) continue;
    if (typeof server.url === "string") {
      out[name] = { url: server.url };
      continue;
    }
    const entry = { command: server.command };
    if (Array.isArray(server.args))
      entry.args = server.args.map(
        (arg) => typeof arg === "string" ? arg.replaceAll("${CLAUDE_PLUGIN_ROOT}", "${PLUGIN_ROOT}") : arg
      );
    out[name] = entry;
  }
  return { mcpServers: out };
}
var EVENTS = {
  PreToolUse: { flat: false },
  PostToolUse: { flat: false },
  Stop: { flat: true },
  SessionStart: { flat: true }
};
var TOOLS = {
  Bash: ["run_command"],
  Skill: ["read_file", "view_file", "run_command"],
  Read: ["read_file", "view_file"],
  Edit: ["replace_file_content", "multi_replace_file_content"],
  Write: ["write_to_file"],
  Grep: ["grep_search"],
  Glob: ["find_by_name"]
};
var PREFIX = /^(?:pre-tool-use|post-tool-use|stop|session-start)-/;
var SCRIPT = /hooks\/([\w.-]+\.mjs)/g;
function antigravityMatcher(matcher) {
  if (matcher === void 0 || matcher === "" || matcher === "*") return "*";
  if (typeof matcher !== "string") return null;
  const tools = [];
  for (const part of matcher.split("|")) {
    const mapped = TOOLS[part];
    if (!mapped) return null;
    for (const tool of mapped) if (!tools.includes(tool)) tools.push(tool);
  }
  return tools.join("|");
}
function scriptOf(handler) {
  if (!isRecord(handler) || typeof handler.command !== "string") return null;
  const args = Array.isArray(handler.args) ? handler.args : [];
  const path = args.length === 0 ? /^node\s+"?([^\s"]+)"?$/.exec(handler.command)?.[1] : handler.command === "node" && args.length === 1 && typeof args[0] === "string" ? args[0] : void 0;
  return path ? /(?:^|\/)hooks\/([\w.-]+\.mjs)$/.exec(path)?.[1] ?? null : null;
}
function antigravityHooks(claudeHooks, current2, skillLog = true) {
  const out = {};
  if (skillLog)
    out["skill-log"] = {
      PostToolUse: [
        {
          matcher: "read_file|view_file|run_command",
          hooks: [{ type: "command", command: `node ./hooks/${SKILL_LOG_HOOK}`, timeout: 5 }]
        }
      ]
    };
  const chosen = new Set([...(current2 ?? "").matchAll(SCRIPT)].map((m) => m[1]));
  chosen.delete(SKILL_LOG_HOOK);
  const events = claudeHooks && isRecord(claudeHooks.hooks) ? claudeHooks.hooks : {};
  for (const [event, groups] of Object.entries(events)) {
    const shape = EVENTS[event];
    if (!shape || !Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!isRecord(group) || !Array.isArray(group.hooks)) continue;
      const matcher = antigravityMatcher(group.matcher);
      if (matcher === null || shape.flat && matcher !== "*") continue;
      for (const handler of group.hooks) {
        const script = scriptOf(handler);
        if (!script || !chosen.has(script) || !isRecord(handler)) continue;
        const name = script.replace(/\.mjs$/, "").replace(PREFIX, "");
        if (name === "skill-log") continue;
        const entry = { type: "command", command: `node ./hooks/${script}` };
        if (typeof handler.timeout === "number") entry.timeout = handler.timeout;
        if (!isRecord(out[name])) out[name] = {};
        const group2 = out[name];
        if (!Array.isArray(group2[event])) group2[event] = [];
        group2[event].push(shape.flat ? entry : { matcher, hooks: [entry] });
      }
    }
  }
  return out;
}
function formatJson(value, width = 100) {
  const out = (v, indent, lead, comma) => {
    if (Array.isArray(v)) {
      if (v.length === 0) return "[]";
      const flat = v.every((x) => x === null || typeof x !== "object");
      const inline = `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
      if (flat && lead + inline.length + (comma ? 1 : 0) <= width) return inline;
      const inner = `${indent}  `;
      const items = v.map((x, i) => `${inner}${out(x, inner, inner.length, i < v.length - 1)}`);
      return `[
${items.join(",\n")}
${indent}]`;
    }
    if (isRecord(v)) {
      const entries = Object.entries(v);
      if (entries.length === 0) return "{}";
      const inner = `${indent}  `;
      const items = entries.map(([k, x], i) => {
        const key = `${inner}${JSON.stringify(k)}: `;
        return `${key}${out(x, inner, key.length, i < entries.length - 1)}`;
      });
      return `{
${items.join(",\n")}
${indent}}`;
    }
    return JSON.stringify(v);
  };
  return `${out(value, "", 0, false)}
`;
}
function antigravityFilesFrom(read2) {
  const parse = (path) => {
    const text = read2(path);
    if (text === null) return null;
    try {
      const value = JSON.parse(text);
      return isRecord(value) ? value : null;
    } catch {
      return null;
    }
  };
  const claude = parse(".claude-plugin/plugin.json");
  const codex = parse(".codex-plugin/plugin.json");
  if (!claude || !codex) return null;
  const mcp = parse(".mcp.json");
  if (!mcp && read2(".mcp.json") !== null) return null;
  const hasSkillLog = read2(`hooks/${SKILL_LOG_HOOK}`) !== null;
  const hooks = antigravityHooks(parse("hooks/hooks.json"), read2(ANTIGRAVITY_HOOKS), hasSkillLog);
  return [
    { path: ANTIGRAVITY_MANIFEST, text: formatJson(antigravityManifest(claude, codex)) },
    { path: ANTIGRAVITY_MCP, text: mcp ? formatJson(antigravityMcp(mcp)) : null },
    {
      path: ANTIGRAVITY_HOOKS,
      text: Object.keys(hooks).length ? formatJson(hooks) : null
    }
  ];
}
function antigravityFiles(pluginDir) {
  return antigravityFilesFrom((path) => {
    const full = join(pluginDir, path);
    return existsSync(full) ? readFileSync(full, "utf8") : null;
  });
}

// plugins/sidecut-agentskills/server/src/check/evals-stamp.ts
import { createHash } from "node:crypto";
import { existsSync as existsSync2, readdirSync, readFileSync as readFileSync2, realpathSync, statSync } from "node:fs";
import { isAbsolute, join as join2, relative, sep } from "node:path";
var STAMP_FILE = "evals-source.json";
function treeFiles(dir) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const walk = (d) => {
    const real = realpathSync(d);
    if (seen.has(real)) throw new Error(`${relative(dir, d) || "."} links back into the copy.`);
    seen.add(real);
    for (const name of readdirSync(d)) {
      if (name === ".DS_Store") continue;
      const p = join2(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join("/"));
    }
    seen.delete(real);
  };
  walk(dir);
  return out.sort();
}
function treeHash(dir, files = treeFiles(dir)) {
  const h = createHash("sha256");
  for (const f of files) {
    const body = createHash("sha256").update(readFileSync2(join2(dir, f))).digest("hex");
    h.update(`${f}
${body}
`);
  }
  return `sha256-${h.digest("hex")}`;
}
function stampProblems(root2) {
  const file = join2(root2, STAMP_FILE);
  if (!existsSync2(file)) return [];
  let copies;
  try {
    copies = JSON.parse(readFileSync2(file, "utf8")).copies;
  } catch {
    copies = void 0;
  }
  if (!Array.isArray(copies) || copies.length === 0)
    return [{ file: STAMP_FILE, message: `${STAMP_FILE} has no copies list.` }];
  const problems = [];
  for (const copy of copies) {
    const path = String(copy?.path ?? "");
    const dir = join2(root2, path);
    const inside = path !== "" && !isAbsolute(path) && !relative(root2, dir).startsWith("..");
    let hash = null;
    try {
      if (inside && existsSync2(dir) && statSync(dir).isDirectory()) hash = treeHash(dir);
    } catch (error) {
      problems.push({
        file: path,
        message: `${path} can't be hashed: ${error instanceof Error ? error.message : String(error)}`
      });
      continue;
    }
    if (hash === null || hash !== copy.hash)
      problems.push({
        file: path || STAMP_FILE,
        message: `${path || "A copy"} doesn't match the hash in ${STAMP_FILE}.`
      });
  }
  return problems;
}

// plugins/sidecut-agentskills/server/src/check/report.ts
import { relative as relative2, sep as sep2 } from "node:path";
function toPosix(path) {
  return sep2 === "/" ? path : path.split(sep2).join("/");
}
function relativePosix(from, path) {
  return toPosix(relative2(from, path));
}
var ADVISORY_CODES = [
  "SKILL_LENGTH",
  "REF_LENGTH",
  "SKILL_DESCRIPTION_LENGTH",
  "SKILL_DESCRIPTION_SHAPE",
  "SCAN_TEXT",
  "SKILL_LONG_STEP",
  "SKILL_REPEATED_TEXT",
  "DEAD_ORPHAN",
  "DEAD_POINTER",
  "BLOAT_LINES",
  "BLOAT_SMALL_REF",
  "AGENTS_BUDGET",
  "STALE_DATED",
  "COPY_WEAK",
  "COPY_OWNER",
  "OWNED_PORT"
];
function keepCovers(key, code, file) {
  return key === code || key === file || file.startsWith(`${key}/`) || key === `${code} ${file}`;
}
var Report = class {
  problems = [];
  advisories = [];
  /** Problems the repo lists under `sidecut.keep` in package.json, each with the reason given. */
  kept = [];
  /** What was checked, for example the whole repo or only its plugins, and why. */
  scope = "";
  /** Checks that couldn't run here, and why, so a pass never hides them. */
  notes = [];
  /** What `sidecut-sync --fix` can change, keyed to the problem it fixes. */
  fixes = [];
  /**
   * Moves the problems `keep` covers into `kept`. A key covers a problem when it is the problem's
   * code, its file, a folder holding the file, or "CODE file". A key that covers nothing is itself a
   * problem, so a difference that was fixed doesn't stay listed.
   */
  applyKeep(keep) {
    for (const [key, reason] of Object.entries(keep)) {
      const hit = this.problems.filter((p) => keepCovers(key, p.code, p.file));
      if (!String(reason).trim())
        this.add(
          "KEEP_REASON",
          "package.json",
          void 0,
          `"${key}" has no reason.`,
          "Say why it differs."
        );
      else if (hit.length === 0)
        this.add(
          "KEEP_UNUSED",
          "package.json",
          void 0,
          `The keep list in package.json names "${key}", which no longer differs.`,
          "Remove it."
        );
      for (const p of hit) this.kept.push({ ...p, reason: String(reason) });
      this.problems = this.problems.filter((p) => !hit.includes(p));
      for (let i = this.fixes.length - 1; i >= 0; i--) {
        const f = this.fixes[i];
        if (f && keepCovers(key, f.code, f.file)) this.fixes.splice(i, 1);
      }
    }
  }
  add(code, file, line, message, fix, autoFix) {
    const target = ADVISORY_CODES.includes(code) ? this.advisories : this.problems;
    const path = toPosix(file);
    if (target.some(
      (p) => p.code === code && p.file === path && p.line === line && p.message === message
    ))
      return;
    target.push({ code, file: path, line, message, fix });
    if (autoFix) this.fixes.push({ ...autoFix, code, file: toPosix(file) });
  }
  format() {
    return this.problems.map((p) => `${p.code} ${p.file}${p.line ? `:${p.line}` : ""} ${p.message} Fix: ${p.fix}`).join("\n");
  }
};
function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}
function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// plugins/sidecut-agentskills/server/src/sidecut-profile.ts
var SOLO_FILE = "solo-workflow.toml";
var SOLO_LOCAL_FILE = "solo-workflow.local.toml";
var SOLO_START = "<!-- solo-workflow:start -->";
var SOLO_END = "<!-- solo-workflow:end -->";
var SOLO_HEADINGS = ["Sidecut Solo", "Solo Workflow"];
var SOLO_BLOCK = `${SOLO_START}
## Sidecut Solo

Follow \`solo-workflow.toml\`. Use the relevant Solo skill, or \`solo\` to route the request.
${SOLO_END}`;
var SOLO_SETUP = "Run solo-configure-project.";
var PRIVATE_ACTIONS = /SidecutStudio\/sidecut-ops\/\.github\/actions\//;
var CI_LAYOUT = "CI, using sidecut-ops' runner picker";
var SIDECUT_SETTINGS = {
  org: "SidecutStudio",
  authorName: "Sidecut Studio",
  authorUrl: "https://sidecut.dev",
  homepage: "https://sidecut.dev",
  prefix: "sidecut-",
  marketplace: "SidecutStudio/sidecut-plugins",
  ci: "sidecut",
  license: "MIT",
  brandColor: "#FF6B00",
  brand: "Sidecut",
  workflow: "solo",
  houseStyle: "",
  voice: "",
  namespace: ""
};
var SIDECUT_OWNER = SIDECUT_SETTINGS.org;
var SIDECUT_CI_SNIPPETS = {
  ciLightRunner: `'{"group":"sidecut-linux-x64","labels":["self-hosted","Linux","X64","sidecut-light"]}'`,
  ciReleaseLabels: "[self-hosted, Linux, X64, sidecut-ci]",
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
  ciAppKey: "${{ secrets.SIDECUT_CI_APP_KEY }}"
};
var SIDECUT_FLEET = {
  home: "sidecut-home",
  data: "plugins/sidecut-home/server/data",
  repos: "repos.toml",
  owners: "owners.toml"
};
var SIDECUT_RETIRED = [
  // Only the written name: a URL, path or package name that still carries it is an identifier.
  {
    re: /(?<![\w/.@-])Veyla Labs(?![\w/-])/g,
    name: "Veyla Labs",
    use: "Sidecut Studio",
    autofix: true
  },
  {
    re: /(?<![\w/.@-])Sidecut Workflows(?![\w/-])/g,
    name: "Sidecut Workflows",
    use: "Sidecut Solo"
  },
  { re: /(?<![\w/.@-])Ship Properly(?![\w/-])/g, name: "Ship Properly", use: "Sidecut Solo" }
];
var PUBLIC_SIDECUT_REPOS = /* @__PURE__ */ new Set(["sidecut-agentskills", "sidecut-solo"]);
var SIDECUT_RUNNER_HOST_PATTERNS = [
  /\bsidecut-linux-x64-\d+\b/g,
  /\bafter[-]nine-mac-ci\b/g
];
var SIDECUT_PRIVATE_GITHUB_LINK = /(?:https?:\/\/(?:raw\.githubusercontent\.com|api\.github\.com\/repos|github\.com)\/|(?:ssh:\/\/)?git@github\.com[:/]|github:)(SidecutStudio|SidecutDev)\/([A-Za-z0-9._-]+)/gi;
var SIDECUT_PRIVATE_SITE_PATTERNS = [
  /https?:\/\/linear\.app\/sidecutstudio(?:\/[^\s"'`),;]*)?/gi
];

// plugins/sidecut-agentskills/server/src/ci-snippets.ts
var INDENT = "          ";
var CI_SNIPPETS = {
  ciOwnLane: "self-hosted",
  ...SIDECUT_CI_SNIPPETS,
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
  ghTokenEnv: "GH_TOKEN: ${{ github.token }}",
  secretScanInstall: [
    'curl -fsSL -o "$RUNNER_TEMP/trufflehog.tar.gz" https://github.com/trufflesecurity/trufflehog/releases/download/v3.99.2/trufflehog_3.99.2_linux_amd64.tar.gz',
    'echo "3c7b0d1dc4278294269bfdd7594bca8bb28c78da0a4a06ad202ded37b48deca4  $RUNNER_TEMP/trufflehog.tar.gz" | sha256sum --check',
    'tar -xzf "$RUNNER_TEMP/trufflehog.tar.gz" -C "$RUNNER_TEMP" trufflehog',
    'echo "$RUNNER_TEMP" >> "$GITHUB_PATH"'
  ].join(`
${INDENT}`),
  ghInstall: [
    'curl -fsSL -o "$RUNNER_TEMP/gh.tar.gz" https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_linux_amd64.tar.gz',
    'echo "bb766f710eef8ede859c18578c72c327597cd4c8a85b06001b1f3843c6019386  $RUNNER_TEMP/gh.tar.gz" | sha256sum --check',
    'tar -xzf "$RUNNER_TEMP/gh.tar.gz" -C "$RUNNER_TEMP" --strip-components=2 gh_2.102.0_linux_amd64/bin/gh',
    'echo "$RUNNER_TEMP" >> "$GITHUB_PATH"'
  ].join(`
${INDENT}`)
};

// plugins/sidecut-agentskills/server/data/eval-fixtures/other-plugin-status.json
var other_plugin_status_default = {
  schemaVersion: 1,
  id: "other-plugin-status",
  input: {
    prompt: "The calendar plugin\u2019s scheduling tools disappeared. Can you check whether that plugin is connected?",
    context: "The plugin under test is presented as the export plugin. The user is asking about a separate calendar plugin."
  },
  expectedBehavior: "Keep the export plugin\u2019s status skill quiet when another plugin is the named subject.",
  grading: [
    {
      kind: "skill-quiet",
      skill: "check-status",
      notes: "Fail if the runtime records any invocation of the export plugin\u2019s bound status skill. A calendar status action or an honest statement that calendar status is unavailable is acceptable."
    }
  ]
};

// plugins/sidecut-agentskills/server/data/eval-fixtures/plugin-status.json
var plugin_status_default = {
  schemaVersion: 1,
  id: "plugin-status",
  input: {
    prompt: "I just updated the export plugin and its tools disappeared. Can you check whether it is connected and what version is running?",
    context: "The installed plugin is presented as the export plugin. A simulated status operation reports a reachable server at version 1.2.3."
  },
  expectedBehavior: "Use the target plugin\u2019s status skill and report only the connection and version that the session can verify.",
  grading: [
    {
      kind: "skill-used",
      skill: "check-status",
      notes: "Look for a recorded invocation of the export plugin\u2019s bound status skill. A status-like reply alone does not establish invocation."
    },
    {
      kind: "rubric",
      notes: "With the supplied status stub, the reply identifies a reachable server at version 1.2.3. Fail if it treats a successful status call as evidence that the export tool works."
    }
  ]
};

// plugins/sidecut-agentskills/server/src/settings.ts
import { spawnSync } from "node:child_process";
import { existsSync as existsSync3, mkdirSync, readdirSync as readdirSync2, readFileSync as readFileSync3, writeFileSync } from "node:fs";
import { dirname, isAbsolute as isAbsolute2, join as join3 } from "node:path";
var DEFAULTS = {
  profile: "",
  org: "",
  authorName: "",
  authorUrl: "",
  homepage: "",
  prefix: "",
  marketplace: "",
  ci: "hosted",
  license: "MIT",
  brandColor: "#3B82F6",
  brand: "",
  workflow: "",
  houseStyle: "",
  voice: "",
  namespace: ""
};
var PROFILES = {
  sidecut: SIDECUT_SETTINGS
};
var REPO_FILE = ".agentskills.json";
var KEYS = Object.keys(DEFAULTS);
function cleanSettings(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const key of KEYS) {
    const v = value[key];
    if (typeof v === "string") out[key] = v;
  }
  return out;
}
function readInput(path) {
  if (!existsSync3(path)) return null;
  try {
    return cleanSettings(JSON.parse(readFileSync3(path, "utf8")));
  } catch {
    throw new Error(`${path} isn't valid JSON.`);
  }
}
function mergeSettings(...layers) {
  let out = { ...DEFAULTS };
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.profile) {
      const profile = PROFILES[layer.profile];
      if (!profile)
        throw new Error(
          `Unknown profile "${layer.profile}". Known: ${Object.keys(PROFILES).join(", ")}.`
        );
      out = { ...out, ...profile, profile: layer.profile };
    }
    for (const key of KEYS) {
      const v = layer[key];
      if (key !== "profile" && v !== void 0) out[key] = v;
    }
  }
  if (out.ci !== "hosted" && out.ci !== "sidecut")
    throw new Error(`CI mode "${out.ci}" must be hosted or sidecut.`);
  if (!["", "sidecut", "agentskills"].includes(out.namespace))
    throw new Error(`Namespace "${out.namespace}" must be empty, sidecut or agentskills.`);
  if (out.workflow !== "" && out.workflow !== "solo")
    throw new Error(`Workflow "${out.workflow}" must be empty or solo.`);
  if (out.marketplace && !/^[\w.-]+\/[\w.-]+$/.test(out.marketplace))
    throw new Error(
      `Marketplace "${out.marketplace}" must be owner/repo, or empty for the plugin's own repo.`
    );
  if (out.prefix && !/^[a-z0-9]+(-[a-z0-9]+)*-$/.test(out.prefix))
    throw new Error(
      `Prefix "${out.prefix}" must be lowercase kebab-case ending in a hyphen, such as acme-.`
    );
  return out;
}
function readRepoSettings(root2) {
  return readInput(join3(root2, REPO_FILE));
}
function readScanTextAllow(root2) {
  const path = join3(root2, REPO_FILE);
  if (!existsSync3(path)) return [];
  try {
    const value = JSON.parse(readFileSync3(path, "utf8")).scanTextAllow;
    return Array.isArray(value) ? value.filter((g) => typeof g === "string") : [];
  } catch {
    return [];
  }
}
function inferRepoSettings(root2) {
  const plugins = join3(root2, "plugins");
  const ids = existsSync3(plugins) ? readdirSync2(plugins).filter((n) => n !== ".DS_Store") : [];
  for (const id2 of ids) {
    try {
      const manifest = JSON.parse(
        readFileSync3(join3(plugins, id2, ".claude-plugin", "plugin.json"), "utf8")
      );
      const owner2 = /^https:\/\/github\.com\/([\w.-]+)\//.exec(
        String(manifest.repository ?? "")
      )?.[1];
      if (!owner2) continue;
      if (owner2 === SIDECUT_OWNER) return { profile: "sidecut" };
      const check = join3(root2, ".github", "workflows", "check.yml");
      const picker = existsSync3(check) && readFileSync3(check, "utf8").includes("/pick-runner@");
      return cleanSettings({
        org: owner2,
        authorName: manifest.author?.name,
        authorUrl: manifest.author?.url,
        homepage: manifest.homepage,
        ci: picker ? "sidecut" : "hosted"
      });
    } catch {
    }
  }
  const remote = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: root2,
    encoding: "utf8",
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")))
  });
  const owner = /github\.com[/:]([\w.-]+)\//.exec(remote.stdout ?? "")?.[1];
  if (remote.status === 0 && owner === SIDECUT_OWNER) return { profile: "sidecut" };
  return {};
}
function repoSettings(root2) {
  const settings = mergeSettings(readRepoSettings(root2) ?? inferRepoSettings(root2));
  if (!settings.namespace) settings.namespace = namespaceInRepo(root2);
  return settings;
}
var active = mergeSettings();
function current() {
  return active;
}
function useSettings(settings) {
  active = settings;
  return settings;
}
var QUESTIONS = [
  {
    key: "org",
    ask: "Which GitHub user or organization will hold your plugin repos?",
    default: ""
  },
  { key: "authorName", ask: "Whose name goes in the manifests and the licence?", default: "" },
  { key: "authorUrl", ask: "The author's web address, if any?", default: "" },
  {
    key: "homepage",
    ask: "Your plugins' homepage, if any? Empty uses each repo's GitHub page.",
    default: ""
  },
  {
    key: "prefix",
    ask: 'A prefix in front of every plugin id, such as "acme-" for acme-notes, or none (the usual answer)?',
    default: DEFAULTS.prefix
  },
  {
    key: "marketplace",
    ask: "Where do people install your plugins from: each plugin's own repo (leave empty, the usual answer), or a shared marketplace repo, as owner/repo?",
    default: DEFAULTS.marketplace
  },
  {
    key: "license",
    ask: "The template ships the MIT licence. Keep it? For another, keep MIT now and swap the LICENSE file in after scaffolding.",
    default: DEFAULTS.license
  },
  {
    key: "ci",
    ask: 'CI runs on GitHub-hosted ubuntu-24.04 runners ("hosted"). Keep that?',
    default: DEFAULTS.ci
  },
  {
    key: "houseStyle",
    ask: "Which house style should your plugins follow: Agentskills' own (leave empty), Agentskills' own with your changes, or your own guide (give its path or URL)?",
    default: DEFAULTS.houseStyle
  },
  {
    key: "voice",
    ask: "Which voice should their docs and skills be written in: the template's VOICE.md (leave empty), that one adapted, or your own guide (give its path or URL)?",
    default: DEFAULTS.voice
  }
];
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function brandSpace(s = active) {
  return s.brand ? `${s.brand} ` : "";
}
function namespaceOf(s = active) {
  if (s.namespace === "sidecut" || s.namespace === "agentskills") return s.namespace;
  return s.profile === "sidecut" ? "sidecut" : "agentskills";
}
var NAMESPACE_FILES = [".gitignore", "AGENTS.md", "SECURITY.md", "tests/setup.ts"];
function namespaceInRepo(root2) {
  const plugins = join3(root2, "plugins");
  const hooks = existsSync3(plugins) ? readdirSync2(plugins).map((id2) => join3("plugins", id2, "hooks", "post-tool-use-skill-log.mjs")) : [];
  let older = false;
  for (const file of [...NAMESPACE_FILES, ...hooks]) {
    const path = join3(root2, file);
    if (!existsSync3(path)) continue;
    let text = "";
    try {
      text = readFileSync3(path, "utf8");
    } catch {
      continue;
    }
    if (/^(?:<!--|#|\/\/) agentskills:start |\benv\.AGENTSKILLS_SKILL_LOG\b|process\.env\.AGENTSKILLS_SKILL_LOG\b/m.test(
      text
    ))
      return "agentskills";
    if (/^(?:<!--|#|\/\/) sidecut:start |\benv\.SIDECUT_SKILL_LOG\b|process\.env\.SIDECUT_SKILL_LOG\b/m.test(
      text
    ))
      older = true;
  }
  return older ? "sidecut" : "";
}
function packageConfig(pkg) {
  const read2 = (key) => {
    const value = pkg?.[key];
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  };
  const old = read2("sidecut");
  const own = read2("agentskills");
  const keep = { ...old.keep, ...own.keep };
  const kind = own.kind ?? old.kind;
  return {
    ...Object.keys(keep).length > 0 || "keep" in old || "keep" in own ? { keep } : {},
    ...kind !== void 0 ? { kind } : {}
  };
}
function marketplaceName(id2, s = active) {
  return s.marketplace ? s.marketplace.split("/")[1] ?? s.marketplace : id2;
}

// plugins/sidecut-agentskills/server/src/eval-fixtures.ts
function shellString(text) {
  return "'" + text.replaceAll("'", "'\\''") + "'";
}
function triggerCase(name, fixture, operand) {
  const routing = fixture.grading.find(
    ({ kind }) => kind === "skill-used" || kind === "skill-quiet"
  );
  if (!routing) throw new Error(`Fixture for ${name} has no routing check.`);
  const positive = routing.kind === "skill-used";
  const match = `"skill"\\s*:\\s*"${escapeRegExp(operand)}"`;
  const files = /* @__PURE__ */ new Map([
    [
      "prompt.md",
      `---
tags: [${positive ? "trigger" : "negative"}]
runs: 1
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---
${fixture.input.prompt}
`
    ],
    [
      `graders/${positive ? "skill-fired" : "no-skill"}.md`,
      `---
type: tool_used
tool: Skill
input_match: '${match}'
${positive ? "min: 1\narm: with-only" : "min: 0\nmax: 0\narm: both"}
---
`
    ]
  ]);
  if (fixture.input.files) {
    files.set(
      "case.yaml",
      `schema_version: "1.0"
name: ${name}
context:
  scaffold_script: ./setup.sh
`
    );
    files.set(
      "setup.sh",
      Object.entries(fixture.input.files).map(([file, contents]) => `printf '%s' ${shellString(contents)} > ${shellString(file)}
`).join("")
    );
  }
  return files;
}
function pluginStarterEvals(id2, key, displayName) {
  const skill = `${key}-check-status`;
  const operand = `${id2}:${skill}`;
  const alternatePrompt = /calendar/i.test(displayName) ? other_plugin_status_default.input.prompt.replace(
    "calendar plugin\u2019s scheduling",
    "mail plugin\u2019s messaging"
  ) : other_plugin_status_default.input.prompt;
  return /* @__PURE__ */ new Map([
    [
      `${skill}-trigger`,
      triggerCase(
        `${skill}-trigger`,
        {
          ...plugin_status_default,
          input: { prompt: plugin_status_default.input.prompt.replace("the export plugin", displayName) }
        },
        operand
      )
    ],
    [
      "negative-unrelated",
      triggerCase(
        "negative-unrelated",
        { ...other_plugin_status_default, input: { prompt: alternatePrompt } },
        operand
      )
    ]
  ]);
}

// plugins/sidecut-agentskills/server/src/scaffold.ts
var here = dirname2(fileURLToPath(import.meta.url));
var dataRoot = existsSync4(join4(here, "data")) ? join4(here, "data") : existsSync4(join4(here, "..", "data")) ? join4(here, "..", "data") : join4(here, "..", "plugins", "sidecut-agentskills", "server", "data");
var templatesRoot = join4(dataRoot, "templates");
var USER_INPUT_PATH = "server/data/user-input.md";
var OLD_USER_INPUT_PATH = "server/data/owner-input.md";
function userInput() {
  return readFileSync4(join4(dataRoot, "user-input.md"), "utf8");
}
var ownVersion = JSON.parse(readFileSync4(join4(dataRoot, "..", "..", ".claude-plugin", "plugin.json"), "utf8")).version;
function pluginIdPattern(s = current()) {
  return new RegExp(`^${escapeRegExp(s.prefix)}[a-z0-9]+(-[a-z0-9]+)*$`);
}
var SKILL_NAME = /^[a-z]+(-[a-z]+){1,2}$/;
function skillPrefixOf(pluginId, s = current()) {
  return pluginId.replace(new RegExp(`^${escapeRegExp(s.prefix)}`), "");
}
function isSkillName(name, prefix) {
  return name === prefix || name.startsWith(`${prefix}-`) && SKILL_NAME.test(name.slice(prefix.length + 1));
}
var BRAND_COLOR = PROFILES.sidecut?.brandColor ?? "#FF6B00";
var ACRONYMS = /* @__PURE__ */ new Set([
  "ai",
  "api",
  "aws",
  "cdn",
  "ci",
  "cli",
  "css",
  "dns",
  "gpu",
  "html",
  "http",
  "json",
  "llm",
  "mcp",
  "pdf",
  "pr",
  "sdk",
  "sql",
  "ssh",
  "ui",
  "url",
  "ux",
  "yaml"
]);
function displayNameOf(id2) {
  return id2.split("-").map(
    (word) => ACRONYMS.has(word) ? word.toUpperCase() : (word[0] ?? "").toUpperCase() + word.slice(1)
  ).join(" ");
}
function skillTitleOf(name, prefix) {
  if (name === prefix) return displayNameOf(`${current().prefix}${prefix}`);
  return name.slice(name.startsWith(`${prefix}-`) ? prefix.length + 1 : 0).split("-").map((word, i) => {
    if (ACRONYMS.has(word)) return word.toUpperCase();
    return i === 0 ? (word[0] ?? "").toUpperCase() + word.slice(1) : word;
  }).join(" ");
}
function baseVerb(verb) {
  const word = verb.toLowerCase();
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (/(ch|sh|ss|x|z)es$/.test(word)) return word.slice(0, -2);
  return word.endsWith("s") ? word.slice(0, -1) : word;
}
function defaultPromptOf(does) {
  const [verb = "", ...rest] = does.split(" ");
  return [baseVerb(verb), ...rest].join(" ");
}
function render(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key] ?? CI_SNIPPETS[key];
    if (value === void 0) throw new Error(`Template uses unknown variable ${match}`);
    return value;
  });
}
function renderFile(path, vars) {
  return render(readFileSync4(join4(templatesRoot, path), "utf8"), vars);
}
function listFiles(dir) {
  return readdirSync3(dir).flatMap((name) => {
    const path = join4(dir, name);
    return statSync2(path).isDirectory() ? listFiles(path) : [path];
  });
}
function settingsVars(id2, s = current()) {
  const brand = brandSpace(s);
  const market = marketplaceName(id2, s);
  const ns = namespaceOf(s);
  let host = "";
  try {
    host = s.homepage ? new URL(s.homepage).host : "";
  } catch {
    host = "";
  }
  const installBlock = s.marketplace ? [
    "```text",
    `/plugin install ${id2}@${market}      # Claude Code`,
    `codex plugin add ${id2}@${market}     # Codex`,
    `agy plugin install ./${id2}/plugins/${id2}   # Antigravity, in a clone of ${s.org}/${id2}`,
    "```"
  ].join("\n") : [
    "In Claude Code, add this repo's marketplace, then install the plugin:",
    "",
    "```text",
    `/plugin marketplace add ${s.org}/${id2}`,
    `/plugin install ${id2}@${id2}`,
    "```",
    "",
    "In Codex, run:",
    "",
    "```bash",
    `codex plugin marketplace add ${s.org}/${id2}`,
    `codex plugin add ${id2}@${id2}`,
    "```",
    "",
    "In Antigravity, install the plugin folder from a clone:",
    "",
    "```bash",
    `git clone https://github.com/${s.org}/${id2}`,
    `agy plugin install ./${id2}/plugins/${id2}`,
    "```"
  ].join("\n");
  return {
    org: s.org,
    authorName: s.authorName,
    authorUrl: s.authorUrl,
    homepage: s.homepage,
    brandColor: s.brandColor,
    brandSpace: brand,
    everyBrand: s.brand ? `Every ${s.brand}` : "Every",
    voiceTitle: s.brand ? `${s.brand} voice` : "Voice",
    logTitle: s.brand ? `${s.brand} usage log` : "Usage log",
    prefixPattern: escapeRegExp(s.prefix),
    securityAlt: host ? `, or through [${host}](${s.homepage})` : "",
    ciLayout: s.ci === "sidecut" ? CI_LAYOUT : "CI on GitHub-hosted runners",
    // The sidecut CI template scans for secrets inside check; the hosted one keeps a secrets job.
    requiredChecks: s.ci === "sidecut" ? '"check"' : '"check", "secrets"',
    releaseChecks: s.ci === "sidecut" ? "['check']" : "['check', 'secrets']",
    installBlock,
    workflowMarkers: s.workflow === "solo" ? `

${SOLO_START}
${SOLO_END}` : "",
    workflowIgnore: s.workflow === "solo" ? `
${SOLO_LOCAL_FILE}` : "",
    // Agentskills' own markers, package.json key and usage log, under the repo's namespace.
    ns,
    NS: ns.toUpperCase(),
    toolOwner: ns === "sidecut" ? "sidecut-agentskills" : "Agentskills"
  };
}
function brandColorOf(pluginDir) {
  try {
    const codex = JSON.parse(readFileSync4(join4(pluginDir, ".codex-plugin", "plugin.json"), "utf8"));
    return String(codex.interface?.brandColor ?? "");
  } catch {
    return "";
  }
}

// plugins/sidecut-agentskills/server/src/check/docs.ts
import { existsSync as existsSync7, lstatSync as lstatSync2, readdirSync as readdirSync4, readFileSync as readFileSync6, statSync as statSync3 } from "node:fs";
import { basename as basename3, join as join7 } from "node:path";

// plugins/sidecut-agentskills/server/src/check/fleet.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { existsSync as existsSync5, readFileSync as readFileSync5, realpathSync as realpathSync2 } from "node:fs";
import { basename as basename2, dirname as dirname3, isAbsolute as isAbsolute3, join as join5, resolve } from "node:path";
function readGitignore(root2) {
  const path = join5(root2, ".gitignore");
  if (!existsSync5(path)) return [];
  return readFileSync5(path, "utf8").split("\n").map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith("!"));
}
function ignoredBy(patterns, path) {
  const name = basename2(path);
  return patterns.some((p) => {
    const clean = p.replace(/^\//, "").replace(/\/$/, "");
    if (!clean) return false;
    const target = clean.includes("/") ? path : name;
    if (clean.includes("*"))
      return new RegExp(
        `^${clean.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`
      ).test(target);
    return clean === target;
  });
}
function jobsOf(workflow) {
  const lines = workflow.split("\n").map((line) => line.replace(/(^|\s+)#.*$/, ""));
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start < 0) return [];
  const jobs = [];
  let jobIndent = -1;
  let keyIndent = -1;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) break;
    if (jobIndent < 0) jobIndent = indent;
    const key = /^\s*(["']?)([A-Za-z0-9_-]+)\1:\s*(.*)$/.exec(line);
    if (indent === jobIndent) {
      jobs.push({ name: key?.[2] ?? line.trim(), runsOn: void 0 });
      keyIndent = -1;
    } else if (indent > jobIndent) {
      if (keyIndent < 0) keyIndent = indent;
      const job = jobs.at(-1);
      if (indent === keyIndent && key?.[2] === "runs-on" && job) {
        job.runsOn = key[3]?.trim().replace(/^['"]|['"]$/g, "");
      }
      if (indent === keyIndent && key?.[2] === "name" && job) {
        job.title = key[3]?.trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return jobs;
}
function isHostedOnly(workflow) {
  const jobs = jobsOf(workflow);
  return jobs.length > 0 && jobs.every((job) => job.runsOn === "ubuntu-24.04");
}
function git(root2, ...args) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))
  );
  const result = spawnSync2("git", args, { cwd: root2, env, encoding: "utf8" });
  return result.status === 0 ? result.stdout : void 0;
}
function trackedFiles(root2) {
  const out = git(root2, "ls-files", "-z", "--cached", "--others", "--exclude-standard");
  if (out === void 0) return null;
  return out.split("\0").filter(Boolean).filter((file) => existsSync5(join5(root2, file)));
}
function repoName(root2) {
  const url = git(root2, "remote", "get-url", "origin")?.trim() ?? "";
  const fromUrl = /[/:]([\w.-]+?)(?:\.git)?$/.exec(url)?.[1];
  return fromUrl ?? basename2(root2);
}
function repoOwner(root2) {
  const url = git(root2, "remote", "get-url", "origin")?.trim() ?? "";
  return /github\.com[/:]([\w.-]+)\//.exec(url)?.[1] ?? "";
}
function repoFolders(root2) {
  const found = /* @__PURE__ */ new Set();
  if (process.env.SIDECUT_REPOS) found.add(resolve(process.env.SIDECUT_REPOS));
  found.add(dirname3(resolve(root2)));
  const common = git(root2, "rev-parse", "--git-common-dir")?.trim();
  if (common) {
    const dir = isAbsolute3(common) ? common : join5(root2, common);
    if (existsSync5(dir)) found.add(dirname3(dirname3(realpathSync2(dir))));
  }
  return [...found];
}
function siblingCheckout(root2, name) {
  if (repoName(root2) === name) return root2;
  for (const folder of repoFolders(root2)) {
    const path = join5(folder, name);
    if (existsSync5(join5(path, ".git"))) return path;
  }
  return null;
}
function withoutComment(line) {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "#") return line.slice(0, i);
  }
  return line;
}
function readToml(text) {
  const tables = { "": {} };
  let at = "";
  const lines = text.split("\n").map((raw) => withoutComment(raw).trim());
  for (let n = 0; n < lines.length; n++) {
    let line = lines[n] ?? "";
    if (/=\s*\[/.test(line) && !line.includes("]"))
      while (n + 1 < lines.length && !line.includes("]")) line += ` ${lines[++n] ?? ""}`;
    if (!line) continue;
    const header = /^\[\[?([^\]]+)\]\]?$/.exec(line);
    if (header) {
      at = (header[1] ?? "").trim();
      tables[at] ??= {};
      continue;
    }
    const pair = /^([\w.-]+)\s*=\s*(.+)$/.exec(line);
    if (!pair) continue;
    const value = (pair[2] ?? "").trim();
    const table = tables[at] ?? {};
    tables[at] = table;
    if (value.startsWith("["))
      table[pair[1] ?? ""] = [...value.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1] ?? "");
    else if (value.startsWith('"')) table[pair[1] ?? ""] = value.slice(1, value.lastIndexOf('"'));
    else if (value === "true" || value === "false") table[pair[1] ?? ""] = value === "true";
    else if (/^-?\d+(\.\d+)?$/.test(value)) table[pair[1] ?? ""] = Number(value);
  }
  return tables;
}
function readFleet(root2) {
  if (current().workflow !== "solo") return null;
  const home = process.env.SIDECUT_HOME ? resolve(process.env.SIDECUT_HOME) : siblingCheckout(root2, SIDECUT_FLEET.home);
  if (!home) return null;
  const file = (name) => {
    const path = join5(home, SIDECUT_FLEET.data, name);
    return existsSync5(path) ? readFileSync5(path, "utf8") : null;
  };
  const repos = file(SIDECUT_FLEET.repos);
  const owners = file(SIDECUT_FLEET.owners);
  if (repos === null || owners === null) return null;
  const kinds = /* @__PURE__ */ new Map();
  for (const [table, values2] of Object.entries(readToml(repos))) {
    const name = /^repos\.(.+)$/.exec(table)?.[1];
    if (name && typeof values2.kind === "string") kinds.set(name, values2.kind);
  }
  const owned = /* @__PURE__ */ new Map();
  for (const [table, values2] of Object.entries(readToml(owners))) {
    const id2 = /^facts\.(.+)$/.exec(table)?.[1];
    if (id2 && typeof values2.repo === "string" && typeof values2.path === "string")
      owned.set(id2, { repo: values2.repo, path: values2.path, says: String(values2.says ?? "") });
  }
  return {
    kinds,
    owners: owned,
    read: (repo, path) => {
      const checkout = siblingCheckout(root2, repo);
      const full = checkout && join5(checkout, path);
      return full && existsSync5(full) ? readFileSync5(full, "utf8") : null;
    }
  };
}

// plugins/sidecut-agentskills/server/src/check/markdown.ts
import { existsSync as existsSync6 } from "node:fs";
import { dirname as dirname4, join as join6, relative as relative4 } from "node:path";
var ALLOWED_HTML = /^<!-- (?:agentskills|sidecut):(start|end)( [\w-]+)? -->$/;
var allowedHtml = (line) => ALLOWED_HTML.test(line) || line === SOLO_START || line === SOLO_END;
function parseMarkdown(path, text) {
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const inCode = lines.map(() => false);
  let frontmatter = null;
  let start = 0;
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) {
      frontmatter = lines.slice(1, end);
      for (let i = 0; i <= end; i++) inCode[i] = true;
      start = end + 1;
    }
  }
  const headings = [];
  let fence = false;
  let solo = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line === SOLO_START) solo = true;
    if (solo) {
      inCode[i] = true;
      if (line === SOLO_END) solo = false;
      continue;
    }
    if (!fence && /^<!-- (?:agentskills|sidecut):(start|end) [\w-]+ -->$/.test(line)) {
      inCode[i] = true;
      continue;
    }
    if (/^\s*```/.test(line)) {
      inCode[i] = true;
      fence = !fence;
      continue;
    }
    if (fence) {
      inCode[i] = true;
      continue;
    }
    const match = /^(#{1,6}) (.*)$/.exec(line);
    if (match) headings.push({ level: match[1]?.length ?? 0, text: match[2] ?? "", line: i + 1 });
  }
  return { path, lines, frontmatter, headings, inCode };
}
function prose(line) {
  return line.replace(/`[^`]*`/g, "``");
}
function isStructural(line) {
  return /^\s*$|^#{1,6} |^\s*(- |\d+\. )|^\|/.test(line) || allowedHtml(line);
}
function checkLinks(doc, file, root2, report) {
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    const text = prose(line);
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1] ?? "";
      if (/^[a-z]+:/.test(target) || target.startsWith("#")) continue;
      const path = join6(dirname4(doc.path), target.split("#")[0] ?? "");
      if (!existsSync6(path)) {
        report.add(
          "MD_LINK_TARGET",
          file,
          i + 1,
          `Link target "${target}" doesn't exist.`,
          "Point the link at a real file."
        );
      }
      if (relative4(root2, path).startsWith("..")) {
        report.add(
          "MD_LINK_OUTSIDE",
          file,
          i + 1,
          `Link "${target}" leaves the repo.`,
          "Link to a file inside the repo."
        );
      }
    }
  });
}
function checkMarkdown(doc, _text, root2, report, _options = {}) {
  const file = relative4(root2, doc.path);
  checkLinks(doc, file, root2, report);
  doc.lines.forEach((line, i) => {
    if (!doc.inCode[i] && /\bTODO\b/.test(prose(line))) {
      report.add(
        "WORD_TODO",
        file,
        i + 1,
        "Unfinished template text.",
        "Complete the instruction or remove it."
      );
    }
  });
}
function sections(doc) {
  return doc.headings.filter((h) => h.level === 2);
}
function tableAfter(doc, heading) {
  const rows = [];
  for (let i = heading.line; i < doc.lines.length; i++) {
    const line = doc.lines[i] ?? "";
    if (/^#{1,6} /.test(line)) break;
    if (!line.startsWith("|")) {
      if (rows.length > 0) break;
      continue;
    }
    const cells = line.slice(1, -1).split("|").map((c) => c.trim());
    if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
  }
  return rows;
}
function paragraphAfter(doc, line) {
  for (let i = line; i < doc.lines.length; i++) {
    const text = doc.lines[i] ?? "";
    if (text.trim() === "") continue;
    if (doc.inCode[i] || isStructural(text)) return null;
    return { line: i + 1, text };
  }
  return null;
}

// plugins/sidecut-agentskills/server/src/check/docs.ts
var SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "build", ".next", ".output", ".vercel"]);
var TEXT = /\.(md|mdx|markdown|txt|html?|astro|ts|tsx|js|mjs|cjs|jsx|json|toml|ya?ml|css|sh)$/i;
var MARKDOWN = /\.(md|mdx|markdown)$/i;
var PROSE = /\.(md|mdx|markdown|txt|html?|astro)$/i;
function repoFiles(root2) {
  const tracked = trackedFiles(root2);
  if (tracked) return tracked.filter((file) => lstatSync2(join7(root2, file)).isFile());
  const gitignore = readGitignore(root2);
  const walk = (dir) => readdirSync4(join7(root2, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || ignoredBy(gitignore, path)) return [];
      return walk(path);
    }
    return entry.isFile() && !ignoredBy(gitignore, path) ? [path] : [];
  });
  return walk("");
}
function isVendored(file) {
  return /^(\.agents|\.claude|\.codex|\.cursor|\.gemini)\/skills\//.test(file) || file.startsWith(".lovable/") || // A marketplace's bundled copies of other repos' plugins.
  file.startsWith("bundled/");
}
function isHistoryOrTest(file) {
  return /(^|\/)CHANGELOG[^/]*$/i.test(file) || /(^|\/)(tests?|__tests__|e2e|fixtures|examples?)\//.test(file) || /(^|\/)(archive|records|[\w-]*history)\//i.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}
function isPublicCopy(file, kind) {
  if (/(^|\/)README[^/]*\.mdx?$/i.test(file)) return true;
  return kind === "site" && (/^(?:web\/)?(src|content|public|pages|app)\//.test(file) || /^(?:web\/)?index\.html$/.test(file)) && PROSE.test(file);
}
function read(root2, file) {
  try {
    if (statSync3(join7(root2, file)).size > 2e6) return null;
    return readFileSync6(join7(root2, file), "utf8");
  } catch {
    return null;
  }
}
var MONTH = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
var DATED = new RegExp(
  `\\b(?:(?:accurate )?as of|read on|checked on|verified on|last (?:checked|verified|updated|reviewed|read)(?: on)?)\\s+(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2} ${MONTH} \\d{4}|${MONTH} (?:\\d{1,2},? )?\\d{4})`,
  "i"
);
var WEAK_COPY = /\b(seamless(?:ly)?|leverag(?:e|es|ing)|robust|cutting[- ]edge|game[- ]chang\w*|unlock(?:s|ing)? the|empower\w*|best[- ]in[- ]class|world[- ]class|effortless(?:ly)?|supercharg\w*|next[- ]level|harness(?:es|ing)? the power|in today's fast[- ]paced|delv(?:e|es|ing) into|revolutioni[sz]\w*|it(?:'s| is) worth noting|might potentially|arguably|please note that|needless to say|rest assured)\b/i;
var OWNER_DESCRIBED = /\b((?:by|from|I'm|I am|as) (?:a |an |one )?(?:solo (?:maker|founder|developer|dev|builder)|non[- ]technical founder|self[- ]taught (?:developer|maker|founder)|indie hacker)|(?:I'm|I am|who is|who's) not a (?:trained |professional |real )?developer|built by one person|one[- ](?:person|man|woman) (?:studio|shop|company) behind)\b/i;
function hostLoaded(file) {
  const name = basename3(file);
  return !file.includes("/") || /^(SKILL|AGENTS|CLAUDE|GEMINI|README|CHANGELOG|LICENSE|SECURITY|CONTRIBUTING)(\.[\w-]+)?\.mdx?$/i.test(
    name
  ) || /^(\.github|\.claude|\.agents|\.codex|\.cursor|evals)\//.test(file) || /(^|\/)(agents|commands|rules)\/[^/]+\.md$/.test(file);
}
function checkDocs(root2, kind, fleet, report) {
  const files = repoFiles(root2).filter(
    (file) => !file.split("/").some((p) => SKIP_DIRS.has(p)) && !isVendored(file)
  );
  const texts = files.filter((file) => TEXT.test(file) || /(^|\/)LICENSE[^/]*$/.test(file)).flatMap((file) => {
    const text = read(root2, file);
    return text === null ? [] : [{ file, text }];
  });
  const markdown = texts.filter((t) => MARKDOWN.test(t.file));
  for (const t of markdown)
    if (!isHistoryOrTest(t.file))
      checkLinks(parseMarkdown(join7(root2, t.file), t.text), t.file, root2, report);
  if (kind !== "data") {
    checkRetired(texts, report);
    checkDated(markdown, report);
  }
  checkPointers(markdown, report);
  if (kind !== "data") checkOrphans(markdown, texts, report);
  checkBudgets(markdown, kind, report);
  checkSmallRefs(markdown, report);
  checkDuplicates(root2, markdown, report);
  checkCopy(texts, kind, report);
  checkLeaks(root2, kind, texts, fleet, report);
  checkOwnedFacts(root2, markdown, fleet, report);
}
function checkRetired(texts, report) {
  if (current().workflow !== "solo") return;
  for (const t of texts) {
    if (isHistoryOrTest(t.file) || !(PROSE.test(t.file) || /(^|\/)LICENSE[^/]*$/.test(t.file)))
      continue;
    t.text.split("\n").forEach((line, i) => {
      for (const name of SIDECUT_RETIRED) {
        name.re.lastIndex = 0;
        if (!name.re.test(line)) continue;
        report.add(
          "STALE_NAME",
          t.file,
          i + 1,
          `Names ${name.name}, which is retired.`,
          `Use ${name.use}. Only CHANGELOG history and tests keep the old name.`,
          name.autofix ? {
            what: `Replaced ${name.name} with ${name.use}.`,
            apply: (text) => text.replace(name.re, name.use)
          } : void 0
        );
      }
    });
  }
}
function checkDated(markdown, report) {
  for (const t of markdown) {
    if (isHistoryOrTest(t.file)) continue;
    const doc = parseMarkdown(t.file, t.text);
    doc.lines.forEach((line, i) => {
      if (!doc.inCode[i] && DATED.test(prose(line)))
        report.add(
          "STALE_DATED",
          t.file,
          i + 1,
          'A dated "as of" note, which is stale the day after it was written.',
          "Say what is true now and drop the date; link to the source so it can be read again."
        );
    });
  }
}
function checkPointers(markdown, report) {
  for (const t of markdown) {
    if (/^(CLAUDE|GEMINI)\.md$/i.test(basename3(t.file)) || isHistoryOrTest(t.file)) continue;
    const doc = parseMarkdown(t.file, t.text);
    if (doc.frontmatter) continue;
    const body = doc.lines.filter(
      (line, i) => !doc.inCode[i] && line.trim() !== "" && !/^#{1,6} /.test(line) && !/^<!--.*-->$/.test(line)
    );
    const hasCode = doc.lines.some((line, i) => doc.inCode[i] && /^\s*```/.test(line));
    if (hasCode) continue;
    const pointer = body.length <= 2 && body.every((line) => /\]\([^)]+\)|^@\S+/.test(line)) && body.join(" ").replace(/\[[^\]]*\]\([^)]*\)|@\S+/g, "").split(/\s+/).filter(Boolean).length <= 12;
    if (body.length === 0 || pointer)
      report.add(
        "DEAD_POINTER",
        t.file,
        1,
        body.length === 0 ? "The file has no text." : "The file only points to another one.",
        "Remove it and link to the real file where this one was linked."
      );
  }
}
function checkOrphans(markdown, texts, report) {
  const named = /* @__PURE__ */ new Map();
  for (const t of texts)
    for (const m of t.text.matchAll(/[\w.@/-]*?([\w.@-]+\.mdx?)\b/gi)) {
      const name = (m[1] ?? "").toLowerCase();
      if (!named.has(name)) named.set(name, /* @__PURE__ */ new Set());
      named.get(name)?.add(t.file);
    }
  for (const t of markdown) {
    if (hostLoaded(t.file) || isHistoryOrTest(t.file)) continue;
    const by = named.get(basename3(t.file).toLowerCase()) ?? /* @__PURE__ */ new Set();
    if ([...by].some((file) => file !== t.file)) continue;
    report.add(
      "DEAD_ORPHAN",
      t.file,
      void 0,
      "No other file in the repo links to or names this one.",
      'Link it from where readers start (the "Read this when" table or the skill that reads it), or remove it.'
    );
  }
}
var AGENTS_LINES = 200;
var AGENTS_BYTES = 32 * 1024;
var DOC_LINES = 500;
function checkBudgets(markdown, kind, report) {
  for (const t of markdown) {
    if (isHistoryOrTest(t.file)) continue;
    const lines = t.text.split("\n").length;
    if (basename3(t.file) === "AGENTS.md") {
      if (lines > AGENTS_LINES || Buffer.byteLength(t.text) > AGENTS_BYTES)
        report.add(
          "AGENTS_BUDGET",
          t.file,
          void 0,
          `AGENTS.md is ${lines} lines and ${Math.ceil(Buffer.byteLength(t.text) / 1024)} KiB; it loads on every task, and Codex stops reading at 32 KiB.`,
          `Keep it under ${AGENTS_LINES} lines: move detail into docs/ and link it from "Read this when".`
        );
    } else if (kind !== "data" && lines > DOC_LINES)
      report.add(
        "BLOAT_LINES",
        t.file,
        void 0,
        `${lines} lines, past the ${DOC_LINES}-line budget for a doc.`,
        "Split it by what readers come for, or cut what the code already says."
      );
  }
}
var SMALL_REF = 30;
function checkSmallRefs(markdown, report) {
  const skills = markdown.filter((t) => /^plugins\/[^/]+\/skills\/[^/]+\/SKILL\.md$/.test(t.file));
  for (const t of markdown) {
    const m = /^(plugins\/[^/]+\/skills\/[^/]+)\/(.+\.md)$/.exec(t.file);
    if (!m || basename3(t.file) === "SKILL.md") continue;
    if (t.text.split("\n").filter((l) => l.trim()).length >= SMALL_REF) continue;
    const name = basename3(t.file);
    const readers = skills.filter(
      (s) => s.file.startsWith(`${m[1]}/`) || s.text.includes(name)
    ).length;
    if (readers <= 1)
      report.add(
        "BLOAT_SMALL_REF",
        t.file,
        void 0,
        `Under ${SMALL_REF} lines and read by one skill, so it costs an extra read for little.`,
        "Fold it into that SKILL.md."
      );
  }
}
function generatedFiles(root2) {
  const path = join7(root2, SOLO_FILE);
  if (!existsSync7(path)) return /* @__PURE__ */ new Set();
  const value = readToml(readFileSync6(path, "utf8"))[""]?.protected_paths;
  return new Set(Array.isArray(value) ? value : []);
}
function checkDuplicates(root2, markdown, report) {
  const generated = generatedFiles(root2);
  const byText = /* @__PURE__ */ new Map();
  for (const t of markdown) {
    if (isHistoryOrTest(t.file) || t.text.split("\n").filter((l) => l.trim()).length < 10) continue;
    if (/^plugins\/[^/]+\/server\/data\/(user-input\.md|visual-reports\.md)$/.test(t.file))
      continue;
    byText.set(t.text, [...byText.get(t.text) ?? [], t.file]);
  }
  for (const group of byText.values()) {
    const loose = group.filter((file) => !generated.has(file));
    const [a, b] = group;
    const pair = group.length === 2 && a !== void 0 && b !== void 0 && [a, b].some((f) => !f.includes("/")) && [a, b].some((f) => new RegExp(`^plugins/[^/]+/${escapeRegExp(basename3(a))}$`).test(f));
    if (group.length < 2 || loose.length < 2 || pair) continue;
    const [first, ...rest] = loose;
    report.add(
      "COPY_DUPLICATE",
      first ?? "",
      void 0,
      `${[first, ...rest].join(" and ")} are the same text, and nothing keeps them the same.`,
      "Keep one and link to it, or generate the others in the build and list them under protected_paths."
    );
  }
}
function checkCopy(texts, kind, report) {
  for (const t of texts) {
    if (isHistoryOrTest(t.file) || !PROSE.test(t.file)) continue;
    const isPublic = isPublicCopy(t.file, kind);
    const doc = MARKDOWN.test(t.file) ? parseMarkdown(t.file, t.text) : null;
    t.text.split("\n").forEach((line, i) => {
      if (doc?.inCode[i]) return;
      const words = doc ? prose(line) : line;
      if (isPublic && OWNER_DESCRIBED.test(words))
        report.add(
          "COPY_OWNER",
          t.file,
          i + 1,
          "Public copy describes the person behind the work.",
          "Say what the product does; anything about its maker comes from their own words."
        );
      const weak = MARKDOWN.test(t.file) ? WEAK_COPY.exec(words.replace(/"[^"]*"|“[^”]*”/g, "")) : null;
      if (weak)
        report.add(
          "COPY_WEAK",
          t.file,
          i + 1,
          `"${weak[1]}" is a stock phrase or a hedge.`,
          "Say the specific thing it stands for, or cut it."
        );
    });
  }
}
function isPublicRepository(root2) {
  const check = join7(root2, ".github", "workflows", "check.yml");
  const hostedOnly = existsSync7(check) && isHostedOnly(readFileSync6(check, "utf8"));
  const s = current();
  return s.workflow === "solo" ? hostedOnly : !s.marketplace || hostedOnly;
}
function isShippedOrPublic(file, kind, isPublicRepo) {
  if (isPublicRepo) return true;
  if (file.startsWith("plugins/")) return true;
  if (kind === "site")
    return /^(?:web\/)?(?:src|content|public|pages|app)\//.test(file) || /^(?:web\/)?index\.html$/.test(file) || /(^|\/)README[^/]*\.mdx?$/i.test(file);
  if (kind === "app") return /^(?:web\/)?(?:src|content|public|pages|app)\//.test(file);
  return false;
}
function isSidecutProfileFile(file) {
  return file === "plugins/sidecut-agentskills/server/src/sidecut-profile.ts" || file === "plugins/sidecut-agentskills/server/data/profiles/sidecut.md" || file.startsWith("plugins/sidecut-agentskills/server/data/templates/ci/sidecut/") || file.startsWith("plugins/sidecut-agentskills/server/data/templates/solo/");
}
function isGeneratedBundleOrLock(file, generated) {
  return generated.has(file) || file === "package-lock.json" || /^plugins\/[^/]+\/server\/(?:index\.mjs|THIRD_PARTY_LICENSES\.txt)$/.test(file) || /^plugins\/[^/]+\/codex\/agents\//.test(file);
}
var HOME_PATH_PATTERNS = [
  /(?:^|[\s"'`(=:,]|file:\/\/)(\/Users\/(?!<|(?:Shared|runner)(?:\/|[\s"'`),;:]|$))[A-Za-z0-9._-]+)(?=\/|[\s"'`),;:]|$)/g,
  /(?:^|[\s"'`(=:,])(~\/(?:Developer|Desktop|Documents|Downloads)\/(?!<)[^\s"'`),;]+)/g,
  /(?:^|[\s"'`(=:,]|file:\/\/)(\/home\/(?!<|runner\/)[a-z][a-z0-9._-]*\/[^\s"'`),;]*)/g,
  /(?:^|[\s"'`(=:,])([A-Za-z]:\\{1,2}Users\\{1,2}(?!<)[A-Za-z0-9._-]+\\{1,2}[^\s"'`),;]*)/g
];
var LOCAL_HOST_PATTERNS = [
  /(?:^|[\s"'`(=:@/])([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.(?:ts\.net|home\.arpa))(?![.\w-])/gi,
  /(?:https?:\/\/|wss?:\/\/|ssh:\/\/|[\w-]+@)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.local)(?=[:/\s"'`),;]|$)/gi,
  /(?<![.\w-])([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.local)(?=:\d+\b)/gi,
  /(?<![.\w-])((?!solo-workflow\.local\b|docker-compose\.local\b)[a-z0-9]+(?:-[a-z0-9]+)+\.local|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.orb\.local)(?![.\w-])/gi
];
var REAL_TEST_FILE = /(?:^|\/)(?:tests?|__tests__|e2e)\/|^fixtures\/|\.(?:test|spec)\.[cm]?[jt]sx?$/i;
var PRIVATE_SITE_PATTERNS = [
  ...SIDECUT_PRIVATE_SITE_PATTERNS,
  /https?:\/\/lovable\.dev\/projects\/[^\s"'`),;]+/gi,
  /https?:\/\/[a-z0-9-]+-[a-z0-9]{9}-[a-z0-9-]+\.vercel\.app\b[^\s"'`),;]*/gi,
  /https?:\/\/[a-z0-9.-]+\.internal\b[^\s"'`),;]*/gi,
  /https?:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+)(?::\d+)?[^\s"'`),;]*/g
];
function effectiveRepoName(root2) {
  if (repoOwner(root2)) return repoName(root2);
  const pluginsDir = join7(root2, "plugins");
  if (existsSync7(pluginsDir)) {
    const ids = readdirSync4(pluginsDir).filter((n) => n !== ".DS_Store");
    if (ids.length === 1 && ids[0]) {
      try {
        const manifest = JSON.parse(
          readFileSync6(join7(pluginsDir, ids[0], ".claude-plugin", "plugin.json"), "utf8")
        );
        const fromManifest = /\/([\w.-]+?)(?:\.git)?$/.exec(String(manifest.repository ?? ""))?.[1];
        if (fromManifest) return fromManifest;
      } catch {
      }
    }
  }
  return repoName(root2);
}
function runnerHostnames(fleet) {
  const owner = fleet?.owners.get("runners");
  if (!fleet || !owner || owner.repo === "*") return { owner: "", names: [] };
  const text = fleet.read(owner.repo, owner.path);
  if (!text) return { owner: owner.repo, names: [] };
  try {
    const data = JSON.parse(text);
    const raw = [
      ...data.host_runners?.names ?? [],
      ...data.windows_runner?.names ?? [],
      ...data.windows_runner?.light_runners ?? [],
      ...(data.repo_runners ?? []).map((r) => r.name)
    ];
    return {
      owner: owner.repo,
      names: [...new Set(raw.filter((v) => typeof v === "string" && v.length > 0))]
    };
  } catch {
    return { owner: owner.repo, names: [] };
  }
}
function checkLeaks(root2, kind, texts, fleet, report) {
  const generated = generatedFiles(root2);
  const isPublicRepo = isPublicRepository(root2);
  const me = effectiveRepoName(root2);
  const runners = runnerHostnames(fleet);
  const checkRunnerHosts = kind !== "ops" && me !== runners.owner;
  const fleetRunnerRe = checkRunnerHosts && runners.names.length > 0 ? new RegExp(`\\b(${runners.names.map(escapeRegExp).join("|")})\\b`, "g") : null;
  for (const t of texts) {
    if (REAL_TEST_FILE.test(t.file) || isGeneratedBundleOrLock(t.file, generated)) continue;
    const profileFile = isSidecutProfileFile(t.file);
    const shippedOrPublic = isShippedOrPublic(t.file, kind, isPublicRepo);
    const meLower = me.toLowerCase();
    t.text.split("\n").forEach((line, i) => {
      for (const re of HOME_PATH_PATTERNS) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) {
          const hit = m[1] ?? m[0];
          if (kind === "ops" && /^\/home\/ci-(?:admin|runner)\//.test(hit)) continue;
          report.add(
            "LEAK_PATH",
            t.file,
            i + 1,
            `Hard-coded home-directory path "${hit}" only works on one machine.`,
            "Use a relative path, environment variable or placeholder instead."
          );
          break;
        }
      }
      const hostPatterns = [
        ...LOCAL_HOST_PATTERNS,
        ...checkRunnerHosts && !profileFile ? SIDECUT_RUNNER_HOST_PATTERNS : [],
        ...fleetRunnerRe && !profileFile ? [fleetRunnerRe] : []
      ];
      for (const re of hostPatterns) {
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) {
          report.add(
            "LEAK_HOSTNAME",
            t.file,
            i + 1,
            `Names local machine or runner hostname "${m[1] ?? m[0]}".`,
            "Remove the machine or runner hostname from committed files."
          );
          break;
        }
      }
      if (!shippedOrPublic || profileFile) return;
      SIDECUT_PRIVATE_GITHUB_LINK.lastIndex = 0;
      for (const m of line.matchAll(SIDECUT_PRIVATE_GITHUB_LINK)) {
        const repo = (m[2] ?? "").replace(/[.,;:!?]+$/, "").replace(/\.git$/i, "").replace(/[.,;:!?]+$/, "");
        const lowerRepo = repo.toLowerCase();
        if (!lowerRepo || PUBLIC_SIDECUT_REPOS.has(lowerRepo)) continue;
        if (isPublicRepo && lowerRepo === meLower) continue;
        if (!isPublicRepo && kind !== "site" && lowerRepo === meLower) continue;
        report.add(
          "LEAK_LINK",
          t.file,
          i + 1,
          `Links to private repository "${m[1]}/${repo}" in a file that ships or is public.`,
          "Link only to public repositories or move the reference to internal docs."
        );
        break;
      }
      for (const re of PRIVATE_SITE_PATTERNS) {
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) {
          report.add(
            "LEAK_LINK",
            t.file,
            i + 1,
            `Links to private or internal site "${m[0]}" in a file that ships or is public.`,
            "Use a public URL or move the link to internal docs."
          );
          break;
        }
      }
    });
  }
}
function namesOf(repo, prefix) {
  const short = prefix && repo.startsWith(prefix) ? repo.slice(prefix.length) : repo;
  const title = short.split("-").map((w) => w.length <= 2 ? w.toUpperCase() : `${w[0]?.toUpperCase()}${w.slice(1)}`).join(" ");
  const brand = current().brand;
  return [.../* @__PURE__ */ new Set([repo, title, brand ? `${brand} ${title}` : title])].filter(
    (n) => n.length > 3
  );
}
function labelsIn(value, key = "") {
  if (typeof value === "string")
    return /^(label|light_label|labels|name|names)$/.test(key) && /^[a-z][\w]*-[\w-]+$/.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((v) => labelsIn(v, key));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => labelsIn(v, k));
  return [];
}
function detectors(root2, fleet, me, report) {
  const found = [];
  const unread = [];
  const source = (fact) => {
    const owner = fleet.owners.get(fact);
    if (!owner) return null;
    const text = owner.repo === "*" ? null : fleet.read(owner.repo, owner.path);
    if (owner.repo !== "*" && text === null) unread.push(`${fact} (no ${owner.repo} checkout)`);
    return { ...owner, text };
  };
  const runners = source("runners");
  if (runners?.text && runners.repo !== me) {
    let labels = [];
    try {
      labels = [...new Set(labelsIn(JSON.parse(runners.text)))];
    } catch {
      unread.push("runners (its file is not JSON)");
    }
    const names = labels.map(escapeRegExp).join("|");
    const inList = labels.length ? new RegExp(
      `\\[[^\\]\\n]*,[^\\]\\n]*(?<![\\w.-])(${names})(?![\\w.-])[^\\[\\n]*\\](?!\\()|\\[[^\\]\\n]*(?<![\\w.-])(${names})(?![\\w.-])[^\\[\\n]*,[^\\[\\n]*\\](?!\\()`
    ) : null;
    const inCode = labels.length ? new RegExp(`\`(${names})\``) : null;
    const runsOn = labels.length ? new RegExp(`runs-on:\\s*(${names})\\b`) : null;
    found.push({
      fact: "runners",
      owner: runners.repo,
      path: runners.path,
      find: (line) => {
        const m = inList?.exec(line) ?? runsOn?.exec(line) ?? (/\brunners?\b|\blabels?\b|self-hosted|\blanes?\b/i.test(line) ? inCode?.exec(line) : null);
        return m ? `the runner label "${m[1] ?? m[2]}"` : null;
      }
    });
  }
  const ports = source("ports");
  if (ports?.text && ports.repo !== me) {
    const holder = /* @__PURE__ */ new Map();
    for (const [repo, values2] of Object.entries(readToml(ports.text)))
      for (const port of Object.values(values2))
        if (typeof port === "number") holder.set(port, repo);
    found.push({
      fact: "ports",
      owner: ports.repo,
      path: ports.path,
      find: (line) => {
        for (const m of line.matchAll(
          /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})\b|\bports? (\d{4,5})\b/gi
        )) {
          const port = Number(m[1] ?? m[2]);
          const of = holder.get(port);
          if (of && of !== me) return `port ${port}, reserved for ${of}`;
        }
        return null;
      }
    });
  }
  const versioned = /* @__PURE__ */ new Map();
  const pins = source("plugin-pins");
  if (pins?.text && pins.repo !== me) {
    try {
      for (const [plugin, entry] of Object.entries(
        JSON.parse(pins.text)
      )) {
        const repo = entry.repo?.split("/")[1] ?? plugin;
        if (repo === me) continue;
        for (const name of [plugin, repo])
          versioned.set(name, { fact: "plugin-pins", owner: pins.repo, path: pins.path });
      }
    } catch {
      unread.push("plugin-pins (its file is not JSON)");
    }
  }
  const actions = source("ci-actions");
  if (actions && actions.repo !== me && actions.repo !== "*")
    versioned.set(actions.repo, { fact: "ci-actions", owner: actions.repo, path: actions.path });
  const prefix = current().prefix;
  for (const [repo, where] of versioned) {
    const names = namesOf(repo, prefix).map(escapeRegExp).join("|");
    const re = new RegExp(`(?<![\\w-])(${names})(?:@| v| version |#v| )v?(\\d+\\.\\d+\\.\\d+)\\b`);
    found.push({
      ...where,
      find: (line) => {
        const m = re.exec(line);
        return m ? `${m[1]} ${m[2]}` : null;
      }
    });
  }
  const gate = fleet.owners.get("merge-gate");
  const settings = join7(root2, gate?.path ?? SOLO_FILE);
  if (gate?.repo === "*" && existsSync7(settings)) {
    const value = readToml(readFileSync6(settings, "utf8"))[""]?.required_checks;
    const checks = Array.isArray(value) ? value : [];
    const names = new RegExp(`\`(${checks.map(escapeRegExp).join("|")})\``, "g");
    found.push({
      fact: "merge-gate",
      owner: me,
      path: gate.path,
      find: (line) => {
        if (!checks.length || !/merge gate|required[ _]checks?/i.test(line)) return null;
        const listed = [...new Set([...line.matchAll(names)].map((m) => m[1]))];
        return listed.length >= 2 ? `the required checks ${listed.map((c) => `\`${c}\``).join(", ")}` : null;
      }
    });
  }
  if (unread.length) report.notes.push(`Owned facts not checked: ${unread.join(", ")}.`);
  return found;
}
function checkOwnedFacts(root2, markdown, fleet, report) {
  if (current().workflow !== "solo") return;
  if (!fleet) {
    report.notes.push(
      "Owned facts and the repo index not checked: the fleet's data checkout isn't beside this repo (set SIDECUT_HOME to it)."
    );
    return;
  }
  const me = repoName(root2);
  const finders = detectors(root2, fleet, me, report);
  for (const t of markdown) {
    if (isHistoryOrTest(t.file)) continue;
    t.text.split("\n").forEach((line, i) => {
      for (const d of finders) {
        if (d.owner === me && t.file === d.path) continue;
        const what = d.find(line);
        if (!what) continue;
        const where = d.owner === me ? d.path : `${d.path} in ${d.owner}`;
        report.add(
          d.fact === "ports" ? "OWNED_PORT" : "OWNED_FACT",
          t.file,
          i + 1,
          `Writes out ${what}, which ${where} owns, so this copy goes stale when it changes.`,
          `Point to ${where} instead of repeating the value.`
        );
      }
    });
  }
}

// plugins/sidecut-agentskills/server/src/check/kinds.ts
import { existsSync as existsSync8, readFileSync as readFileSync7 } from "node:fs";
import { join as join8 } from "node:path";
var KINDS = ["plugin", "app", "marketplace", "ops", "site", "data"];
function readJson(path) {
  try {
    return JSON.parse(readFileSync7(path, "utf8"));
  } catch {
    return null;
  }
}
var SITE_TOOLS = ["astro", "next", "@docusaurus/core", "vitepress", "@11ty/eleventy"];
function repoKind(root2, fleet, ships, report) {
  const rootPkg = readJson(join8(root2, "package.json"));
  const webPkg = readJson(join8(root2, "web", "package.json"));
  for (const [file, pkg2] of [
    ["package.json", rootPkg],
    ["web/package.json", webPkg]
  ]) {
    const declared = packageConfig(pkg2).kind;
    if (declared === void 0) continue;
    if (KINDS.includes(declared)) return { kind: declared, how: "declared" };
    report.add(
      "REPO_KIND",
      file,
      void 0,
      `The kind in ${file} is "${String(declared)}", which isn't a repo kind.`,
      `Use one of ${KINDS.join(", ")}.`
    );
  }
  const listed = fleet?.kinds.get(repoName(root2));
  if (listed && KINDS.includes(listed)) return { kind: listed, how: "listed" };
  if (ships) return { kind: "plugin", how: "inferred" };
  const market = readJson(join8(root2, ".claude-plugin", "marketplace.json"));
  if (existsSync8(join8(root2, "bundled")) || (market?.plugins ?? []).length > 1)
    return { kind: "marketplace", how: "inferred" };
  if (existsSync8(join8(root2, ".github", "actions"))) return { kind: "ops", how: "inferred" };
  const hasSitemap = existsSync8(join8(root2, "public", "sitemap.xml")) || existsSync8(join8(root2, "web", "public", "sitemap.xml"));
  const pkg = rootPkg ?? webPkg;
  if (!pkg) {
    if (hasSitemap || existsSync8(join8(root2, "web", "index.html")))
      return { kind: "site", how: "inferred" };
    return { kind: "data", how: "inferred" };
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (SITE_TOOLS.some((tool) => tool in deps) || hasSitemap)
    return { kind: "site", how: "inferred" };
  if (!rootPkg && webPkg && !existsSync8(join8(root2, "backend")) && !existsSync8(join8(root2, "server")) && !existsSync8(join8(root2, "api")))
    return { kind: "site", how: "inferred" };
  return { kind: "app", how: "inferred" };
}
function kindTemplate(kind) {
  const solo = current().workflow === "solo";
  return renderFile(`kinds/${kind}.md.tmpl`, { workflowBlock: solo ? `

${SOLO_BLOCK}` : "" });
}
function kindSections(kind) {
  const doc = parseMarkdown("AGENTS.md", kindTemplate(kind));
  return sections(doc).map((h) => h.text);
}
function inOrder(have, want) {
  let at = 0;
  for (const name of have) if (name === want[at]) at++;
  return at === want.length;
}
function withSoloBlock(text) {
  const start = text.indexOf(SOLO_START);
  const end = text.indexOf(SOLO_END);
  if (start >= 0 && end > start)
    return text.slice(0, start) + SOLO_BLOCK + text.slice(end + SOLO_END.length);
  return `${text.replace(/\s*$/, "")}

${SOLO_BLOCK}
`;
}
function checkShape(root2, kind, report) {
  const agents = join8(root2, "AGENTS.md");
  if (kind === "data" && !existsSync8(join8(root2, "README.md")))
    report.add(
      "SHAPE_AGENTS",
      "README.md",
      void 0,
      "A data repo has no README.md saying what the data is.",
      "Add one: what the data is, where it comes from and who reads it."
    );
  if (!existsSync8(agents)) {
    if (kind !== "data")
      report.add(
        "SHAPE_AGENTS",
        "AGENTS.md",
        void 0,
        `There is no AGENTS.md, which every ${kind} repo keeps.`,
        `Start it from templates/kinds/${kind}.md.tmpl in sidecut-agentskills.`
      );
    return;
  }
  const text = readFileSync7(agents, "utf8");
  const found = sections(parseMarkdown(agents, text)).map((h) => h.text);
  const want = kindSections(kind);
  if (!inOrder(found, want)) {
    const missing = want.filter((name) => !found.includes(name));
    report.add(
      "SHAPE_SECTIONS",
      "AGENTS.md",
      void 0,
      missing.length > 0 ? `AGENTS.md has no ${missing.map((m) => `"${m}"`).join(", ")} section.` : `AGENTS.md has the ${kind} sections out of order.`,
      `Keep ${want.map((w) => `"${w}"`).join(", ")} in that order; the repo's own sections can go between them.`
    );
  }
  if (current().workflow === "solo" && existsSync8(join8(root2, SOLO_FILE)) && !text.includes(SOLO_BLOCK))
    report.add(
      "SHAPE_SOLO",
      "AGENTS.md",
      void 0,
      text.includes(SOLO_START) ? `The ${SOLO_HEADINGS[0]} block isn't the current wording.` : `AGENTS.md has no ${SOLO_HEADINGS[0]} block.`,
      "Run `sidecut-sync --fix`, which writes the current block.",
      { what: `Wrote the current ${SOLO_HEADINGS[0]} block.`, apply: withSoloBlock }
    );
  checkClaude(root2, report);
}
function checkClaude(root2, report) {
  const path = join8(root2, "CLAUDE.md");
  const text = existsSync8(path) ? readFileSync7(path, "utf8") : null;
  if (text?.split("\n").some((line) => line.trim() === "@AGENTS.md")) return;
  report.add(
    "SHAPE_CLAUDE",
    "CLAUDE.md",
    1,
    text === null ? "There is no CLAUDE.md, so Claude Code never reads AGENTS.md." : "CLAUDE.md doesn't import AGENTS.md, so the two can drift.",
    "Put an `@AGENTS.md` line at the top; `sidecut-sync --fix` adds it.",
    {
      what: "Imported AGENTS.md at the top of CLAUDE.md.",
      apply: (have) => have.trim() === "" ? "@AGENTS.md\n" : `@AGENTS.md

${have}`
    }
  );
}

// plugins/sidecut-agentskills/server/src/check/plugin.ts
import { existsSync as existsSync11, readdirSync as readdirSync6, readFileSync as readFileSync11, statSync as statSync5 } from "node:fs";
import { join as join11, relative as relative8 } from "node:path";

// plugins/sidecut-agentskills/server/src/check/scan-text.ts
import { readFileSync as readFileSync8 } from "node:fs";
import { relative as relative5 } from "node:path";
var SCAN_PATTERNS = [
  {
    what: "a download-and-run install",
    re: /\b(?:curl|wget)\b[^\n]*\|\s*(?:ba)?sh\b|\bcurl\s+-fsSL\b|\binstall\.sh\b/gi
  },
  {
    what: "an unpinned package launcher",
    re: /\b(?:npx|bunx|uvx)\s+((?:-{1,2}[\w-]+\s+)*)([^\s`'"),]+)/gi,
    // A pinned version, a local path, or a flag that only runs what's already installed.
    pinned: (m) => /@\d/.test(m[2] ?? "") || /^[./]/.test(m[2] ?? "") || /(?:^|\s)--?(?:no-install|no|offline)\b/.test(m[1] ?? "")
  },
  { what: "a CI secret", re: /\bsecrets\.[A-Za-z_]/gi },
  {
    what: "a token name",
    re: /\b(?:GITHUB_TOKEN|GH_TOKEN|NPM_TOKEN|[A-Z0-9_]*API_KEY)\b|\bgh auth\b/gi
  },
  { what: "an SSH key folder", re: /~\/\.ssh\b|\.ssh\//gi },
  { what: "the keychain", re: /\bkeychain\b/gi },
  { what: "self-hosted runners", re: /\bself-hosted\b/gi }
];
var BINARY = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|zip|gz|wasm)$/i;
function scannedFile(path) {
  if (BINARY.test(path)) return false;
  if (path === "server/index.mjs" || path.startsWith("server/src/")) return false;
  return !path.endsWith("THIRD_PARTY_LICENSES.txt");
}
function globMatch(glob, path) {
  const re = glob.split("**").map(
    (part) => part.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")
  ).join(".*");
  return new RegExp(`^${re}$`).test(path);
}
function scanText(text) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const p of SCAN_PATTERNS) {
      p.re.lastIndex = 0;
      for (const m of line.matchAll(p.re)) {
        if (p.pinned?.(m)) continue;
        hits.push({ line: i + 1, what: p.what });
      }
    }
  });
  return hits;
}
function checkScanText(pluginDir, root2, report) {
  const allow = readScanTextAllow(root2);
  for (const path of listFiles(pluginDir)) {
    const inPlugin = relativePosix(pluginDir, path);
    if (!scannedFile(inPlugin) || allow.some((g) => globMatch(g, inPlugin))) continue;
    let text;
    try {
      text = readFileSync8(path, "utf8");
    } catch {
      continue;
    }
    const hits = scanText(text);
    const first = hits[0];
    if (!first) continue;
    const kinds = [...new Set(hits.map((h) => h.what))].join(", ");
    report.add(
      "SCAN_TEXT",
      relative5(root2, path),
      first.line,
      `${hits.length} ${hits.length === 1 ? "line names" : "places name"} ${kinds}. Claude's plugin scan may mark a plugin Caution when its shipped text names credentials, CI secrets, self-hosted runners or download-and-run installs.`,
      `Keep that text out of shipped files, or list the file under \`scanTextAllow\` in .agentskills.json and say plainly in the README what the plugin does with it.`
    );
  }
}

// plugins/sidecut-agentskills/server/src/check/server.ts
import { spawnSync as spawnSync3 } from "node:child_process";
import { existsSync as existsSync9, mkdtempSync, readFileSync as readFileSync9, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join as join9, relative as relative6 } from "node:path";
function requireName(root2) {
  const script = join9(root2, "scripts", "build-server.ts");
  const named = existsSync9(script) ? /createRequire as (__[A-Za-z]+Require)\b/.exec(readFileSync9(script, "utf8"))?.[1] : void 0;
  return named ?? `__${namespaceOf(current())}Require`;
}
var ESBUILD = /"esbuild": "([^"]+)"/.exec(
  readFileSync9(join9(templatesRoot, "repo", "package.json.tmpl"), "utf8")
)?.[1] ?? "";
var HINTS = ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"];
var PASSED_ENV = ["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "SystemRoot", "USERPROFILE"];
function serverEnv(env = process.env) {
  return Object.fromEntries(
    PASSED_ENV.flatMap((key) => env[key] === void 0 ? [] : [[key, env[key]]])
  );
}
function listTools(bundle) {
  const messages = [
    {
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "sidecut-check", version: "1" }
      }
    },
    { method: "notifications/initialized" },
    { id: 2, method: "tools/list" }
  ];
  const result = spawnSync3("node", [bundle], {
    input: `${messages.map((m) => JSON.stringify({ jsonrpc: "2.0", ...m })).join("\n")}
`,
    encoding: "utf8",
    timeout: 1e4,
    cwd: tmpdir(),
    env: serverEnv()
  });
  const replies = result.stdout.split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  const init = replies.find((r) => r.id === 1)?.result;
  const list = replies.find((r) => r.id === 2)?.result;
  if (!init || !list) return null;
  return {
    instructions: init.instructions,
    tools: list.tools ?? []
  };
}
function checkServer(pluginDir, root2, report) {
  const source = join9(pluginDir, "server", "src", "index.ts");
  const bundle = join9(pluginDir, "server", "index.mjs");
  const where = relative6(root2, join9(pluginDir, "server"));
  if (!existsSync9(source) || !existsSync9(bundle)) {
    report.add(
      "SERVER_FILES",
      where,
      void 0,
      "Local server needs server/src/index.ts and server/index.mjs.",
      "Add the source and run `npm run build`."
    );
    return null;
  }
  for (const file of listFiles(join9(pluginDir, "server", "src"))) {
    if (/process\.cwd\(\)/.test(readFileSync9(file, "utf8"))) {
      report.add(
        "SERVER_CWD",
        relative6(root2, file),
        void 0,
        "Server code uses the working directory.",
        "Resolve paths from `import.meta.url`; in Claude Code the working directory is the user project."
      );
    }
  }
  const out = mkdtempSync(join9(tmpdir(), "sidecut-check-"));
  try {
    const built = join9(out, "index.mjs");
    let inputs;
    let failure;
    let build;
    try {
      build = createRequire(join9(root2, "package.json"))("esbuild").buildSync;
    } catch {
      report.add(
        "SERVER_BUILD",
        where,
        void 0,
        "The server can't be checked: sidecut-check builds it with esbuild from this repo's devDependencies, and esbuild isn't installed. Bun's bundler can't stand in, because the check compares the bytes of the two builds.",
        `Add esbuild ${ESBUILD} to devDependencies, install, and build server/index.mjs with it using the options in the template's scripts/build-server.ts.`
      );
      return null;
    }
    try {
      const result = build({
        absWorkingDir: root2,
        entryPoints: [relative6(root2, source)],
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        preserveSymlinks: true,
        outfile: built,
        metafile: true,
        logLevel: "silent",
        banner: {
          js: `import { createRequire as ${requireName(root2)} } from 'node:module'; const require = ${requireName(root2)}(import.meta.url);`
        }
      });
      inputs = Object.keys(result.metafile.inputs);
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (failure !== void 0) {
      report.add(
        "SERVER_BUILD",
        where,
        void 0,
        `The server doesn't build: ${failure.split("\n")[0]}`,
        "Run `npm install`, then fix the build error."
      );
    } else if (!readFileSync9(built).equals(readFileSync9(bundle))) {
      report.add(
        "SERVER_BUNDLE_STALE",
        relative6(root2, bundle),
        void 0,
        "The committed bundle doesn't match the source.",
        "Run `npm run build` and commit server/index.mjs."
      );
    }
    if (inputs) {
      const packages = [
        ...new Set(
          // The last node_modules folder in a path, so nested and isolated-store copies count as themselves.
          inputs.flatMap(
            (p) => [...p.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g)].at(-1)?.[1] ?? []
          )
        )
      ];
      const notices = join9(pluginDir, "server", "THIRD_PARTY_LICENSES.txt");
      const text = existsSync9(notices) ? readFileSync9(notices, "utf8") : "";
      const missing = packages.filter((pkg) => !text.split("\n").includes(pkg));
      if (missing.length > 0) {
        report.add(
          "SERVER_LICENSES",
          relative6(root2, notices),
          void 0,
          `The bundle inlines ${missing.join(", ")} without its licence notice.`,
          "Run `npm run build`, which writes server/THIRD_PARTY_LICENSES.txt."
        );
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  const listing = listTools(bundle);
  if (!listing) {
    report.add(
      "SERVER_START",
      relative6(root2, bundle),
      void 0,
      "The server didn't answer initialize and tools/list.",
      "Run `node server/index.mjs` and fix the startup error."
    );
    return null;
  }
  const count = sentences(listing.instructions ?? "").length;
  if (count < 3 || count > 6) {
    report.add(
      "SERVER_INSTRUCTIONS",
      where,
      void 0,
      `Server instructions have ${count} sentences.`,
      "Write 3 to 6 sentences: what it covers, where to start, what tool output is."
    );
  }
  for (const tool of listing.tools) {
    const label = `${where} tool ${tool.name}`;
    if (!/^[a-z]+(_[a-z]+)+$/.test(tool.name)) {
      report.add(
        "NAME_TOOL",
        label,
        void 0,
        `Tool name "${tool.name}" is not verb_object snake_case.`,
        "Rename it, for example `get_status`."
      );
    }
    if (!tool.title)
      report.add("TOOL_TITLE", label, void 0, "Tool has no title.", "Add a `title`.");
    const missing = HINTS.filter((h) => typeof tool.annotations?.[h] !== "boolean");
    if (missing.length > 0) {
      report.add(
        "TOOL_ANNOTATIONS",
        label,
        void 0,
        `Tool doesn't set ${missing.join(", ")}.`,
        "Set all four hints explicitly."
      );
    }
    const description = tool.description ?? "";
    if (sentences(description).length > 2 || /^Use this tool/i.test(description) || description === "") {
      report.add(
        "TOOL_DESCRIPTION",
        label,
        void 0,
        "Tool description is not 1 or 2 sentences of what it returns and when to use it.",
        "Rewrite it: what it returns, then when to use it."
      );
    }
  }
  return new Map(listing.tools.map((t) => [t.name, t.annotations?.readOnlyHint === true]));
}

// plugins/sidecut-agentskills/server/src/check/skills.ts
import { existsSync as existsSync10, readdirSync as readdirSync5, readFileSync as readFileSync10, statSync as statSync4 } from "node:fs";
import { join as join10, relative as relative7 } from "node:path";
var FRONTMATTER_ORDER = [
  "name",
  "description",
  "argument-hint",
  "allowed-tools",
  "user-invocable",
  "disable-model-invocation",
  "paths",
  "model",
  "effort",
  "context",
  "agent"
];
var EFFORTS = ["low", "medium", "high", "xhigh", "max"];
var SUPPORT_FOLDERS = {
  references: /^[a-z0-9]+(-[a-z0-9]+)*\.md$/,
  examples: /^[a-z0-9]+(-[a-z0-9]+)*\.md$/,
  scripts: /^[a-z]+(-[a-z]+)+\.mjs$/
};
var TOOL_NAME = /^(get|list|add|check|scaffold|create|update|delete|remove|set|run|publish|call|search|fetch|read|write|send|start|stop)(_[a-z]+)+$/;
var DESCRIPTION_SHAPE = /^[A-Z][a-z]+s [^.]*(\.[^ ][^.]*)*\. Use when .+\.$/;
function parseFrontmatter(lines) {
  const keys2 = [];
  const values2 = /* @__PURE__ */ new Map();
  const lineOf = /* @__PURE__ */ new Map();
  lines.forEach((line, i) => {
    const match = /^([a-z-]+):(?: (.*))?$/.exec(line);
    if (!match) return;
    const key = match[1] ?? "";
    keys2.push(key);
    values2.set(key, match[2] ?? "");
    lineOf.set(key, i + 2);
  });
  return { keys: keys2, values: values2, lines: lineOf };
}
function checkFrontmatter(name, lines, file, report, tools, plugin) {
  if (!lines) {
    report.add(
      "SKILL_FRONTMATTER",
      file,
      1,
      "SKILL.md has no frontmatter.",
      "Start with `---`, `name` and `description`."
    );
    return null;
  }
  const fm = parseFrontmatter(lines);
  const unknown = fm.keys.filter((k) => !FRONTMATTER_ORDER.includes(k));
  for (const key of unknown) {
    report.add(
      "SKILL_FIELD_UNKNOWN",
      file,
      fm.lines.get(key),
      `Field "${key}" isn't used.`,
      `Use only: ${FRONTMATTER_ORDER.join(", ")}.`
    );
  }
  const known = fm.keys.filter((k) => FRONTMATTER_ORDER.includes(k));
  const sorted = [...known].sort(
    (a, b) => FRONTMATTER_ORDER.indexOf(a) - FRONTMATTER_ORDER.indexOf(b)
  );
  if (known.join() !== sorted.join()) {
    report.add(
      "SKILL_FIELD_ORDER",
      file,
      2,
      "Frontmatter fields are out of order.",
      `Order them: ${sorted.join(", ")}.`
    );
  }
  if (fm.values.get("name") !== name) {
    report.add(
      "SKILL_NAME_FIELD",
      file,
      fm.lines.get("name"),
      "`name` differs from the folder name.",
      `Set \`name: ${name}\`.`
    );
  }
  const raw = fm.values.get("description") ?? "";
  const quoted = /^"([^"]*)"$/.exec(raw);
  if (!quoted) {
    report.add(
      "SKILL_DESCRIPTION_QUOTES",
      file,
      fm.lines.get("description"),
      "Description is not one double-quoted line.",
      'Write `description: "..."` on one line.'
    );
    return null;
  }
  const description = quoted[1] ?? "";
  if (description.length > 400) {
    report.add(
      "SKILL_DESCRIPTION_LENGTH",
      file,
      fm.lines.get("description"),
      `Description is ${description.length} characters.`,
      "Keep it to 400 or fewer."
    );
  }
  if (!DESCRIPTION_SHAPE.test(description)) {
    report.add(
      "SKILL_DESCRIPTION_SHAPE",
      file,
      fm.lines.get("description"),
      "Description needs a capability and concrete trigger.",
      "Describe what the skill does, then when to use it. Add an exclusion only if useful."
    );
  }
  if (fm.keys.includes("allowed-tools")) {
    const start = (fm.lines.get("allowed-tools") ?? 0) - 1;
    const own = `mcp__plugin_${plugin}_${skillPrefixOf(plugin)}__`;
    for (let i = start; /^ {2}- /.test(lines[i] ?? ""); i++) {
      const entry = (lines[i] ?? "").slice(4).trim();
      if (!entry.startsWith("mcp__")) continue;
      const tool = entry.startsWith(own) ? entry.slice(own.length) : null;
      if (!tool || tools && !tools.has(tool)) {
        report.add(
          "SKILL_ALLOWED_MCP",
          file,
          i + 2,
          `\`${entry}\` isn't one of this plugin's MCP tools.`,
          `Name a tool the server has, as \`${own}<tool>\`.`
        );
      }
    }
    if (fm.values.get("allowed-tools") !== "" || !/^ {2}- \S/.test(lines[start] ?? "")) {
      report.add(
        "SKILL_ALLOWED_TOOLS",
        file,
        start + 1,
        "`allowed-tools` is not a YAML list.",
        "List each tool on its own `  - ` line."
      );
    }
  }
  if (fm.keys.includes("user-invocable") && fm.values.get("user-invocable") !== "false") {
    report.add(
      "SKILL_DEFAULT_FIELD",
      file,
      fm.lines.get("user-invocable"),
      "`user-invocable` repeats its default.",
      "Remove it, or set it to `false`."
    );
  }
  if (fm.keys.includes("disable-model-invocation") && fm.values.get("disable-model-invocation") !== "true") {
    report.add(
      "SKILL_DEFAULT_FIELD",
      file,
      fm.lines.get("disable-model-invocation"),
      "`disable-model-invocation` repeats its default.",
      "Remove it, or set it to `true`."
    );
  }
  const effort = fm.values.get("effort");
  if (effort !== void 0 && !EFFORTS.includes(effort)) {
    report.add(
      "SKILL_EFFORT",
      file,
      fm.lines.get("effort"),
      `\`effort: ${effort}\` isn't a level.`,
      `Use one of ${EFFORTS.join(", ")}.`
    );
  }
  const context = fm.values.get("context");
  const forked = context === "fork" && Boolean(fm.values.get("agent"));
  if ((context !== void 0 || fm.keys.includes("agent")) && !forked) {
    report.add(
      "SKILL_FORK",
      file,
      fm.lines.get("context") ?? fm.lines.get("agent"),
      "`context` and `agent` are not set together.",
      "Use `context: fork` with `agent: <subagent>`, or neither."
    );
  }
  return {
    name,
    description,
    firstSentence: sentences(description)[0] ?? "",
    manualOnly: fm.values.get("disable-model-invocation") === "true"
  };
}
function supportFiles(dir) {
  return Object.keys(SUPPORT_FOLDERS).flatMap(
    (folder) => existsSync10(join10(dir, folder)) ? readdirSync5(join10(dir, folder)).filter((f) => statSync4(join10(dir, folder, f)).isFile()).map((f) => `${folder}/${f}`) : []
  );
}
function checkLayout(dir, root2, report) {
  for (const path of listFiles(dir)) {
    const rel = relativePosix(dir, path);
    const file = relative7(root2, path);
    if (rel === "SKILL.md" || rel === "agents/openai.yaml") continue;
    const [folder, name, ...rest] = rel.split("/");
    const pattern = SUPPORT_FOLDERS[folder ?? ""];
    if (!pattern || rest.length > 0 || !pattern.test(name ?? "")) {
      report.add(
        "SKILL_FILE_UNEXPECTED",
        file,
        void 0,
        "File is not part of the skill layout.",
        "Keep only SKILL.md, agents/openai.yaml, references/, examples/ and scripts/ files, one level deep."
      );
    }
  }
  if (!existsSync10(join10(dir, "agents", "openai.yaml"))) {
    report.add(
      "SKILL_OPENAI_YAML",
      relative7(root2, dir),
      void 0,
      "Skill has no agents/openai.yaml.",
      "Add it with display_name, short_description and default_prompt."
    );
  }
}
function openAiYamlOf(info, title, brandColor) {
  return [
    "interface:",
    `  display_name: "${title}"`,
    `  short_description: "${info.firstSentence}"`,
    // Codex accepts a path out of the skill only into the plugin's own assets/.
    '  icon_small: "../../assets/icon.png"',
    '  icon_large: "../../assets/icon.png"',
    `  brand_color: "${brandColor}"`,
    `  default_prompt: "Use $${info.name} to ${defaultPromptOf(info.firstSentence)}"`,
    ...info.manualOnly ? ["policy:", "  allow_implicit_invocation: false"] : [],
    ""
  ].join("\n");
}
function checkOpenAiYaml(dir, info, title, brandColor, root2, report) {
  const path = join10(dir, "agents", "openai.yaml");
  if (!existsSync10(path)) return;
  const expected = openAiYamlOf(info, title, brandColor);
  if (readFileSync10(path, "utf8") !== expected) {
    report.add(
      "SKILL_OPENAI_YAML",
      relative7(root2, path),
      1,
      "openai.yaml doesn't match the skill.",
      `Make it exactly:
${expected}`
    );
  }
}
function checkSections(dir, name, root2, report, tools, skills, plugin) {
  const path = join10(dir, "SKILL.md");
  const file = relative7(root2, path);
  const text = readFileSync10(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root2, report, { skipH1Case: true });
  if (doc.lines.length > 200) {
    report.add(
      "SKILL_LENGTH",
      file,
      201,
      `SKILL.md has ${doc.lines.length} lines.`,
      "Move detail into references/ to stay at 200 or fewer."
    );
  }
  const prefix = skillPrefixOf(plugin);
  const title = skillTitleOf(name, prefix);
  const h1 = doc.headings.find((h) => h.level === 1);
  if (h1 && h1.text !== title) {
    report.add("SKILL_TITLE", file, h1.line, `H1 is "${h1.text}".`, `Make it "# ${title}".`);
  }
  const support = supportFiles(dir);
  for (const f of support) {
    if (!text.includes(f)) {
      report.add(
        "SKILL_REFERENCES",
        file,
        void 0,
        f + " is not referenced from SKILL.md.",
        "Reference the supporting file where it helps."
      );
    }
  }
  const own = `mcp__plugin_${plugin}_${skillPrefixOf(plugin)}__`;
  const allowed = new Set(
    [...text.matchAll(/^ {2}- (mcp__\S+)\s*$/gm)].map((m) => m[1] ?? "").filter(Boolean)
  );
  const unlisted = /* @__PURE__ */ new Map();
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    const words = stepWords(line);
    if (words > LONG_STEP_WORDS) {
      report.add(
        "SKILL_LONG_STEP",
        file,
        i + 1,
        `A step or paragraph runs to ${words} words.`,
        "Split it into short steps under a heading that names the work, or move the detail into references/."
      );
    }
    if (/\]\(\.\.\//.test(prose(line))) {
      report.add(
        "SKILL_LINK_OUTSIDE",
        file,
        i + 1,
        "Link leaves the skill folder.",
        "Name the other skill in backticks instead of linking its files."
      );
    }
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const token = match[1] ?? "";
      const pointer = /^([a-z0-9-]+):([a-z0-9-]+)$/.exec(token);
      if (pointer && pointer[1] === plugin && !skills.has(pointer[2] ?? "")) {
        report.add(
          "SKILL_POINTER",
          file,
          i + 1,
          `\`${token}\` isn't a skill or subagent in this plugin.`,
          "Point at a skill or subagent that exists."
        );
      }
      if (tools?.get(token) === true && !allowed.has(own + token) && !unlisted.has(token)) {
        unlisted.set(token, i + 1);
      }
      if (TOOL_NAME.test(token) && tools && !tools.has(token)) {
        report.add(
          "SKILL_TOOL",
          file,
          i + 1,
          `\`${token}\` isn't a tool on this plugin's MCP server.`,
          "Name a tool the server has."
        );
      }
    }
  });
  for (const [tool, line] of unlisted) {
    report.add(
      "SKILL_ALLOWED_MCP_MISSING",
      file,
      line,
      `The skill names \`${tool}\`, a read-only tool of this plugin's server, but \`allowed-tools\` doesn't list it.`,
      `Add \`${own}${tool}\` to \`allowed-tools\`.`
    );
  }
  for (const f of support) {
    const p = join10(dir, f);
    if (f.endsWith(".md")) checkSupportDoc(p, root2, report);
    else checkScript(p, root2, report);
  }
}
function checkSupportDoc(path, root2, report) {
  const file = relative7(root2, path);
  const text = readFileSync10(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root2, report);
  if (doc.frontmatter)
    report.add(
      "REF_FRONTMATTER",
      file,
      1,
      "Reference file has frontmatter.",
      "Remove it; references are not skills."
    );
  if (doc.lines.length > 300) {
    report.add(
      "REF_LENGTH",
      file,
      301,
      `File has ${doc.lines.length} lines.`,
      "Split it to stay at 300 or fewer."
    );
  }
}
function checkScript(path, root2, report) {
  const file = relative7(root2, path);
  const text = readFileSync10(path, "utf8");
  for (const match of text.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
    if (!(match[1] ?? "").startsWith("node:")) {
      report.add(
        "SCRIPT_IMPORT",
        file,
        void 0,
        `Imports "${match[1]}".`,
        "Use only built-in `node:` modules."
      );
    }
  }
  if (!text.includes("--help"))
    report.add(
      "SCRIPT_HELP",
      file,
      void 0,
      "Script has no `--help`.",
      "Handle `--help` with a usage line."
    );
  if (/\bfetch\(|node:https?|node:net/.test(text)) {
    report.add(
      "SCRIPT_NETWORK",
      file,
      void 0,
      "Script uses the network.",
      "Skill scripts work offline."
    );
  }
}
function checkSkills(pluginDir, root2, report, tools, plugin, brandColor) {
  const skillsDir = join10(pluginDir, "skills");
  if (!existsSync10(skillsDir)) {
    report.add(
      "PLUGIN_NO_SKILLS",
      relative7(root2, pluginDir),
      void 0,
      "Plugin has no skills folder.",
      "Add at least one skill."
    );
    return [];
  }
  const names = readdirSync5(skillsDir).filter((n) => statSync4(join10(skillsDir, n)).isDirectory()).sort();
  const skills = new Set(names);
  const agentsDir = join10(pluginDir, "agents");
  const targets = new Set(names);
  if (existsSync10(agentsDir)) {
    for (const f of readdirSync5(agentsDir)) if (f.endsWith(".md")) targets.add(f.slice(0, -3));
  }
  const prefix = skillPrefixOf(plugin);
  const infos = [];
  for (const name of names) {
    const dir = join10(skillsDir, name);
    const file = relative7(root2, join10(dir, "SKILL.md"));
    if (!isSkillName(name, prefix)) {
      report.add(
        "NAME_SKILL",
        relative7(root2, dir),
        void 0,
        `Skill "${name}" is not ${prefix}- then a 2 or 3 word verb-object name.`,
        `Rename it, for example \`${prefix}-write-skill\`, or \`${prefix}\` for the router.`
      );
    }
    if (!existsSync10(join10(dir, "SKILL.md"))) {
      report.add(
        "SKILL_MISSING",
        file,
        void 0,
        "Skill folder has no SKILL.md.",
        "Add SKILL.md or remove the folder."
      );
      continue;
    }
    checkLayout(dir, root2, report);
    const doc = parseMarkdown(join10(dir, "SKILL.md"), readFileSync10(join10(dir, "SKILL.md"), "utf8"));
    const info = checkFrontmatter(name, doc.frontmatter, file, report, tools, plugin);
    checkSections(dir, name, root2, report, tools, targets, plugin);
    if (info) {
      checkOpenAiYaml(dir, info, skillTitleOf(name, prefix), brandColor, root2, report);
      infos.push(info);
    }
  }
  const hasRouter = skills.has(prefix);
  const needsRouter = names.filter((n) => n !== prefix).length >= 4;
  if (hasRouter !== needsRouter) {
    report.add(
      "SKILL_ROUTER",
      relative7(root2, skillsDir),
      void 0,
      needsRouter ? `Plugin has 4 or more skills but no \`${prefix}\` router.` : `Plugin has a \`${prefix}\` router but fewer than 4 other skills.`,
      needsRouter ? `Add \`skills/${prefix}\`.` : `Remove \`skills/${prefix}\`.`
    );
  }
  checkRepeatedText(skillsDir, names, root2, report);
  return infos;
}
var LONG_STEP_WORDS = 120;
var REPEATED_LINE_WORDS = 12;
function stepWords(line) {
  if (/^\s*$|^#{1,6} |^\|/.test(line)) return 0;
  return prose(line).replace(/^\s*(- |\d+\. )/, "").split(/\s+/).filter(Boolean).length;
}
function checkRepeatedText(skillsDir, names, root2, report) {
  const firstSeen = /* @__PURE__ */ new Map();
  for (const name of names) {
    const path = join10(skillsDir, name, "SKILL.md");
    if (!existsSync10(path)) continue;
    const doc = parseMarkdown(path, readFileSync10(path, "utf8"));
    const seenHere = /* @__PURE__ */ new Set();
    doc.lines.forEach((line, i) => {
      if (doc.inCode[i] || stepWords(line) < REPEATED_LINE_WORDS) return;
      if (/plugin root|CLAUDE_PLUGIN_ROOT|server\/data\//.test(line)) return;
      const key = line.replace(/^\s*(- |\d+\. )/, "").trim();
      if (seenHere.has(key)) return;
      seenHere.add(key);
      const other = firstSeen.get(key);
      if (other === void 0) {
        firstSeen.set(key, name);
        return;
      }
      report.add(
        "SKILL_REPEATED_TEXT",
        relative7(root2, path),
        i + 1,
        `This line is also in \`${other}\`.`,
        "Say it once: in a file under server/data/ that both skills point to, or in the skill that owns it."
      );
    });
  }
}

// plugins/sidecut-agentskills/server/src/check/plugin.ts
var PLUGIN_ENTRIES = /* @__PURE__ */ new Set([
  ".antigravity-plugin",
  ".claude-plugin",
  ".codex-plugin",
  ".app.json",
  ".mcp.json",
  "mcp.json",
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "assets",
  "agents",
  "codex",
  "hooks",
  "hooks.json",
  "mcp_config.json",
  "server",
  "skills"
]);
var SHARED_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords"
];
var INTERFACE_FIELDS = [
  "displayName",
  "shortDescription",
  "longDescription",
  "developerName",
  "category",
  "capabilities",
  "websiteURL",
  "defaultPrompt",
  "brandColor",
  "composerIcon",
  "logo"
];
var SEMVER = /^\d+\.\d+\.\d+$/;
var README_SECTIONS = [
  "What it does",
  "Install",
  "Use",
  "Settings",
  "Privacy",
  "Develop",
  "License"
];
var CHANGELOG_SECTIONS = ["Added", "Changed", "Fixed", "Removed"];
function readJson2(path, root2, report) {
  try {
    return JSON.parse(readFileSync11(path, "utf8"));
  } catch {
    report.add(
      "JSON_INVALID",
      relative8(root2, path),
      void 0,
      "File is not valid JSON.",
      "Fix the JSON."
    );
    return null;
  }
}
function checkKeys(obj, expected, file, report, code) {
  const keys2 = Object.keys(obj);
  if (keys2.join() !== expected.join()) {
    report.add(
      code,
      file,
      void 0,
      `Fields are ${keys2.join(", ")}.`,
      `Use exactly, in order: ${expected.join(", ")}.`
    );
  }
}
function emptyDirs(dir) {
  const entries = readdirSync6(dir);
  const found = entries.length === 0 ? [dir] : [];
  for (const name of entries) {
    const path = join11(dir, name);
    if (statSync5(path).isDirectory()) found.push(...emptyDirs(path));
  }
  return found;
}
function pngSize(path) {
  const bytes = readFileSync11(path);
  if (bytes.length < 24 || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
function checkAntigravity(pluginDir, root2, report) {
  const want = antigravityFiles(pluginDir);
  if (!want) return;
  const sync = "Run `npm exec --no -- sidecut-sync`, which writes it from the Claude Code and Codex files.";
  for (const { path, text } of want) {
    const full = join11(pluginDir, path);
    const file = relative8(root2, full);
    const have = existsSync11(full) ? readFileSync11(full, "utf8") : null;
    if (text === null) {
      if (have !== null)
        report.add(
          "ANTIGRAVITY_UNEXPECTED",
          file,
          void 0,
          `${path} has nothing to describe: the plugin has no ${path === "mcp_config.json" ? ".mcp.json" : "hook Antigravity runs"}.`,
          "Delete it."
        );
      continue;
    }
    if (have === null) {
      report.add("ANTIGRAVITY_MISSING", file, void 0, `${path} is missing.`, sync);
      continue;
    }
    let same = false;
    try {
      same = sameJson(JSON.parse(have), JSON.parse(text));
    } catch {
    }
    if (!same)
      report.add(
        "ANTIGRAVITY_SYNC",
        file,
        void 0,
        `${path} doesn't match the plugin's Claude Code and Codex files.`,
        sync
      );
  }
}
function checkLayout2(pluginDir, root2, report) {
  for (const name of readdirSync6(pluginDir)) {
    if (name === ".DS_Store") continue;
    if (!PLUGIN_ENTRIES.has(name)) {
      const hint = name === "plugin.json" ? "Codex reads .codex-plugin/plugin.json; a root plugin.json stops it loading hooks." : name === "commands" ? "Turn commands into skills." : name === "evals" ? "Move evaluation cases to the repository root, outside the installed plugin." : "Move or remove it.";
      report.add(
        "PLUGIN_ENTRY_UNEXPECTED",
        relative8(root2, join11(pluginDir, name)),
        void 0,
        `"${name}" isn't part of the plugin layout.`,
        hint
      );
    }
  }
  for (const dir of emptyDirs(pluginDir)) {
    report.add(
      "PLUGIN_EMPTY_FOLDER",
      relative8(root2, dir),
      void 0,
      "Empty folder.",
      "Remove it."
    );
  }
  const assets = join11(pluginDir, "assets");
  const icon = join11(assets, "icon.png");
  if (existsSync11(assets)) {
    for (const name of readdirSync6(assets)) {
      if (name !== "icon.png")
        report.add(
          "PLUGIN_ASSET",
          relative8(root2, join11(assets, name)),
          void 0,
          "Only assets/icon.png is allowed.",
          "Remove it."
        );
    }
  }
  const size = existsSync11(icon) ? pngSize(icon) : null;
  if (size?.[0] !== 512 || size[1] !== 512) {
    report.add(
      "PLUGIN_ICON",
      relative8(root2, icon),
      void 0,
      "assets/icon.png is missing or not a 512 by 512 PNG.",
      "Add a 512 by 512 PNG."
    );
  }
  if (existsSync11(join11(pluginDir, "agents"))) {
    for (const name of readdirSync6(join11(pluginDir, "agents"))) {
      if (!/^[a-z]+\.md$/.test(name)) {
        report.add(
          "NAME_AGENT",
          relative8(root2, join11(pluginDir, "agents", name)),
          void 0,
          "Subagent file is not a one-word role noun.",
          "Rename it, for example `reviewer.md`."
        );
      }
      const prefix = skillPrefixOf(relative8(join11(pluginDir, ".."), pluginDir));
      const profile = join11(
        pluginDir,
        "codex",
        "agents",
        `${prefix}-${name.replace(/\.md$/, "")}.toml`
      );
      if (!existsSync11(profile)) {
        report.add(
          "AGENT_CODEX_PROFILE",
          relative8(root2, profile),
          void 0,
          "The subagent has no Codex profile.",
          "Run `npm run build`, which writes codex/agents/ from agents/."
        );
      }
    }
  }
}
function checkManifests(pluginDir, id2, repoName2, root2, report) {
  const claudePath = join11(pluginDir, ".claude-plugin", "plugin.json");
  const portablePath = join11(pluginDir, ".codex-plugin", "plugin.json");
  for (const path of [claudePath, portablePath]) {
    if (!existsSync11(path))
      report.add(
        "MANIFEST_MISSING",
        relative8(root2, path),
        void 0,
        "Manifest is missing.",
        "Add it from the template."
      );
  }
  if (!existsSync11(claudePath) || !existsSync11(portablePath)) return null;
  const claude = readJson2(claudePath, root2, report);
  const portable = readJson2(portablePath, root2, report);
  if (!claude || !portable) return null;
  const claudeFile = relative8(root2, claudePath);
  const portableFile = relative8(root2, portablePath);
  checkKeys(claude, SHARED_FIELDS, claudeFile, report, "MANIFEST_FIELDS");
  const paths = { skills: "./skills/" };
  if (existsSync11(join11(pluginDir, "mcp.json"))) paths.mcpServers = "./mcp.json";
  if (existsSync11(join11(pluginDir, ".app.json"))) paths.apps = "./.app.json";
  if (existsSync11(join11(pluginDir, "hooks", "codex-hooks.json")))
    paths.hooks = "./hooks/codex-hooks.json";
  checkKeys(
    portable,
    [...SHARED_FIELDS, ...Object.keys(paths), "interface"],
    portableFile,
    report,
    "MANIFEST_FIELDS"
  );
  for (const [field, value] of Object.entries(paths)) {
    if (portable[field] !== value)
      report.add(
        "MANIFEST_CODEX_PATH",
        portableFile,
        void 0,
        `"${field}" is not "${value}".`,
        "Set it."
      );
  }
  for (const field of SHARED_FIELDS) {
    if (!sameJson(claude[field], portable[field])) {
      report.add(
        "MANIFEST_SYNC",
        portableFile,
        void 0,
        `"${field}" differs from .claude-plugin/plugin.json.`,
        "Make the shared fields identical."
      );
    }
  }
  const s = current();
  if (claude.name !== id2 || !pluginIdPattern().test(id2)) {
    report.add(
      "MANIFEST_NAME",
      claudeFile,
      void 0,
      `Name must be the folder name "${id2}" in the form ${s.prefix}<name>.`,
      "Rename the plugin or its folder."
    );
  }
  if (typeof claude.version !== "string" || !SEMVER.test(claude.version)) {
    report.add("MANIFEST_VERSION", claudeFile, void 0, "Version is not x.y.z.", "Use SemVer.");
  }
  const description = String(claude.description ?? "");
  if (description.length > 120 || !description.endsWith(".") || sentences(description).length !== 1) {
    report.add(
      "MANIFEST_DESCRIPTION",
      claudeFile,
      void 0,
      "Description is not one sentence of at most 120 characters.",
      "Shorten it to one sentence ending with a full stop."
    );
  }
  const author = { name: s.authorName, url: s.authorUrl };
  const authorOk = s.authorName ? sameJson(claude.author, author) : isRecord2(claude.author) && typeof claude.author.name === "string";
  if (!authorOk) {
    report.add(
      "MANIFEST_AUTHOR",
      claudeFile,
      void 0,
      s.authorName ? `Author is not ${s.authorName}.` : "Author has no name.",
      s.authorName ? `Use \`${JSON.stringify(author)}\`.` : "Set author.name."
    );
  }
  if (s.homepage && claude.homepage !== s.homepage)
    report.add(
      "MANIFEST_HOMEPAGE",
      claudeFile,
      void 0,
      `Homepage is not ${s.homepage}.`,
      "Set it."
    );
  const repository = String(claude.repository ?? "");
  const owner = s.org || /^https:\/\/github\.com\/([\w.-]+)\//.exec(repository)?.[1] || "";
  const repoOk = repoName2 ? repository === `https://github.com/${owner}/${repoName2}` : Boolean(owner) && repository.startsWith(`https://github.com/${owner}/`);
  if (!repoOk)
    report.add(
      "MANIFEST_REPOSITORY",
      claudeFile,
      void 0,
      `Repository "${repository}" is not this ${owner || "GitHub"} repo.`,
      "Point it at the GitHub repo."
    );
  if (claude.license !== "MIT")
    report.add(
      "MANIFEST_LICENSE",
      claudeFile,
      void 0,
      "License is not MIT.",
      'Set `"license": "MIT"`.'
    );
  const keywords = Array.isArray(claude.keywords) ? claude.keywords : [];
  if (keywords.length < 3 || keywords.length > 8 || keywords.some((k) => k !== k.toLowerCase() || k === id2)) {
    report.add(
      "MANIFEST_KEYWORDS",
      claudeFile,
      void 0,
      "Keywords are not 3 to 8 lowercase words without the plugin id.",
      "Fix the keyword list."
    );
  }
  const ui = portable.interface ?? {};
  checkKeys(ui, INTERFACE_FIELDS, portableFile, report, "MANIFEST_INTERFACE");
  const expected = {
    displayName: displayNameOf(id2),
    shortDescription: description,
    developerName: s.authorName || ui.developerName,
    websiteURL: s.homepage || ui.websiteURL,
    composerIcon: "./assets/icon.png",
    logo: "./assets/icon.png"
  };
  for (const [key, value] of Object.entries(expected)) {
    if (ui[key] !== value)
      report.add(
        "MANIFEST_INTERFACE",
        portableFile,
        void 0,
        `interface.${key} is not "${value}".`,
        "Set it."
      );
  }
  const long = sentences(String(ui.longDescription ?? "")).length;
  if (long < 2 || long > 3)
    report.add(
      "MANIFEST_INTERFACE",
      portableFile,
      void 0,
      "longDescription is not 2 or 3 sentences.",
      "Rewrite it in 2 or 3 sentences."
    );
  const prompts = Array.isArray(ui.defaultPrompt) ? ui.defaultPrompt : [];
  if (prompts.length < 1 || prompts.length > 3 || prompts.some((p) => p.length > 128)) {
    report.add(
      "MANIFEST_INTERFACE",
      portableFile,
      void 0,
      "defaultPrompt is not 1 to 3 prompts of at most 128 characters.",
      "Fix the prompt list."
    );
  }
  if (ui.brandColor !== s.brandColor) {
    report.add(
      "MANIFEST_INTERFACE",
      portableFile,
      void 0,
      `brandColor isn't the settings' ${s.brandColor}.`,
      `Use ${s.brandColor}.`
    );
  }
  return claude;
}
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function checkApps(pluginDir, id2, root2, report) {
  const path = join11(pluginDir, ".app.json");
  if (!existsSync11(path)) return;
  const file = relative8(root2, path);
  const config = readJson2(path, root2, report);
  const apps = config?.apps;
  if (!isRecord2(config) || Object.keys(config).join() !== "apps" || !isRecord2(apps) || Object.keys(apps).length === 0) {
    report.add(
      "APP_DECLARATION",
      file,
      void 0,
      "The app file must contain a nonempty apps object.",
      'Use { "apps": { "<name>": { "id": "<verified connector id>" } } }.'
    );
    return;
  }
  const key = skillPrefixOf(id2);
  if (Object.keys(apps).join() !== key) {
    report.add(
      "APP_KEY",
      file,
      void 0,
      `The app must be named "${key}", matching its direct MCP fallback.`,
      `Use "${key}" as the app declaration key.`
    );
  }
  for (const [name, app] of Object.entries(apps)) {
    if (!isRecord2(app) || typeof app.id !== "string" || !app.id.trim() || /\s|:\/\/|^plugin[_-]|^gpt-/.test(app.id) || Object.keys(app).some((field) => !["id", "category"].includes(field)) || app.category !== void 0 && typeof app.category !== "string") {
      report.add(
        "APP_DECLARATION",
        file,
        void 0,
        `App "${name}" needs a connector id and may have a category string.`,
        "Copy the verified connector id, not a plugin id or server URL; keep credentials out of the declaration."
      );
    }
  }
  const mcpPath = join11(pluginDir, "mcp.json");
  if (!existsSync11(mcpPath)) return;
  const mcp = readJson2(mcpPath, root2, report);
  const fallback = isRecord2(mcp?.mcpServers) ? mcp.mcpServers[key] : void 0;
  if (!isRecord2(fallback) || fallback.type !== "http" || typeof fallback.url !== "string") {
    report.add(
      "APP_MCP_ROUTE",
      relative8(root2, mcpPath),
      void 0,
      `The app's direct fallback must be a remote HTTP server named "${key}".`,
      "Use the same declaration name for the managed app and its hosted MCP fallback; do not shadow a local server."
    );
  }
}
function checkMcp(pluginDir, id2, root2, report) {
  const claudePath = join11(pluginDir, ".mcp.json");
  const portablePath = join11(pluginDir, "mcp.json");
  const hasClaude = existsSync11(claudePath);
  const hasPortable = existsSync11(portablePath);
  if (!hasClaude && !hasPortable) return null;
  if (hasClaude !== hasPortable) {
    report.add(
      "MCP_PAIR",
      relative8(root2, pluginDir),
      void 0,
      "Only one of .mcp.json and mcp.json exists.",
      "Add the other; Claude Code reads .mcp.json and Codex reads mcp.json."
    );
    return null;
  }
  const claude = readJson2(claudePath, root2, report);
  const portable = readJson2(portablePath, root2, report);
  if (!claude || !portable) return null;
  const claudeFile = relative8(root2, claudePath);
  const portableFile = relative8(root2, portablePath);
  checkKeys(claude, ["mcpServers"], claudeFile, report, "MCP_FIELDS");
  checkKeys(portable, ["mcpServers"], portableFile, report, "MCP_FIELDS");
  const a = claude.mcpServers ?? {};
  const b = portable.mcpServers ?? {};
  const key = skillPrefixOf(id2);
  if (Object.keys(a).join() !== key || Object.keys(b).join() !== key) {
    report.add(
      "MCP_KEY",
      claudeFile,
      void 0,
      `Each MCP file must define one server named "${key}".`,
      `Name the server "${key}" in both files.`
    );
  }
  let local = false;
  for (const [name, server] of Object.entries(a)) {
    const other = b[name] ?? {};
    if (server.url) {
      if (!sameJson(server, { type: "http", url: server.url }) || !sameJson(other, server)) {
        report.add(
          "MCP_REMOTE",
          claudeFile,
          void 0,
          `Remote server "${name}" isn't the same \`type: http\` and \`url\` in .mcp.json and mcp.json.`,
          "Use only `type` and `url`."
        );
      }
    } else {
      local = true;
      if (!sameJson(server, { command: "node", args: [`\${CLAUDE_PLUGIN_ROOT}/server/index.mjs`] })) {
        report.add(
          "MCP_LOCAL",
          claudeFile,
          void 0,
          `Server "${name}" isn't node running \${CLAUDE_PLUGIN_ROOT}/server/index.mjs.`,
          "Use only `command` and `args` as the template does."
        );
      }
      if (
        // Codex fills in no root variable for MCP servers, but resolves `cwd` from the plugin root.
        !sameJson(other, { command: "node", args: ["server/index.mjs"], cwd: "." })
      ) {
        report.add(
          "MCP_LOCAL",
          portableFile,
          void 0,
          `Server "${name}" isn't node running server/index.mjs with \`cwd: "."\`.`,
          "Use `command`, `args` and `cwd` as the template does."
        );
      }
    }
  }
  return local ? checkServer(pluginDir, root2, report) : null;
}
function kebab(event) {
  return event.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
function checkHookConfig(config, file, registered, report) {
  for (const [event, groups] of Object.entries(config.hooks ?? {})) {
    for (const group of groups) {
      for (const handler of group.hooks ?? []) {
        const args = handler.args;
        const match = Array.isArray(args) ? handler.command === "node" && args.length === 1 ? /^\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/([a-z0-9-]+\.mjs)$/.exec(String(args[0])) : null : /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/([a-z0-9-]+\.mjs)"$/.exec(
          String(handler.command ?? "")
        );
        if (!match) {
          report.add(
            "HOOK_COMMAND",
            file,
            void 0,
            `A ${event} hook doesn't run \`\${CLAUDE_PLUGIN_ROOT}/hooks/<file>.mjs\` with node.`,
            'Use `"command": "node"` with the script as the only `args` entry in hooks.json, and the one-line node command in codex-hooks.json.'
          );
          continue;
        }
        const script = match[1] ?? "";
        registered.add(script);
        if (!script.startsWith(`${kebab(event)}-`)) {
          report.add(
            "NAME_HOOK",
            file,
            void 0,
            `Hook ${script} doesn't start with its event, ${kebab(event)}.`,
            `Rename it to ${kebab(event)}-<what>.mjs.`
          );
        }
        if (typeof handler.timeout !== "number" || handler.timeout > 5) {
          report.add(
            "HOOK_TIMEOUT",
            file,
            void 0,
            `Hook ${script} has no timeout of 5 or less.`,
            'Add `"timeout": 5`.'
          );
        }
      }
    }
  }
}
function checkHooks(pluginDir, root2, report) {
  const dir = join11(pluginDir, "hooks");
  if (!existsSync11(dir)) return;
  const configPath = join11(dir, "hooks.json");
  if (!existsSync11(configPath) || !readJson2(configPath, root2, report)) {
    report.add(
      "HOOKS_CONFIG",
      relative8(root2, configPath),
      void 0,
      "hooks/ has no valid hooks.json.",
      "Add hooks.json or remove the folder."
    );
    return;
  }
  const registered = /* @__PURE__ */ new Set();
  const byHost = /* @__PURE__ */ new Map();
  for (const name of ["hooks.json", "codex-hooks.json"]) {
    const path = join11(dir, name);
    const config = existsSync11(path) ? readJson2(path, root2, report) : null;
    const scripts2 = /* @__PURE__ */ new Set();
    if (config) checkHookConfig(config, relative8(root2, path), scripts2, report);
    for (const script of scripts2) registered.add(script);
    byHost.set(name, scripts2);
  }
  const claudeHooks = [...byHost.get("hooks.json") ?? []].sort().join();
  const codexHooks = [...byHost.get("codex-hooks.json") ?? []].sort().join();
  if (claudeHooks !== codexHooks) {
    report.add(
      "HOOK_PARITY",
      relative8(root2, join11(dir, "codex-hooks.json")),
      void 0,
      "hooks.json and codex-hooks.json don't register the same scripts.",
      "Register every hook script in both, with the event and matcher each host uses."
    );
  }
  const scripts = readdirSync6(dir).filter((n) => n.endsWith(".mjs"));
  for (const name of scripts) {
    const path = join11(dir, name);
    if (!registered.has(name))
      report.add(
        "HOOK_UNREGISTERED",
        relative8(root2, path),
        void 0,
        "Hook script is not registered.",
        "Register it in hooks.json or codex-hooks.json, or delete it."
      );
    const text = readFileSync11(path, "utf8");
    if (/\bfetch\(|node:https?|node:net|node:dgram/.test(text)) {
      report.add(
        "HOOK_NETWORK",
        relative8(root2, path),
        void 0,
        "Hook uses the network.",
        "Hooks make no network calls."
      );
    }
    if (name === "post-tool-use-skill-log.mjs") {
      const canonical = renderFile(
        `plugin/hooks/${name}.tmpl`,
        settingsVars(relative8(join11(pluginDir, ".."), pluginDir))
      );
      if (text !== canonical) {
        report.add(
          "HOOK_SKILL_LOG",
          relative8(root2, path),
          void 0,
          "The usage log hook differs from the template copy.",
          "Copy it again from the sidecut-agentskills template."
        );
      }
    }
  }
  for (const name of registered) {
    if (!scripts.includes(name))
      report.add(
        "HOOK_MISSING",
        relative8(root2, dir),
        void 0,
        `Registered hook ${name} doesn't exist.`,
        "Add the script or remove the entry."
      );
  }
}
function checkEvalsSource(root2, report) {
  for (const problem of stampProblems(root2))
    report.add(
      "EVAL_SOURCE",
      problem.file,
      void 0,
      problem.message,
      "Edit the evals at their source and sync again, or delete evals-source.json to own them here."
    );
}
function checkEvals(skills, root2, report) {
  const dir = join11(root2, "evals");
  const cases = existsSync11(dir) ? readdirSync6(dir).filter((n) => statSync5(join11(dir, n)).isDirectory()) : [];
  const bySpecificity = [...skills].sort((a, b) => b.length - a.length);
  const covered = /* @__PURE__ */ new Set();
  let hasNegative = false;
  for (const name of cases) {
    const where = relative8(root2, join11(dir, name));
    const owner = bySpecificity.find((s) => name.startsWith(`${s}-`));
    const prompt = join11(dir, name, "prompt.md");
    const text = existsSync11(prompt) && statSync5(prompt).isFile() ? readFileSync11(prompt, "utf8") : "";
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)?.[1] ?? "";
    if (/^negative-[a-z0-9-]+$/.test(name) && (!owner || /^tags:\s*\[negative\]/m.test(frontmatter)))
      hasNegative = true;
    else if (owner) covered.add(owner);
    else {
      report.add(
        "EVAL_NAME",
        where,
        void 0,
        "Eval case is not named <skill>-<what> or negative-<what>.",
        "Rename it after the skill it tests."
      );
    }
    if (!text.startsWith("---\n")) {
      report.add(
        "EVAL_PROMPT",
        where,
        void 0,
        "Eval case has no prompt.md with frontmatter.",
        "Add prompt.md with tags, runs, max_turns and allowed_tools."
      );
    }
    const graders = join11(dir, name, "graders");
    if (!existsSync11(graders) || !readdirSync6(graders).some((g) => g.endsWith(".md"))) {
      report.add(
        "EVAL_GRADERS",
        where,
        void 0,
        "Eval case has no graders.",
        "Add at least one graders/*.md file."
      );
    }
  }
  if (cases.length > 0 && !hasNegative) {
    report.add(
      "EVAL_MISSING",
      relative8(root2, dir),
      void 0,
      "There is no negative- eval case.",
      "Add evals/negative-<what>/ for a request the skill under test should leave to another route."
    );
  }
  for (const skill of skills) {
    if (!covered.has(skill)) {
      report.add(
        "EVAL_MISSING",
        relative8(root2, dir),
        void 0,
        `Skill ${skill} has no eval case.`,
        `Add evals/${skill}-<what>/ with a trigger case.`
      );
    }
  }
}
function checkReadme(pluginDir, description, skills, root2, report) {
  const path = join11(pluginDir, "README.md");
  if (!existsSync11(path)) {
    report.add(
      "README_MISSING",
      relative8(root2, path),
      void 0,
      "Plugin has no README.md.",
      "Add it from the template."
    );
    return;
  }
  const file = relative8(root2, path);
  const text = readFileSync11(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root2, report, { skipH1Case: true });
  const h1 = doc.headings.find((h) => h.level === 1);
  const id2 = relative8(join11(pluginDir, ".."), pluginDir);
  if (h1 && h1.text !== displayNameOf(id2))
    report.add(
      "README_TITLE",
      file,
      h1.line,
      `H1 is not "${displayNameOf(id2)}".`,
      "Use the display name."
    );
  if (h1 && paragraphAfter(doc, h1.line)?.text !== description) {
    report.add(
      "README_DESCRIPTION",
      file,
      h1.line + 2,
      "First paragraph is not the manifest description.",
      "Use the description word for word."
    );
  }
  const found = sections(doc);
  if (found.map((h) => h.text).join("|") !== README_SECTIONS.join("|")) {
    report.add(
      "README_SECTIONS",
      file,
      found[0]?.line,
      "Sections are not the README layout.",
      `Use exactly: ${README_SECTIONS.join(", ")}.`
    );
  }
  const whatItDoes = found.find((h) => h.text === "What it does");
  if (whatItDoes) {
    const rows = tableAfter(doc, whatItDoes);
    const want = [["Skill", "Does"], ...skills.map((s) => [`\`${s.name}\``, s.firstSentence])];
    if (!sameJson(rows, want)) {
      report.add(
        "README_SKILLS",
        file,
        whatItDoes.line,
        "The skill table doesn't match the skills.",
        "List every skill once, in name order, with its description's first sentence."
      );
    }
  }
  const install = /\n## Install\n([\s\S]*?)(?=\n## |$)/.exec(text)?.[1];
  if (install !== void 0 && !/^ {0,3}(```|~~~)/m.test(install)) {
    const at = found.find((h) => h.text === "Install");
    report.add(
      "README_INSTALL_BLOCK",
      file,
      at?.line,
      "The Install section has no code block.",
      "Put the install commands in a code block, as the template does."
    );
  }
  if (!text.includes("## License\n\nMIT. See [LICENSE](LICENSE).\n")) {
    report.add(
      "README_LICENSE",
      file,
      void 0,
      'License section is not "MIT. See [LICENSE](LICENSE)."',
      "Use that line."
    );
  }
}
function checkChangelog(pluginDir, version, root2, report) {
  const path = join11(pluginDir, "CHANGELOG.md");
  if (!existsSync11(path)) {
    report.add(
      "CHANGELOG_MISSING",
      relative8(root2, path),
      void 0,
      "Plugin has no CHANGELOG.md.",
      "Add it."
    );
    return;
  }
  const file = relative8(root2, path);
  const text = readFileSync11(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root2, report, { allowDates: true });
  if (doc.headings[0]?.text !== "Changelog" || doc.headings[0]?.level !== 1) {
    report.add(
      "CHANGELOG_TITLE",
      file,
      1,
      "CHANGELOG does not open with `# Changelog`.",
      "Start with `# Changelog`."
    );
  }
  const versions = [];
  let subsections = [];
  const flush = (line) => {
    const sorted = [...subsections].sort(
      (x, y) => CHANGELOG_SECTIONS.indexOf(x) - CHANGELOG_SECTIONS.indexOf(y)
    );
    if (subsections.some((s) => !CHANGELOG_SECTIONS.includes(s)) || subsections.join() !== sorted.join()) {
      report.add(
        "CHANGELOG_SECTIONS",
        file,
        line,
        "Entry sections are not Added, Changed, Fixed, Removed in order.",
        "Use only those, in that order."
      );
    }
    subsections = [];
  };
  for (const h of doc.headings.slice(1)) {
    if (h.level === 2) {
      flush(h.line);
      const match = /^\[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/.exec(h.text);
      if (!match)
        report.add(
          "CHANGELOG_ENTRY",
          file,
          h.line,
          "Entry heading is not `## [x.y.z] - YYYY-MM-DD`.",
          "Fix the heading."
        );
      else versions.push(match[1] ?? "");
    } else if (h.level === 3) subsections.push(h.text);
  }
  flush(doc.lines.length);
  if (versions[0] !== version) {
    report.add(
      "VERSION_SYNC",
      file,
      void 0,
      `Newest entry is ${versions[0] ?? "missing"}, the manifests say ${version}.`,
      "Add an entry for the current version."
    );
  }
  const numeric = versions.map((v) => v.split(".").map(Number));
  for (let i = 1; i < numeric.length; i++) {
    const [x, y] = [numeric[i - 1] ?? [], numeric[i] ?? []];
    const newer2 = (x[0] ?? 0) - (y[0] ?? 0) || (x[1] ?? 0) - (y[1] ?? 0) || (x[2] ?? 0) - (y[2] ?? 0);
    if (newer2 <= 0)
      report.add(
        "CHANGELOG_ORDER",
        file,
        void 0,
        "Entries are not newest first.",
        "Order entries by version, newest first."
      );
  }
}
function checkPlugin(pluginDir, root2, report, repoName2) {
  const id2 = relative8(join11(pluginDir, ".."), pluginDir);
  checkLayout2(pluginDir, root2, report);
  const manifest = checkManifests(pluginDir, id2, repoName2, root2, report);
  checkApps(pluginDir, id2, root2, report);
  const tools = checkMcp(pluginDir, id2, root2, report);
  const skills = checkSkills(pluginDir, root2, report, tools, id2, brandColorOf(pluginDir));
  checkHooks(pluginDir, root2, report);
  checkAntigravity(pluginDir, root2, report);
  if (repoName2) {
    checkEvals(
      skills.map((s) => s.name),
      root2,
      report
    );
    checkEvalsSource(root2, report);
  }
  const version = typeof manifest?.version === "string" ? manifest.version : null;
  checkReadme(pluginDir, String(manifest?.description ?? ""), skills, root2, report);
  if (version) checkChangelog(pluginDir, version, root2, report);
  checkScanText(pluginDir, root2, report);
  for (const path of listFiles(pluginDir)) {
    if (path.endsWith(".md") && !path.includes("/skills/") && !/\/(README|CHANGELOG)\.md$/.test(path)) {
      const text = readFileSync11(path, "utf8");
      checkMarkdown(parseMarkdown(path, text), text, root2, report);
    }
  }
  return { version };
}

// plugins/sidecut-agentskills/server/src/check/sync.ts
import {
  existsSync as existsSync12,
  lstatSync as lstatSync3,
  mkdirSync as mkdirSync3,
  readdirSync as readdirSync7,
  readFileSync as readFileSync12,
  rmSync as rmSync2,
  writeFileSync as writeFileSync3
} from "node:fs";
import { dirname as dirname5, join as join12 } from "node:path";
var OWNED_FILES = [
  "CLAUDE.md",
  "VOICE.md",
  "scripts/eval.mjs",
  "scripts/build-server.ts",
  "scripts/release.ts"
];
var SHARED_DATA = ["visual-reports.md", "visual-report.css"];
function pluginSharedFiles(id2) {
  return SHARED_DATA.map((name) => `plugins/${id2}/server/data/${name}`);
}
function pluginOwnedFile(id2) {
  return `plugins/${id2}/${USER_INPUT_PATH}`;
}
function pluginSyncFiles(id2) {
  return [`hooks/${SKILL_LOG_HOOK}`, ANTIGRAVITY_MANIFEST, ANTIGRAVITY_MCP, ANTIGRAVITY_HOOKS].map(
    (path) => `plugins/${id2}/${path}`
  );
}
var BLOCK_FILES = [".gitignore", "AGENTS.md", "SECURITY.md"];
var SETUP_FILE = "tests/setup.ts";
var SHARED_TOOLS = [
  "@biomejs/biome",
  "@types/node",
  "esbuild",
  "lefthook",
  "smol-toml",
  "typescript",
  "vitest"
];
var CHECKER = "github:SidecutStudio/sidecut-agentskills#v";
var MARK = /^(?:<!--|#|\/\/) (?:agentskills|sidecut):(start|end) ([\w-]+)(?: -->)?$/;
function blocksOf(lines) {
  const blocks = [];
  let open = null;
  for (const [i, line] of lines.entries()) {
    const m = MARK.exec(line);
    if (!m) continue;
    const name = m[2] ?? "";
    if (m[1] === "start") {
      if (open) return `line ${i + 1} starts block "${name}" inside block "${open.name}"`;
      if (blocks.some((b) => b.name === name)) return `block "${name}" appears twice`;
      open = { name, start: i };
    } else if (!open || open.name !== name)
      return `line ${i + 1} ends block "${name}", which isn't open`;
    else {
      blocks.push({ ...open, end: i });
      open = null;
    }
  }
  return open ? `block "${open.name}" is never ended` : blocks;
}
function hasBlocks(text) {
  const found = blocksOf(text.replaceAll("\r\n", "\n").split("\n"));
  return typeof found === "string" || found.length > 0;
}
function fenced(lines) {
  let inside = false;
  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inside = !inside;
      return true;
    }
    return inside;
  });
}
function mergeBlocks(current2, template, file) {
  const crlf = current2.includes("\r\n");
  const want = template.split("\n");
  let have = current2.replaceAll("\r\n", "\n").split("\n");
  const templateBlocks = blocksOf(want);
  if (typeof templateBlocks === "string") throw new Error(`Template ${file}: ${templateBlocks}`);
  for (const block of templateBlocks) {
    const found = blocksOf(have);
    if (typeof found === "string")
      return { error: `The block markers in ${file} are broken: ${found}.` };
    const body = want.slice(block.start, block.end + 1);
    const same = found.find((b) => b.name === block.name);
    if (same) {
      have = [...have.slice(0, same.start), ...body, ...have.slice(same.end + 1)];
      continue;
    }
    const anchor = want.slice(0, block.start).reverse().find((line) => line.trim() !== "" && !MARK.test(line));
    let at = anchor === void 0 ? -1 : have.indexOf(anchor);
    if (at < 0 && file.endsWith(".md")) at = have.findIndex((line) => line.startsWith("# "));
    if (at < 0 && /\.[cm]?[jt]s$/.test(file)) at = afterImports(have);
    const head = have.slice(0, at + 1);
    let rest = have.slice(at + 1);
    const covered = new Set(body.filter((line) => line.trim() !== ""));
    const keepAll = file === ".gitignore" && have.some((line) => line.startsWith("!"));
    if (!keepAll) {
      const code = fenced(have).slice(at + 1);
      rest = rest.filter((line, i) => code[i] || !covered.has(line));
    }
    const spaced = file === ".gitignore" ? body : ["", ...body, ""];
    have = collapse([...head, ...spaced, ...rest]);
  }
  const text = have.join("\n");
  return { text: crlf ? text.replaceAll("\n", "\r\n") : text };
}
function afterImports(lines) {
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!/^import(?=[\s{*'"])/.test(lines[i] ?? "")) continue;
    let j = i;
    while (j < lines.length - 1 && !/\bfrom\s|;\s*$|^import\s+['"]/.test(lines[j] ?? "")) j++;
    last = j;
    i = j;
  }
  return last;
}
function sameParsed(a, b) {
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return false;
  }
}
function parseVersion(spec) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(spec);
  return m ? m.slice(1).map(Number) : null;
}
function collapse(lines) {
  const out = lines.filter((line, i) => line !== "" || i > 0 && lines[i - 1] !== "");
  while (out.length > 1 && out.at(-1) === "" && out.at(-2) === "") out.pop();
  return out;
}
function newer(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}
function usesBun(root2) {
  return (existsSync12(join12(root2, "bun.lock")) || existsSync12(join12(root2, "bun.lockb"))) && !existsSync12(join12(root2, "package-lock.json"));
}
function lockfileOf(root2) {
  if (!usesBun(root2)) return "package-lock.json";
  return existsSync12(join12(root2, "bun.lock")) ? "bun.lock" : "bun.lockb";
}
function installCommand(root2) {
  return usesBun(root2) ? ["bun", ["install"]] : ["npm", ["install"]];
}
function planPackage(root2, vars, pinOnly) {
  const path = join12(root2, "package.json");
  if (!existsSync12(path)) return null;
  const text = readFileSync12(path, "utf8");
  const pkg = JSON.parse(text);
  const indent = /^\{\r?\n([ \t]+)"/.exec(text)?.[1] ?? "  ";
  const template = JSON.parse(
    renderFile("repo/package.json.tmpl", {
      id: vars.id,
      version: "0.0.0",
      checkerSource: `${CHECKER}${vars.version}`
    })
  );
  const raised = [];
  const npm = (s) => String(s ?? "").replace(/^npm@/, "");
  if (!pinOnly && !usesBun(root2) && newer(npm(template.packageManager), npm(pkg.packageManager))) {
    pkg.packageManager = template.packageManager;
    raised.push(template.packageManager);
  }
  const dev = pkg.devDependencies ?? {};
  for (const name of pinOnly ? [] : SHARED_TOOLS) {
    const want = template.devDependencies[name];
    if (want && dev[name] && newer(want, dev[name])) {
      dev[name] = want;
      raised.push(`${name} ${want}`);
    }
  }
  const pinned = dev["sidecut-agentskills"];
  if (pinned?.startsWith(CHECKER) && newer(vars.version, pinned.slice(CHECKER.length))) {
    dev["sidecut-agentskills"] = `${CHECKER}${vars.version}`;
    raised.push(`sidecut-agentskills v${vars.version}`);
  }
  if (raised.length === 0) return null;
  return {
    file: "package.json",
    what: `Behind the template: ${raised.join(", ")}.`,
    next: `${JSON.stringify(pkg, null, indent)}
`
  };
}
function planStarterEvals(root2, id2, key, kept) {
  const evals = join12(root2, "evals");
  if (existsSync12(join12(root2, STAMP_FILE)) || !lstatSync3(evals, { throwIfNoEntry: false })?.isDirectory())
    return [];
  const title = displayNameOf(id2);
  const skill = `${key}-check-status`;
  return [...pluginStarterEvals(id2, key, title)].flatMap(([name, next]) => {
    const dir = join12(evals, name);
    const graders = join12(dir, "graders");
    const positive = name === `${skill}-trigger`;
    const grader = `graders/${positive ? "skill-fired" : "no-skill"}.md`;
    const old = /* @__PURE__ */ new Map([
      [
        "prompt.md",
        `---
tags: [${positive ? "trigger" : "negative"}]
runs: 1
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---
${positive ? `Is ${title} working? Check its server.` : "What is a good name for a pet goldfish?"}
`
      ],
      [
        grader,
        `---
type: tool_used
tool: Skill
input_match: "${positive ? `${id2}:${skill}` : id2}"
${positive ? "min: 1\narm: with-only" : "min: 0\nmax: 0\narm: both"}
---
`
      ]
    ]);
    if (!lstatSync3(dir, { throwIfNoEntry: false })?.isDirectory() || !lstatSync3(graders, { throwIfNoEntry: false })?.isDirectory() || readdirSync7(dir).length !== 2 || readdirSync7(graders).length !== 1)
      return [];
    const changes2 = [];
    for (const [path, previous] of old) {
      const target = join12(dir, path);
      if (!lstatSync3(target, { throwIfNoEntry: false })?.isFile()) return [];
      const have = readFileSync12(target, "utf8");
      const want = next.get(path);
      if (!want || have !== previous && have !== want) return [];
      const file = `evals/${name}/${path}`;
      if (have !== want && !kept(file))
        changes2.push({
          file,
          what: `The starter eval ${name} has a portable fixture update.`,
          next: want
        });
    }
    return changes2;
  });
}
function planSync(root2, vars, kept = () => false) {
  const changes2 = [];
  const answers = repoSettings(root2);
  const settings = settingsVars(vars.id, answers);
  const render2 = (file) => renderFile(`repo/${file}.tmpl`, {
    ...settings,
    id: vars.id,
    repo: vars.repo,
    displayName: displayNameOf(vars.id)
  });
  const guide = pluginOwnedFile(vars.id);
  const beside = vars.scope === "beside";
  if (!beside)
    changes2.push(...planStarterEvals(root2, vars.id, skillPrefixOf(vars.id, answers), kept));
  const applies = (file) => !beside || file === guide && existsSync12(join12(root2, file)) || file === "scripts/eval.mjs" && existsSync12(join12(root2, "evals"));
  for (const file of [...OWNED_FILES, guide].filter(applies)) {
    if (kept(file)) continue;
    const want = file === guide ? userInput() : render2(file);
    const path = join12(root2, file);
    const have = existsSync12(path) ? readFileSync12(path, "utf8") : null;
    if (have !== want)
      changes2.push({
        file,
        what: have === null ? `${file} is missing.` : `${file} differs from the template copy.`,
        next: want
      });
  }
  for (const name of SHARED_DATA) {
    const file = `plugins/${vars.id}/server/data/${name}`;
    const path = join12(root2, file);
    if (kept(file) || !existsSync12(path)) continue;
    const want = readFileSync12(join12(dataRoot, name), "utf8");
    if (readFileSync12(path, "utf8") !== want)
      changes2.push({ file, what: `${file} differs from the shared copy.`, next: want });
  }
  const hook = `plugins/${vars.id}/hooks/${SKILL_LOG_HOOK}`;
  if (!kept(hook, "HOOK_SKILL_LOG") && existsSync12(join12(root2, hook))) {
    const want = renderFile(`plugin/hooks/${SKILL_LOG_HOOK}.tmpl`, settings);
    if (readFileSync12(join12(root2, hook), "utf8") !== want)
      changes2.push({
        file: hook,
        what: `${hook} differs from the template copy.`,
        next: want,
        code: "HOOK_SKILL_LOG"
      });
  }
  for (const { path, text } of antigravityFiles(join12(root2, "plugins", vars.id)) ?? []) {
    const file = `plugins/${vars.id}/${path}`;
    const have = existsSync12(join12(root2, file)) ? readFileSync12(join12(root2, file), "utf8") : null;
    if (text === null) {
      if (have !== null && !kept(file, "ANTIGRAVITY_UNEXPECTED"))
        changes2.push({
          file,
          what: `${file} has nothing to describe.`,
          next: "",
          remove: true,
          code: "ANTIGRAVITY_UNEXPECTED"
        });
    } else if (have === null) {
      if (!kept(file, "ANTIGRAVITY_MISSING"))
        changes2.push({
          file,
          what: `${file} is missing.`,
          next: text,
          code: "ANTIGRAVITY_MISSING"
        });
    } else if (!sameParsed(have, text) && !kept(file, "ANTIGRAVITY_SYNC"))
      changes2.push({
        file,
        what: `${file} doesn't match the Claude Code and Codex files.`,
        next: text,
        code: "ANTIGRAVITY_SYNC"
      });
  }
  const oldGuide = `plugins/${vars.id}/${OLD_USER_INPUT_PATH}`;
  for (const file of guideMoveFiles(root2, vars.id)) {
    if (kept(file)) continue;
    if (file === oldGuide) {
      changes2.push({ file, what: `${file} is now ${guide}.`, next: "", remove: true });
      continue;
    }
    const have = readFileSync12(join12(root2, file), "utf8");
    changes2.push({
      file,
      what: `${file} points at ${OLD_USER_INPUT_PATH}, now ${USER_INPUT_PATH}.`,
      next: have.replaceAll(OLD_USER_INPUT_PATH, USER_INPUT_PATH)
    });
  }
  for (const file of [...BLOCK_FILES, SETUP_FILE]) {
    if (kept(file)) continue;
    const path = join12(root2, file);
    if (file === SETUP_FILE && !existsSync12(path)) continue;
    if (beside && file !== SETUP_FILE && !(existsSync12(path) && hasBlocks(readFileSync12(path, "utf8"))))
      continue;
    const template = render2(file);
    if (!existsSync12(path)) {
      changes2.push({ file, what: `${file} is missing.`, next: template });
      continue;
    }
    const have = readFileSync12(path, "utf8");
    const merged = mergeBlocks(have, template, file);
    if ("error" in merged)
      changes2.push({ file, what: `${merged.error} Fix them by hand.`, next: null });
    else if (merged.text !== have)
      changes2.push({
        file,
        what: `The template blocks in ${file} are out of date.`,
        next: merged.text
      });
  }
  if (!kept("package.json")) {
    const pkg = planPackage(root2, vars, beside);
    if (pkg) changes2.push(pkg);
  }
  return changes2;
}
function guideMoveFiles(root2, id2) {
  const plugin = `plugins/${id2}`;
  const oldGuide = `${plugin}/${OLD_USER_INPUT_PATH}`;
  const pointers = markdownUnder(root2, plugin).filter(
    (file) => file !== oldGuide && readFileSync12(join12(root2, file), "utf8").includes(OLD_USER_INPUT_PATH)
  );
  return [...existsSync12(join12(root2, oldGuide)) ? [oldGuide] : [], ...pointers];
}
function markdownUnder(root2, dir) {
  const path = join12(root2, dir);
  if (!existsSync12(path)) return [];
  return readdirSync7(path, { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : markdownUnder(root2, file);
    return entry.name.endsWith(".md") ? [file] : [];
  });
}
function applySync(root2, changes2) {
  const left2 = [];
  for (const change of changes2) {
    if (change.next === null) {
      left2.push(change);
      continue;
    }
    const path = join12(root2, change.file);
    if (change.remove) {
      rmSync2(path, { force: true });
      continue;
    }
    mkdirSync3(dirname5(path), { recursive: true });
    writeFileSync3(path, change.next);
  }
  return left2;
}

// plugins/sidecut-agentskills/server/src/check/test-git-env.ts
import { existsSync as existsSync13, readdirSync as readdirSync8, readFileSync as readFileSync13, statSync as statSync6 } from "node:fs";
import { dirname as dirname6, join as join13, relative as relative9, sep as sep3 } from "node:path";
var SKIP = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  ".claude",
  ".codex",
  "dist",
  "build",
  "coverage",
  "eval-results",
  ".next"
]);
var CODE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
var RUNS_GIT = /\b(?:spawn|spawnSync|execFile|execFileSync|execa|execaSync)\(\s*['"`](?:[^'"`]*\/)?git['"`]|\b(?:exec|execSync)\(\s*['"`](?:[^'"`]*(?:&&|;|\|)\s*)?(?:[^'"`\s]*\/)?git\s|\bBun\.spawn(?:Sync)?\(\s*(?:\{\s*cmd:\s*)?\[\s*['"`](?:[^'"`]*\/)?git['"`]|\$`(?:[^`]*(?:&&|;)\s*)?git\s/;
var DROPS_GIT_ENV = /startsWith\(\s*['"`]GIT_['"`]\s*\)[^;]{0,120}?\bdelete\b|startsWith\(\s*['"`]GIT_['"`]\s*\)\s*\)\s*\{[^}]{0,200}?\bdelete\b|\/\^GIT_\/\.test\([^;]{0,120}?\bdelete\b|!\s*[\w.[\]]+\.startsWith\(\s*['"`]GIT_['"`]\s*\)|!\s*\/\^GIT_\/\.test\(/;
var DELETES_BY_NAME = ["GIT_DIR", "GIT_INDEX_FILE"].map(
  (name) => new RegExp(`\\bdelete\\s+process\\.env(?:\\.${name}\\b|\\[\\s*['"\`]${name}['"\`]\\s*\\])`)
);
function dropsGitEnv(text) {
  return DROPS_GIT_ENV.test(text) || DELETES_BY_NAME.every((re) => re.test(text));
}
function callEnd(text, from) {
  let depth = 0;
  let quote = "";
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === "'" || c === '"' || c === "`") quote = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i + 1;
  }
  return text.length;
}
function ownEnv(text, at) {
  if (text.startsWith("$`", at)) return false;
  const open = text.indexOf("(", at);
  const call = text.slice(open, callEnd(text, open));
  const env = /\benv\s*:\s*\{([^}]*)\}/.exec(call);
  return env !== null && !/\.\.\./.test(env[1] ?? "");
}
function stripComments(text) {
  let out = "";
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? "";
    if (quote) {
      out += c;
      if (c === "\\") out += text[++i] ?? "";
      else if (c === quote) quote = "";
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      out += c;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, "");
      i = stop - 1;
    } else out += c;
  }
  return out;
}
function isTest(path) {
  const parts = path.split("/");
  return parts.slice(0, -1).some((p) => p === "test" || p === "tests" || p === "__tests__") || /\.(?:test|spec)\.[^/]+$/.test(path);
}
function codeFiles(root2) {
  return repoFiles(root2).filter(
    (file) => CODE.test(file) && !file.split("/").some((part) => SKIP.has(part))
  );
}
function importsOf(root2, file, text) {
  const specs = [
    ...text.matchAll(
      /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\(\s*|^\s*import\s+)['"](\.\.?\/[^'"]+)['"]/gm
    )
  ].map((m) => m[1] ?? "");
  return specs.flatMap((spec) => {
    const base = join13(dirname6(file), spec).split(sep3).join("/");
    const stem = base.replace(/\.[cm]?js$/, "");
    const tries = [
      base,
      ...[".ts", ".mts", ".cts", ".tsx", ".js", ".mjs", ".cjs", "/index.ts", "/index.js"].map(
        (ext) => stem + ext
      )
    ];
    const hit = tries.find((p) => existsSync13(join13(root2, p)) && statSync6(join13(root2, p)).isFile());
    return hit === void 0 ? [] : [hit];
  });
}
function setupFiles(root2) {
  const named = [];
  const quoted = (list) => [...list.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1] ?? "");
  for (const config of readdirSync8(root2).filter(
    (n) => /^(?:vite(?:st)?\.(?:config|workspace)|jest\.config)\.[cm]?[jt]s$/.test(n)
  )) {
    const text = readFileSync13(join13(root2, config), "utf8");
    for (const m of text.matchAll(/setupFiles(?:AfterEnv)?\s*:\s*(\[[^\]]*\]|['"][^'"]+['"])/g))
      named.push(...quoted(m[1] ?? ""));
  }
  if (existsSync13(join13(root2, "bunfig.toml"))) {
    const text = readFileSync13(join13(root2, "bunfig.toml"), "utf8");
    named.push(...quoted(/preload\s*=\s*(\[[^\]]*\]|"[^"]+")/.exec(text)?.[1] ?? ""));
  }
  try {
    const pkg = JSON.parse(readFileSync13(join13(root2, "package.json"), "utf8"));
    for (const key of ["setupFiles", "setupFilesAfterEnv"])
      if (Array.isArray(pkg.jest?.[key])) named.push(...pkg.jest[key].map(String));
    for (const script of Object.values(pkg.scripts ?? {}))
      for (const m of String(script).matchAll(/--(?:preload|import|require|setupFiles)[ =](\S+)/g))
        named.push(m[1] ?? "");
  } catch {
  }
  return named.map(
    (p) => relative9(root2, join13(root2, p.replace(/^<rootDir>\//, ""))).split(sep3).join("/")
  ).filter((p) => existsSync13(join13(root2, p)) && statSync6(join13(root2, p)).isFile());
}
function checkTestGitEnv(root2, report) {
  const texts = /* @__PURE__ */ new Map();
  const read2 = (file) => {
    let text = texts.get(file);
    if (text === void 0) {
      text = stripComments(readFileSync13(join13(root2, file), "utf8"));
      texts.set(file, text);
    }
    return text;
  };
  const drops = (file, depth = 0) => dropsGitEnv(read2(file)) || depth < 3 && importsOf(root2, file, read2(file)).some((f) => drops(f, depth + 1));
  const inheritedGit = (file) => {
    const text = read2(file);
    const runs = new RegExp(RUNS_GIT.source, "g");
    for (const m of text.matchAll(runs)) if (!ownEnv(text, m.index)) return m.index;
    return -1;
  };
  const files = codeFiles(root2).filter(isTest);
  const offenders = files.filter((file) => inheritedGit(file) >= 0);
  if (offenders.length === 0) return;
  if (setupFiles(root2).some((file) => drops(file))) return;
  for (const file of offenders.filter((f) => !drops(f))) {
    const line = read2(file).slice(0, inheritedGit(file)).split("\n").length - 1;
    report.add(
      "TEST_GIT_ENV",
      file,
      line >= 0 ? line + 1 : void 0,
      "This test runs git, and nothing drops the GIT_* variables a git hook exports, so run from a hook its git acts on this checkout instead of its fixture repo.",
      "Drop them in the test preload, as the git-env block in the template's tests/setup.ts does (`npm exec --no -- sidecut-sync` adds it to an existing tests/setup.ts), or in this file before it runs git."
    );
  }
}

// plugins/sidecut-agentskills/server/src/check/repo.ts
var REQUIRED_ENTRIES = [
  ".github",
  ".gitignore",
  "AGENTS.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "biome.json",
  "package-lock.json",
  "lefthook.yml",
  "package.json",
  "plugins",
  "scripts",
  "tests",
  "evals",
  "tsconfig.json"
];
var OPTIONAL_ENTRIES = [
  SOLO_FILE,
  "evals-source.json",
  ".git",
  "node_modules",
  "vitest.config.ts",
  "bin",
  "VOICE.md",
  "RELEASING.md",
  "docs",
  ".claude-plugin",
  ".agents",
  REPO_FILE
];
var MARKETPLACES = [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"];
var CHECK_STEPS = [
  "biome check .",
  "tsc --noEmit",
  "npm run style",
  "npm test",
  "node scripts/build-server.ts --check"
];
function inOrder2(script, steps) {
  let at = 0;
  for (const step of script.split("&&").map((s) => s.trim())) if (step === steps[at]) at++;
  return at === steps.length;
}
var AGENTS_SECTIONS = ["Commands", "Layout", "Rules"];
var isRealDir = (path) => {
  const stat = lstatSync4(path);
  return stat.isDirectory() && !stat.isSymbolicLink();
};
var HOST_FOLDERS = [".claude", ".codex"];
function onlyHostState(root2, folder) {
  const dir = join14(root2, folder);
  if (!isRealDir(dir)) return false;
  const top = git(root2, "rev-parse", "--show-toplevel")?.trim();
  if (!top || realpathSync3(top) !== realpathSync3(root2)) return false;
  if (git(root2, "ls-files", "-z", "--", folder) !== "") return false;
  const registered = new Set(
    (git(root2, "worktree", "list", "--porcelain", "-z") ?? "").split("\0").filter((line) => line.startsWith("worktree ")).flatMap((line) => {
      const path = line.slice("worktree ".length);
      return existsSync14(path) ? [realpathSync3(path)] : [];
    })
  );
  return readdirSync9(dir).every((name) => {
    const path = join14(dir, name);
    if (folder === ".claude" && name === "worktrees" && isRealDir(path))
      return readdirSync9(path).every(
        (tree) => isRealDir(join14(path, tree)) && registered.has(realpathSync3(join14(path, tree)))
      );
    return git(root2, "check-ignore", "-q", "--", `${folder}/${name}`) !== void 0;
  });
}
function checkCheckerVersion(root2, report) {
  const read2 = (path) => {
    try {
      return JSON.parse(readFileSync14(join14(root2, path), "utf8"));
    } catch {
      return null;
    }
  };
  const pinned = /#v(\d+\.\d+\.\d+)$/.exec(
    read2("package.json")?.devDependencies?.["sidecut-agentskills"] ?? ""
  )?.[1];
  const installed = read2("node_modules/sidecut-agentskills/package.json")?.version;
  if (pinned && installed && pinned !== installed)
    report.add(
      "REPO_CHECKER_VERSION",
      "package.json",
      void 0,
      `package.json pins sidecut-agentskills v${pinned}, but node_modules holds v${installed}, so \`npm run style\` can differ from CI.`,
      "Run `npm install`, then check again."
    );
}
function checkTopLevel(root2, report) {
  const gitignore = readGitignore(root2);
  const top = git(root2, "rev-parse", "--show-toplevel")?.trim();
  const inGit = Boolean(top && realpathSync3(top) === realpathSync3(root2));
  const entries = readdirSync9(root2).filter(
    (n) => !ignoredBy(gitignore, n) && !(inGit && git(root2, "check-ignore", "-q", "--", n) !== void 0) && !(HOST_FOLDERS.includes(n) && onlyHostState(root2, n))
  );
  for (const name of entries) {
    if (!REQUIRED_ENTRIES.includes(name) && !OPTIONAL_ENTRIES.includes(name)) {
      report.add(
        "REPO_ENTRY_UNEXPECTED",
        name,
        void 0,
        `"${name}" isn't part of the repo layout.`,
        "Move it into the plugin, tests/ or scripts/, or remove it."
      );
    }
  }
  for (const name of REQUIRED_ENTRIES) {
    if (!entries.includes(name))
      report.add(
        "REPO_ENTRY_MISSING",
        name,
        void 0,
        `"${name}" is missing.`,
        "Add it from the template."
      );
  }
}
function checkLicense(root2, report) {
  const license = existsSync14(join14(root2, "LICENSE")) ? readFileSync14(join14(root2, "LICENSE"), "utf8") : "";
  const s = current();
  if (s.license !== "MIT") {
    if (license.trim() === "")
      report.add(
        "REPO_LICENSE",
        "LICENSE",
        1,
        "LICENSE is empty.",
        `Add the ${s.license} licence.`
      );
    return;
  }
  const holder = s.authorName ? escapeRegExp(s.authorName) : ".+";
  if (!new RegExp(`^MIT License\\n\\nCopyright \\(c\\) \\d{4} ${holder}\\n`).test(license)) {
    report.add(
      "REPO_LICENSE",
      "LICENSE",
      1,
      `LICENSE is not MIT with "Copyright (c) <year> ${s.authorName || "<author>"}".`,
      "Copy the template LICENSE."
    );
  }
}
function checkPackage(root2, id2, version, report) {
  const path = join14(root2, "package.json");
  if (!existsSync14(path)) return {};
  const pkg = JSON.parse(readFileSync14(path, "utf8"));
  if (pkg.name !== id2)
    report.add(
      "REPO_PACKAGE_NAME",
      "package.json",
      void 0,
      `Name is not "${id2}".`,
      "Use the plugin id."
    );
  if (version && pkg.version !== version) {
    report.add(
      "VERSION_SYNC",
      "package.json",
      void 0,
      `Version is ${pkg.version}, the manifests say ${version}.`,
      "Make them the same."
    );
  }
  if (!/^npm@\d+\.\d+\.\d+$/.test(String(pkg.packageManager ?? ""))) {
    report.add(
      "REPO_PACKAGE_MANAGER",
      "package.json",
      void 0,
      "`packageManager` is not a pinned npm@x.y.z.",
      "Set it, for example `npm@11.19.1`."
    );
  }
  const scripts = pkg.scripts ?? {};
  if (!inOrder2(scripts.check ?? "", CHECK_STEPS)) {
    report.add(
      "REPO_CHECK_SCRIPT",
      "package.json",
      void 0,
      "`check` leaves out a standard step or changes their order.",
      `Run these in this order, adding the repo's own steps anywhere: \`${CHECK_STEPS.join(" && ")}\`.`
    );
  }
  if (!scripts.style)
    report.add(
      "REPO_STYLE_SCRIPT",
      "package.json",
      void 0,
      "There is no `style` script.",
      'Add `"style": "sidecut-check"`.'
    );
  if (!inOrder2(scripts.build ?? "", ["node scripts/build-server.ts"]))
    report.add(
      "REPO_BUILD_SCRIPT",
      "package.json",
      void 0,
      "`build` does not run `node scripts/build-server.ts`.",
      "Add it, so the bundle and its licences are built the same way everywhere."
    );
  for (const [name, spec] of Object.entries({
    ...pkg.dependencies,
    ...pkg.devDependencies
  })) {
    if (!/^(\d+\.\d+\.\d+|github:[^#]+#.+|file:.+)$/.test(spec)) {
      report.add(
        "REPO_PINNED",
        "package.json",
        void 0,
        `${name} is "${spec}", not a pinned version.`,
        "Pin an exact version, or a tag for a GitHub dependency."
      );
    }
  }
  return scripts;
}
function checkAgents(root2, id2, scripts, report) {
  const path = join14(root2, "AGENTS.md");
  if (!existsSync14(path)) return;
  const text = readFileSync14(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root2, report, { skipH1Case: true });
  const h1 = doc.headings.find((h) => h.level === 1);
  if (h1?.text !== id2)
    report.add("AGENTS_TITLE", "AGENTS.md", h1?.line, `H1 is not "${id2}".`, `Use \`# ${id2}\`.`);
  const found = sections(doc).map((h) => h.text);
  const solo = current().workflow === "solo";
  const before = found.filter((s) => !SOLO_HEADINGS.includes(s));
  if (before.join("|") !== AGENTS_SECTIONS.join("|")) {
    report.add(
      "AGENTS_SECTIONS",
      "AGENTS.md",
      void 0,
      "Sections are not Commands, Layout, Rules.",
      solo ? `Use exactly those, then the ${SOLO_HEADINGS[0]} section.` : "Use exactly those."
    );
  }
  const ending = new RegExp(`${escapeRegExp(SOLO_START)}[\\s\\S]*${escapeRegExp(SOLO_END)}\\n$`);
  if (solo && !ending.test(text)) {
    report.add(
      "AGENTS_SOLO",
      "AGENTS.md",
      void 0,
      `AGENTS.md does not end with the ${SOLO_HEADINGS[0]} markers.`,
      SOLO_SETUP
    );
  }
  const commands = sections(doc).find((h) => h.text === "Commands");
  if (commands) {
    const rows = tableAfter(doc, commands).slice(1).map((r) => r[0] ?? "");
    const want = Object.keys(scripts).map((s) => `\`npm run ${s}\``);
    if (rows.join() !== want.join()) {
      report.add(
        "AGENTS_COMMANDS",
        "AGENTS.md",
        commands.line,
        "The command table doesn't match package.json scripts.",
        "List every script once, in package.json order."
      );
    }
  }
  const layout = sections(doc).find((h) => h.text === "Layout");
  if (layout && !doc.lines.slice(layout.line).join("\n").split(/\n## /)[0]?.includes("```text")) {
    report.add(
      "AGENTS_LAYOUT",
      "AGENTS.md",
      layout.line,
      "Layout has no `text` tree.",
      "Add a `text` fence with the top two levels."
    );
  }
}
function checkCi(root2, report) {
  const dir = join14(root2, ".github", "workflows");
  if (!existsSync14(join14(dir, "check.yml"))) {
    report.add(
      "CI_MISSING",
      ".github/workflows/check.yml",
      void 0,
      "There is no check workflow.",
      "Copy check.yml from the template."
    );
  }
  if (!existsSync14(join14(dir, "release.yml"))) {
    report.add(
      "CI_RELEASE",
      ".github/workflows/release.yml",
      void 0,
      "There is no release workflow.",
      "Copy release.yml from the template, so merging a version bump publishes it."
    );
  }
  if (!existsSync14(dir)) return;
  for (const name of readdirSync9(dir)) {
    const file = `.github/workflows/${name}`;
    const text = readFileSync14(join14(dir, name), "utf8");
    text.split("\n").forEach((line, i) => {
      const uses = /uses:\s*([^\s#]+)/.exec(line)?.[1];
      if (uses && !uses.startsWith("./") && !/@[0-9a-f]{40}$/.test(uses)) {
        report.add(
          "CI_PIN",
          file,
          i + 1,
          `${uses} is not pinned by full SHA.`,
          "Pin the action to a 40-character commit SHA."
        );
      }
      if (/runs-on:.*(macos|windows)/i.test(line)) {
        report.add(
          "CI_RUNNER",
          file,
          i + 1,
          "Job runs on hosted macOS or Windows.",
          "Use `ubuntu-24.04`, or in a private repo the runner picker the repo's CI mode uses."
        );
      }
      if (/node-version:\s*(?:latest|node|\*)\s*$/.test(line))
        report.add(
          "CI_NODE",
          file,
          i + 1,
          "Node version is not pinned.",
          "Pin an exact Node.js version."
        );
    });
  }
  for (const name of readdirSync9(dir)) {
    const file = `.github/workflows/${name}`;
    for (const line of bunlessToolSteps(readFileSync14(join14(dir, name), "utf8"))) {
      report.add(
        "CI_TOOLS",
        file,
        line,
        "The job's setup-ci-tools action runs on Bun, and this job doesn't install Bun.",
        "Download the tool's pinned build and check its checksum, as the template does."
      );
    }
  }
  const check = existsSync14(join14(dir, "check.yml")) ? readFileSync14(join14(dir, "check.yml"), "utf8") : "";
  const hostedOnly = isHostedOnly(check);
  const release = existsSync14(join14(dir, "release.yml")) ? readFileSync14(join14(dir, "release.yml"), "utf8") : "";
  if (hostedOnly && (/self-hosted/.test(release) || PRIVATE_ACTIONS.test(release))) {
    report.add(
      "CI_RELEASE",
      ".github/workflows/release.yml",
      void 0,
      "A public repo releases on a self-hosted runner or with an action from a private repo.",
      "Run the release job on `ubuntu-24.04` with public actions only; gh is already there."
    );
  }
  if (check && current().ci === "hosted" && !hostedOnly) {
    report.add(
      "CI_PICKER",
      ".github/workflows/check.yml",
      void 0,
      "check.yml doesn't run every job on ubuntu-24.04, which hosted CI needs.",
      "Copy check.yml from the hosted CI template."
    );
  } else if (check && !check.includes("/pick-runner@") && !hostedOnly) {
    report.add(
      "CI_PICKER",
      ".github/workflows/check.yml",
      void 0,
      "check.yml neither uses the runner picker nor runs every job on ubuntu-24.04.",
      "Copy the runner job from the template; a public repo runs every job on ubuntu-24.04 instead."
    );
  }
}
function bunlessToolSteps(workflow) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => /^jobs:\s*(#.*)?$/.test(line));
  if (start < 0) return [];
  const found = [];
  let jobIndent = -1;
  let hasBun = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = (lines[i] ?? "").replace(/(^|\s+)#.*$/, "");
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) break;
    if (jobIndent < 0) jobIndent = indent;
    if (indent === jobIndent) hasBun = false;
    const uses = /uses:\s*(\S+)/.exec(line)?.[1] ?? "";
    if (uses.includes("/setup-bun@")) hasBun = true;
    if (uses.includes("/actions/setup-ci-tools@") && !hasBun) found.push(i + 1);
  }
  return found;
}
function filesUnder(root2, dir, ignored) {
  const path = join14(root2, dir);
  if (!existsSync14(path)) return [];
  if (!lstatSync4(path).isDirectory()) return [dir];
  return readdirSync9(path).filter((name) => name !== ".DS_Store" && !ignoredBy(ignored, name)).flatMap((name) => filesUnder(root2, `${dir}/${name}`, ignored));
}
function checkInstallSource(root2, id2, repo, report) {
  const check = join14(root2, ".github", "workflows", "check.yml");
  const s = current();
  const org = s.org || "<owner>";
  const market = marketplaceName(id2, s);
  const hostedOnly = existsSync14(check) && isHostedOnly(readFileSync14(check, "utf8"));
  const hasOwn = MARKETPLACES.some((file) => existsSync14(join14(root2, file)));
  const isPublic = !s.marketplace || hostedOnly;
  const gitignore = readGitignore(root2);
  const found = [".claude-plugin", ".agents"].flatMap((dir) => filesUnder(root2, dir, gitignore));
  const extra = found.filter((f) => !MARKETPLACES.includes(f));
  for (const file of extra)
    report.add(
      "REPO_MARKETPLACE",
      file,
      void 0,
      `"${file}" isn't part of the repo layout; the root .claude-plugin/ and .agents/ hold only a public repo's marketplace files.`,
      "Move it into the plugin, or remove it."
    );
  if (s.marketplace && s.ci === "hosted" && !hasOwn) return;
  if (!isPublic) {
    for (const file of found.filter((f) => MARKETPLACES.includes(f)))
      report.add(
        "REPO_MARKETPLACE",
        file,
        void 0,
        "A private repo has its own marketplace.",
        `List the plugin from the ${market} marketplace only; a public repo, whose jobs all run on ubuntu-24.04, keeps one.`
      );
    return;
  }
  const [claudeFile, codexFile] = MARKETPLACES;
  const how = "Write it as the house style's Install source section shows.";
  for (const file of MARKETPLACES) {
    if (!existsSync14(join14(root2, file)))
      report.add(
        "REPO_MARKETPLACE",
        file,
        void 0,
        s.marketplace ? `A public repo has no ${file}, so only people with access to the ${market} marketplace can install it.` : `There is no ${file}, so nobody can add this repo as a marketplace.`,
        how
      );
  }
  const only = (file, source) => {
    if (!existsSync14(join14(root2, file))) return;
    const marketplace = readJson3(join14(root2, file));
    const plugins = marketplace.plugins;
    const ok = marketplace.name === id2 && Array.isArray(plugins) && plugins.length === 1 && plugins[0]?.name === id2 && source(plugins[0]);
    if (!ok)
      report.add(
        "REPO_MARKETPLACE",
        file,
        void 0,
        `${file} doesn't list only plugins/${id2} under the marketplace name ${id2}.`,
        how
      );
  };
  const path = `./plugins/${id2}`;
  only(claudeFile, (entry) => entry.source === path);
  only(codexFile, (entry) => {
    const source = entry.source;
    return source?.source === "local" && source.path === path;
  });
  const readme = existsSync14(join14(root2, "README.md")) ? readFileSync14(join14(root2, "README.md"), "utf8") : "";
  const install = /\n## Install\n([\s\S]*?)(?=\n## |$)/.exec(readme)?.[1] ?? "";
  const add = `marketplace add ${org}/${repo}`;
  const named = new Set(
    [...install.matchAll(/plugin (?:install|add) [\w.-]+@([\w.-]+)/g)].map((m) => m[1])
  );
  const added = new Set(
    [...install.matchAll(/plugin marketplace add (\S+)/g)].map((m) => m[1]?.replace(/`$/, ""))
  );
  for (const source of added) {
    if (source !== `${org}/${repo}`)
      report.add(
        "README_INSTALL",
        "README.md",
        void 0,
        `The Install section adds the marketplace ${source}, which isn't this repo.`,
        `Add \`${org}/${repo}\` instead.`
      );
  }
  for (const marketplace of named) {
    if (marketplace !== id2)
      report.add(
        "README_INSTALL",
        "README.md",
        void 0,
        `The Install section installs from ${marketplace}, a marketplace this public repo doesn't provide.`,
        `Install ${id2}@${id2} after \`/plugin ${add}\` in Claude Code and \`codex plugin ${add}\` in Codex.`
      );
  }
  const steps = [
    `/plugin ${add}`,
    `/plugin install ${id2}@${id2}`,
    `codex plugin ${add}`,
    `codex plugin add ${id2}@${id2}`
  ];
  const lines = new Set(install.split("\n").map((line) => line.replace(/\s+#.*$/, "").trim()));
  const missing = steps.filter((step) => !lines.has(step));
  if (missing.length > 0)
    report.add(
      "README_INSTALL",
      "README.md",
      void 0,
      `The Install section is missing ${missing.map((step) => `\`${step}\``).join(", ")}.`,
      "Use the public install steps from the house style's Install source section."
    );
}
function checkSolo(root2, report) {
  if (current().workflow !== "solo") return;
  const path = join14(root2, SOLO_FILE);
  if (!existsSync14(path)) {
    report.add(
      "SOLO_REQUIRED",
      SOLO_FILE,
      void 0,
      `There is no ${SOLO_FILE}, which the repo's workflow reads.`,
      SOLO_SETUP
    );
    return;
  }
  const required = requiredChecks(readFileSync14(path, "utf8"));
  if (!required.includes("check")) {
    report.add(
      "SOLO_REQUIRED",
      SOLO_FILE,
      void 0,
      '`required_checks` does not include "check".',
      'Add "check" to required_checks.'
    );
  }
  const runs = workflowChecks(root2);
  if (runs === null) return;
  for (const name of required.filter((name2) => !runs(name2)))
    report.add(
      "SOLO_REQUIRED",
      SOLO_FILE,
      void 0,
      `\`required_checks\` lists "${name}", but no job in .github/workflows/ reports a check by that name, so the merge gate waits for one that never runs.`,
      "Remove it from required_checks, or add the job. A check another service reports goes under the keep list in package.json with its source."
    );
}
function requiredChecks(toml) {
  const body = /^required_checks\s*=\s*\[([^\]]*)\]/m.exec(
    toml.split("\n").map((line) => line.replace(/\s#.*$/, "")).join("\n")
  )?.[1];
  return body ? [...body.matchAll(/"([^"]*)"/g)].map((m) => m[1] ?? "") : [];
}
function workflowChecks(root2) {
  const dir = join14(root2, ".github", "workflows");
  if (!existsSync14(dir)) return null;
  const names = readdirSync9(dir).filter((file) => /\.ya?ml$/.test(file)).flatMap((file) => jobsOf(readFileSync14(join14(dir, file), "utf8"))).map((job) => job.title ?? job.name);
  const patterns = names.map(
    (name) => new RegExp(
      `^${name.split(/\$\{\{[^}]*\}\}/).map(escapeRegExp).join(".*")}(?: \\(.*\\)| / .*)?$`
    )
  );
  return (check) => patterns.some((pattern) => pattern.test(check));
}
function readJson3(path) {
  try {
    return JSON.parse(readFileSync14(path, "utf8"));
  } catch {
    return {};
  }
}
function identify(root2) {
  const pluginsDir = join14(root2, "plugins");
  const plugins = existsSync14(pluginsDir) ? readdirSync9(pluginsDir).filter((n) => n !== ".DS_Store") : [];
  const only = plugins.length === 1 ? plugins[0] ?? "" : "";
  const manifest = readJson3(join14(pluginsDir, only, ".claude-plugin", "plugin.json"));
  const pkg = existsSync14(join14(root2, "package.json")) ? readJson3(join14(root2, "package.json")) : readJson3(join14(root2, "web", "package.json"));
  const settings = repoSettings(root2);
  const owner = settings.org ? escapeRegExp(settings.org) : "[\\w.-]+";
  const repo = new RegExp(`^https:\\/\\/github\\.com\\/${owner}\\/([\\w.-]+)$`).exec(
    String(manifest.repository ?? "")
  )?.[1] ?? "";
  const keep = packageConfig(pkg).keep ?? {};
  const olderName = Boolean(settings.prefix) && only === `${settings.prefix}${repo}` && pkg.name === only;
  const renamed = pkg.name === only && Object.hasOwn(keep, "REPO_PLUGIN_ID");
  if (only && repo && (repo === only || olderName || renamed))
    return {
      plugins,
      id: only,
      plugin: only,
      repo,
      scope: `Checked the whole repo for ${only}.`,
      keep
    };
  const scope2 = !only ? `Checked ${plugins.length} plugins only: the repo holds ${plugins.length === 0 ? "none" : "more than one"}.` : `Checked the plugin only: its manifest points at ${repo || `no ${settings.org || "GitHub"} repo`}, not a repo that exists only for ${only}.`;
  return { plugins, id: null, plugin: only || null, repo, scope: scope2, keep };
}
function reportSync(root2, vars, report) {
  for (const change of planSync(root2, { ...vars, version: ownVersion })) {
    if (change.code) continue;
    report.add(
      "REPO_SYNC",
      change.file,
      void 0,
      change.what,
      "Run `npm exec --no -- sidecut-sync`. If this repo got it right, change the template in sidecut-agentskills instead."
    );
  }
}
function checkRepo(root2, report, options = {}) {
  useSettings(repoSettings(root2));
  const pluginsDir = join14(root2, "plugins");
  const { plugins, id: only, plugin, repo: repoName2, scope: scope2, keep } = identify(root2);
  const fleet = readFleet(root2);
  const { kind, how } = repoKind(root2, fleet, Boolean(only), report);
  const said = {
    declared: "declared in package.json",
    listed: "from the fleet's repo index",
    inferred: "guessed from its files"
  }[how];
  if (kind !== "plugin" || options.fast) {
    report.scope = `Checked the whole repo as ${/^[aeiou]/.test(kind) ? "an" : "a"} ${kind} repo (${said})${plugins.length && !options.fast ? `, with ${plugins.join(", ")}` : ""}${options.fast ? ", fast rules only" : ""}.`;
    if (!options.fast) {
      for (const id3 of plugins) checkPlugin(join14(pluginsDir, id3), root2, report, null);
      if (plugin)
        reportSync(root2, { id: plugin, repo: repoName2, scope: only ? "whole" : "beside" }, report);
      checkTestGitEnv(root2, report);
    }
    if (kind !== "plugin") checkShape(root2, kind, report);
    checkDocs(root2, kind, fleet, report);
    report.applyKeep(keep);
    return;
  }
  if (!existsSync14(pluginsDir)) {
    report.add(
      "REPO_NO_PLUGINS",
      "plugins",
      void 0,
      "There is no plugins/ folder.",
      "Put the plugin in plugins/<plugin-id>/."
    );
    return;
  }
  report.scope = scope2;
  if (!only) {
    for (const id3 of plugins) checkPlugin(join14(pluginsDir, id3), root2, report, null);
    if (plugin) reportSync(root2, { id: plugin, repo: repoName2, scope: "beside" }, report);
    checkTestGitEnv(root2, report);
    checkDocs(root2, kind, fleet, report);
    report.applyKeep(keep);
    return;
  }
  const id2 = only;
  const pluginDir = join14(pluginsDir, id2);
  if (repoName2 !== id2 && id2 !== `${current().prefix}${repoName2}`)
    report.add(
      "REPO_PLUGIN_ID",
      "package.json",
      void 0,
      `Plugin ${id2} retains the repository name ${repoName2}.`,
      "Keep REPO_PLUGIN_ID with the reason for retaining the repository name."
    );
  const { version } = checkPlugin(pluginDir, root2, report, repoName2);
  checkTopLevel(root2, report);
  checkLicense(root2, report);
  const scripts = checkPackage(root2, id2, version, report);
  checkCheckerVersion(root2, report);
  checkAgents(root2, id2, scripts, report);
  checkCi(root2, report);
  checkInstallSource(root2, id2, repoName2, report);
  checkSolo(root2, report);
  for (const name of ["README.md", "LICENSE", "CHANGELOG.md"]) {
    const a = join14(root2, name);
    const b = join14(pluginDir, name);
    if (existsSync14(a) && existsSync14(b) && readFileSync14(a, "utf8") !== readFileSync14(b, "utf8")) {
      report.add(
        "REPO_COPY",
        name,
        void 0,
        `${name} differs from plugins/${id2}/${name}.`,
        "Keep the two copies identical."
      );
    }
  }
  reportSync(root2, { id: id2, repo: repoName2, scope: "whole" }, report);
  checkTestGitEnv(root2, report);
  const security = join14(root2, "SECURITY.md");
  if (existsSync14(security)) {
    const text = readFileSync14(security, "utf8");
    checkMarkdown(parseMarkdown(security, text), text, root2, report);
  }
  checkDocs(root2, kind, fleet, report);
  report.applyKeep(keep);
}

// scripts/sync.ts
var usage = `Usage: sidecut-sync [<repo>] [--check] [--force] [--fix]

Brings a plugin repo up to date with Agentskills: the files it owns, the blocks marked
agentskills:start (sidecut:start in older and Sidecut repos), and the shared tool versions in
package.json. Uses the installed, pinned version of Agentskills. Paths and rules listed under
agentskills.keep (or sidecut.keep) in package.json are left alone.

  --check    change nothing; list what would change and exit 1 if anything would
  --force    also overwrite files with uncommitted changes
  --fix      also fix what sidecut-check finds that has one right answer, in a repo of any
             kind: the Solo block, CLAUDE.md's import of AGENTS.md and the retired studio name`;
var { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: "boolean" },
    force: { type: "boolean" },
    fix: { type: "boolean" },
    help: { type: "boolean" }
  }
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
var root = resolve2(positionals[0] ?? ".");
var who = identify(root);
var id = who.id ?? who.plugin;
function planFixes() {
  const report = new Report();
  checkRepo(root, report, { fast: true });
  const byFile = /* @__PURE__ */ new Map();
  for (const fix of report.fixes) {
    const path = join15(root, fix.file);
    const entry = byFile.get(fix.file) ?? {
      what: [],
      next: existsSync15(path) ? readFileSync15(path, "utf8") : ""
    };
    const next = fix.apply(entry.next);
    if (next === entry.next) continue;
    if (!entry.what.includes(fix.what)) entry.what.push(fix.what);
    byFile.set(fix.file, { ...entry, next });
  }
  return [...byFile].map(([file, entry]) => ({ file, ...entry }));
}
function guard(files) {
  if (values.check || values.force || files.length === 0) return;
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_"))
  );
  const dirty = spawnSync4("git", ["status", "--porcelain", "--", ...files], {
    cwd: root,
    encoding: "utf8",
    env
  });
  if (dirty.status !== 0) {
    console.error(
      "This folder is not a git repo, so a change could not be undone. Pass --force to sync anyway."
    );
    process.exit(1);
  }
  if (dirty.stdout.trim() !== "") {
    console.error(
      `These files have uncommitted changes, so nothing was changed:
${dirty.stdout}Commit or stash them first, or pass --force.`
    );
    process.exit(1);
  }
}
function runFixes(guarded = false) {
  const fixes = planFixes();
  if (!guarded) guard(fixes.map((f) => f.file));
  for (const fix of fixes) {
    if (values.check) console.log(`Would fix ${fix.file}: ${fix.what.join(" ")}`);
    else {
      writeFileSync4(join15(root, fix.file), fix.next);
      console.log(`Fixed ${fix.file}: ${fix.what.join(" ")}`);
    }
  }
  return fixes.length > 0;
}
if (!id) {
  if (values.fix) {
    const found = runFixes();
    if (!found) console.log("Nothing to fix.");
    process.exit(values.check && found ? 1 : 0);
  }
  console.log(`Nothing to sync. ${who.scope} Pass --fix to fix what the checker can.`);
  process.exit(0);
}
var scope = who.id ? "whole" : "beside";
if (scope === "beside")
  console.log(
    `Syncing ${id} and the repo files that already follow the template: the repo ships it beside other work.`
  );
var keys = Object.keys(who.keep);
var changes = planSync(
  root,
  { id, repo: who.repo, version: ownVersion, scope },
  (file, code) => keys.some(
    (key) => keepCovers(key, "REPO_SYNC", file) || code !== void 0 && keepCovers(key, code, file)
  )
);
guard([
  ...OWNED_FILES,
  ...BLOCK_FILES,
  SETUP_FILE,
  pluginOwnedFile(id),
  ...pluginSharedFiles(id),
  ...pluginSyncFiles(id),
  ...guideMoveFiles(root, id),
  ...changes.filter(({ file }) => file.startsWith("evals/")).map(({ file }) => file),
  "package.json",
  lockfileOf(root),
  ...values.fix ? planFixes().map((f) => f.file) : []
]);
if (changes.length === 0) {
  console.log(`Up to date with sidecut-agentskills v${ownVersion}.`);
  const fixed = values.fix && runFixes(true);
  process.exit(values.check && fixed ? 1 : 0);
}
if (values.check) {
  for (const change of changes) console.log(`Would change ${change.file}: ${change.what}`);
  process.exit(1);
}
var left = applySync(root, changes);
if (values.fix) runFixes(true);
for (const change of changes)
  if (change.next !== null) console.log(`Changed ${change.file}: ${change.what}`);
if (changes.some((c) => c.file === "package.json")) {
  const [cmd, args] = installCommand(root);
  const install = spawnSync4(cmd, args, { cwd: root, stdio: "inherit" });
  if (install.error) {
    console.error(`Could not run ${cmd} ${args.join(" ")}: ${install.error.message}`);
    process.exit(1);
  }
  if (install.status !== 0) process.exit(install.status ?? 1);
}
if (left.length > 0) {
  console.error(`
${left.map((c) => c.what).join("\n")}`);
  process.exit(1);
}
console.log(
  `
Synced with sidecut-agentskills v${ownVersion}. Review the diff: where this repo was ahead, change the template instead and keep the repo's version under the keep list in package.json until it lands.`
);
