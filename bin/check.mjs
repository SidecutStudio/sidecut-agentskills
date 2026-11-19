#!/usr/bin/env node

// scripts/check.ts
import { resolve } from "node:path";
import { parseArgs } from "node:util";

// plugins/sidecut-agentskills/server/src/check/repo.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { existsSync as existsSync7, lstatSync, readdirSync as readdirSync4, readFileSync as readFileSync6, realpathSync } from "node:fs";
import { join as join7 } from "node:path";

// plugins/sidecut-agentskills/server/src/scaffold.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// plugins/sidecut-agentskills/server/src/check/report.ts
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
          `sidecut.keep lists "${key}", which no longer differs.`,
          "Remove it."
        );
      for (const p of hit) this.kept.push({ ...p, reason: String(reason) });
      this.problems = this.problems.filter((p) => !hit.includes(p));
    }
  }
  add(code, file, line, message, fix) {
    const target = ["SKILL_LENGTH", "REF_LENGTH", "SKILL_DESCRIPTION_LENGTH"].includes(code) ? this.advisories : this.problems;
    target.push({ code, file, line, message, fix });
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

// plugins/sidecut-agentskills/server/src/scaffold.ts
var here = dirname(fileURLToPath(import.meta.url));
var dataRoot = existsSync(join(here, "data")) ? join(here, "data") : existsSync(join(here, "..", "data")) ? join(here, "..", "data") : join(here, "..", "plugins", "sidecut-agentskills", "server", "data");
var templatesRoot = join(dataRoot, "templates");
var OWNER_INPUT_PATH = "server/data/owner-input.md";
function ownerInput() {
  return readFileSync(join(dataRoot, "owner-input.md"), "utf8");
}
var ownVersion = JSON.parse(readFileSync(join(dataRoot, "..", "..", ".claude-plugin", "plugin.json"), "utf8")).version;
var PLUGIN_ID = /^sidecut-[a-z0-9]+(-[a-z0-9]+)*$/;
var SKILL_NAME = /^[a-z]+(-[a-z]+){1,2}$/;
function skillPrefixOf(pluginId) {
  return pluginId.replace(/^sidecut-/, "");
}
function isSkillName(name, prefix) {
  return name === prefix || name.startsWith(`${prefix}-`) && SKILL_NAME.test(name.slice(prefix.length + 1));
}
var BRAND_COLOR = "#FF6B00";
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
function displayNameOf(id) {
  return id.split("-").map(
    (word) => ACRONYMS.has(word) ? word.toUpperCase() : (word[0] ?? "").toUpperCase() + word.slice(1)
  ).join(" ");
}
function skillTitleOf(name, prefix) {
  if (name === prefix) return displayNameOf(`sidecut-${prefix}`);
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
    const value = vars[key];
    if (value === void 0) throw new Error(`Template uses unknown variable ${match}`);
    return value;
  });
}
function renderFile(path, vars) {
  return render(readFileSync(join(templatesRoot, path), "utf8"), vars);
}
function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}
function brandColorOf(pluginDir) {
  try {
    const codex = JSON.parse(readFileSync(join(pluginDir, ".codex-plugin", "plugin.json"), "utf8"));
    return String(codex.interface?.brandColor ?? "");
  } catch {
    return "";
  }
}

// plugins/sidecut-agentskills/server/src/check/markdown.ts
import { existsSync as existsSync2 } from "node:fs";
import { dirname as dirname2, join as join2, relative as relative2 } from "node:path";
var ALLOWED_HTML = /^<!-- (solo-workflow|sidecut):(start|end)( [\w-]+)? -->$/;
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
    if (line === "<!-- solo-workflow:start -->") solo = true;
    if (solo) {
      inCode[i] = true;
      if (line === "<!-- solo-workflow:end -->") solo = false;
      continue;
    }
    if (!fence && /^<!-- sidecut:(start|end) [\w-]+ -->$/.test(line)) {
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
  return /^\s*$|^#{1,6} |^\s*(- |\d+\. )|^\|/.test(line) || ALLOWED_HTML.test(line);
}
function checkLinks(doc, file, root, report2) {
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    const text = prose(line);
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1] ?? "";
      if (/^[a-z]+:/.test(target) || target.startsWith("#")) continue;
      const path = join2(dirname2(doc.path), target.split("#")[0] ?? "");
      if (!existsSync2(path)) {
        report2.add(
          "MD_LINK_TARGET",
          file,
          i + 1,
          `Link target "${target}" doesn't exist.`,
          "Point the link at a real file."
        );
      }
      if (relative2(root, path).startsWith("..")) {
        report2.add(
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
function checkMarkdown(doc, _text, root, report2, _options = {}) {
  const file = relative2(root, doc.path);
  checkLinks(doc, file, root, report2);
  doc.lines.forEach((line, i) => {
    if (!doc.inCode[i] && /\bTODO\b/.test(prose(line))) {
      report2.add(
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

// plugins/sidecut-agentskills/server/src/check/plugin.ts
import { existsSync as existsSync5, readdirSync as readdirSync3, readFileSync as readFileSync4, statSync as statSync3 } from "node:fs";
import { join as join5, relative as relative5 } from "node:path";

// plugins/sidecut-agentskills/server/src/check/server.ts
import { spawnSync } from "node:child_process";
import { existsSync as existsSync3, mkdtempSync, readFileSync as readFileSync2, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join as join3, relative as relative3 } from "node:path";
var HINTS = ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"];
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
  const result = spawnSync("node", [bundle], {
    input: `${messages.map((m) => JSON.stringify({ jsonrpc: "2.0", ...m })).join("\n")}
`,
    encoding: "utf8",
    timeout: 1e4,
    cwd: tmpdir()
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
function checkServer(pluginDir, root, report2) {
  const source = join3(pluginDir, "server", "src", "index.ts");
  const bundle = join3(pluginDir, "server", "index.mjs");
  const where = relative3(root, join3(pluginDir, "server"));
  if (!existsSync3(source) || !existsSync3(bundle)) {
    report2.add(
      "SERVER_FILES",
      where,
      void 0,
      "Local server needs server/src/index.ts and server/index.mjs.",
      "Add the source and run `npm run build`."
    );
    return null;
  }
  for (const file of listFiles(join3(pluginDir, "server", "src"))) {
    if (/process\.cwd\(\)/.test(readFileSync2(file, "utf8"))) {
      report2.add(
        "SERVER_CWD",
        relative3(root, file),
        void 0,
        "Server code uses the working directory.",
        "Resolve paths from `import.meta.url`; in Claude Code the working directory is the user project."
      );
    }
  }
  const out = mkdtempSync(join3(tmpdir(), "sidecut-check-"));
  try {
    const built = join3(out, "index.mjs");
    let inputs;
    let failure;
    try {
      const build = createRequire(join3(root, "package.json"))("esbuild").buildSync;
      const result = build({
        absWorkingDir: root,
        entryPoints: [relative3(root, source)],
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        preserveSymlinks: true,
        outfile: built,
        metafile: true,
        logLevel: "silent",
        banner: {
          js: "import { createRequire as __sidecutRequire } from 'node:module'; const require = __sidecutRequire(import.meta.url);"
        }
      });
      inputs = Object.keys(result.metafile.inputs);
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (failure !== void 0) {
      report2.add(
        "SERVER_BUILD",
        where,
        void 0,
        `The server doesn't build: ${failure.split("\n")[0]}`,
        "Run `npm install`, then fix the build error."
      );
    } else if (!readFileSync2(built).equals(readFileSync2(bundle))) {
      report2.add(
        "SERVER_BUNDLE_STALE",
        relative3(root, bundle),
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
      const notices = join3(pluginDir, "server", "THIRD_PARTY_LICENSES.txt");
      const text = existsSync3(notices) ? readFileSync2(notices, "utf8") : "";
      const missing = packages.filter((pkg) => !text.split("\n").includes(pkg));
      if (missing.length > 0) {
        report2.add(
          "SERVER_LICENSES",
          relative3(root, notices),
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
    report2.add(
      "SERVER_START",
      relative3(root, bundle),
      void 0,
      "The server didn't answer initialize and tools/list.",
      "Run `node server/index.mjs` and fix the startup error."
    );
    return null;
  }
  const count = sentences(listing.instructions ?? "").length;
  if (count < 3 || count > 6) {
    report2.add(
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
      report2.add(
        "NAME_TOOL",
        label,
        void 0,
        `Tool name "${tool.name}" is not verb_object snake_case.`,
        "Rename it, for example `get_status`."
      );
    }
    if (!tool.title)
      report2.add("TOOL_TITLE", label, void 0, "Tool has no title.", "Add a `title`.");
    const missing = HINTS.filter((h) => typeof tool.annotations?.[h] !== "boolean");
    if (missing.length > 0) {
      report2.add(
        "TOOL_ANNOTATIONS",
        label,
        void 0,
        `Tool doesn't set ${missing.join(", ")}.`,
        "Set all four hints explicitly."
      );
    }
    const description = tool.description ?? "";
    if (sentences(description).length > 2 || /^Use this tool/i.test(description) || description === "") {
      report2.add(
        "TOOL_DESCRIPTION",
        label,
        void 0,
        "Tool description is not 1 or 2 sentences of what it returns and when to use it.",
        "Rewrite it: what it returns, then when to use it."
      );
    }
  }
  return new Set(listing.tools.map((t) => t.name));
}

// plugins/sidecut-agentskills/server/src/check/skills.ts
import { existsSync as existsSync4, readdirSync as readdirSync2, readFileSync as readFileSync3, statSync as statSync2 } from "node:fs";
import { join as join4, relative as relative4 } from "node:path";
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
  const keys = [];
  const values2 = /* @__PURE__ */ new Map();
  const lineOf = /* @__PURE__ */ new Map();
  lines.forEach((line, i) => {
    const match = /^([a-z-]+):(?: (.*))?$/.exec(line);
    if (!match) return;
    const key = match[1] ?? "";
    keys.push(key);
    values2.set(key, match[2] ?? "");
    lineOf.set(key, i + 2);
  });
  return { keys, values: values2, lines: lineOf };
}
function checkFrontmatter(name, lines, file, report2, tools, plugin) {
  if (!lines) {
    report2.add(
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
    report2.add(
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
    report2.add(
      "SKILL_FIELD_ORDER",
      file,
      2,
      "Frontmatter fields are out of order.",
      `Order them: ${sorted.join(", ")}.`
    );
  }
  if (fm.values.get("name") !== name) {
    report2.add(
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
    report2.add(
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
    report2.add(
      "SKILL_DESCRIPTION_LENGTH",
      file,
      fm.lines.get("description"),
      `Description is ${description.length} characters.`,
      "Keep it to 400 or fewer."
    );
  }
  if (!DESCRIPTION_SHAPE.test(description)) {
    report2.add(
      "SKILL_DESCRIPTION_SHAPE",
      file,
      fm.lines.get("description"),
      "Description needs a capability and concrete trigger.",
      "Describe what the skill does, then when to use it. Add an exclusion only if useful."
    );
  }
  if (fm.keys.includes("allowed-tools")) {
    const start = (fm.lines.get("allowed-tools") ?? 0) - 1;
    const own = `mcp__plugin_${plugin}_${plugin.replace(/^sidecut-/, "")}__`;
    for (let i = start; /^ {2}- /.test(lines[i] ?? ""); i++) {
      const entry = (lines[i] ?? "").slice(4).trim();
      if (!entry.startsWith("mcp__")) continue;
      const tool = entry.startsWith(own) ? entry.slice(own.length) : null;
      if (!tool || tools && !tools.has(tool)) {
        report2.add(
          "SKILL_ALLOWED_MCP",
          file,
          i + 2,
          `\`${entry}\` isn't one of this plugin's MCP tools.`,
          `Name a tool the server has, as \`${own}<tool>\`.`
        );
      }
    }
    if (fm.values.get("allowed-tools") !== "" || !/^ {2}- \S/.test(lines[start] ?? "")) {
      report2.add(
        "SKILL_ALLOWED_TOOLS",
        file,
        start + 1,
        "`allowed-tools` is not a YAML list.",
        "List each tool on its own `  - ` line."
      );
    }
  }
  if (fm.keys.includes("user-invocable") && fm.values.get("user-invocable") !== "false") {
    report2.add(
      "SKILL_DEFAULT_FIELD",
      file,
      fm.lines.get("user-invocable"),
      "`user-invocable` repeats its default.",
      "Remove it, or set it to `false`."
    );
  }
  if (fm.keys.includes("disable-model-invocation") && fm.values.get("disable-model-invocation") !== "true") {
    report2.add(
      "SKILL_DEFAULT_FIELD",
      file,
      fm.lines.get("disable-model-invocation"),
      "`disable-model-invocation` repeats its default.",
      "Remove it, or set it to `true`."
    );
  }
  const effort = fm.values.get("effort");
  if (effort !== void 0 && !EFFORTS.includes(effort)) {
    report2.add(
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
    report2.add(
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
    (folder) => existsSync4(join4(dir, folder)) ? readdirSync2(join4(dir, folder)).filter((f) => statSync2(join4(dir, folder, f)).isFile()).map((f) => `${folder}/${f}`) : []
  );
}
function checkLayout(dir, root, report2) {
  for (const path of listFiles(dir)) {
    const rel = relative4(dir, path);
    const file = relative4(root, path);
    if (rel === "SKILL.md" || rel === "agents/openai.yaml") continue;
    const [folder, name, ...rest] = rel.split("/");
    const pattern = SUPPORT_FOLDERS[folder ?? ""];
    if (!pattern || rest.length > 0 || !pattern.test(name ?? "")) {
      report2.add(
        "SKILL_FILE_UNEXPECTED",
        file,
        void 0,
        "File is not part of the skill layout.",
        "Keep only SKILL.md, agents/openai.yaml, references/, examples/ and scripts/ files, one level deep."
      );
    }
  }
  if (!existsSync4(join4(dir, "agents", "openai.yaml"))) {
    report2.add(
      "SKILL_OPENAI_YAML",
      relative4(root, dir),
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
function checkOpenAiYaml(dir, info, title, brandColor, root, report2) {
  const path = join4(dir, "agents", "openai.yaml");
  if (!existsSync4(path)) return;
  const expected = openAiYamlOf(info, title, brandColor);
  if (readFileSync3(path, "utf8") !== expected) {
    report2.add(
      "SKILL_OPENAI_YAML",
      relative4(root, path),
      1,
      "openai.yaml doesn't match the skill.",
      `Make it exactly:
${expected}`
    );
  }
}
function checkSections(dir, name, root, report2, tools, skills, plugin) {
  const path = join4(dir, "SKILL.md");
  const file = relative4(root, path);
  const text = readFileSync3(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report2, { skipH1Case: true });
  if (doc.lines.length > 200) {
    report2.add(
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
    report2.add("SKILL_TITLE", file, h1.line, `H1 is "${h1.text}".`, `Make it "# ${title}".`);
  }
  const support = supportFiles(dir);
  for (const f of support) {
    if (!text.includes(f)) {
      report2.add(
        "SKILL_REFERENCES",
        file,
        void 0,
        f + " is not referenced from SKILL.md.",
        "Reference the supporting file where it helps."
      );
    }
  }
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    if (/\]\(\.\.\//.test(prose(line))) {
      report2.add(
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
        report2.add(
          "SKILL_POINTER",
          file,
          i + 1,
          `\`${token}\` isn't a skill or subagent in this plugin.`,
          "Point at a skill or subagent that exists."
        );
      }
      if (TOOL_NAME.test(token) && tools && !tools.has(token)) {
        report2.add(
          "SKILL_TOOL",
          file,
          i + 1,
          `\`${token}\` isn't a tool on this plugin's MCP server.`,
          "Name a tool the server has."
        );
      }
    }
  });
  for (const f of support) {
    const p = join4(dir, f);
    if (f.endsWith(".md")) checkSupportDoc(p, root, report2);
    else checkScript(p, root, report2);
  }
}
function checkSupportDoc(path, root, report2) {
  const file = relative4(root, path);
  const text = readFileSync3(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report2);
  if (doc.frontmatter)
    report2.add(
      "REF_FRONTMATTER",
      file,
      1,
      "Reference file has frontmatter.",
      "Remove it; references are not skills."
    );
  if (doc.lines.length > 300) {
    report2.add(
      "REF_LENGTH",
      file,
      301,
      `File has ${doc.lines.length} lines.`,
      "Split it to stay at 300 or fewer."
    );
  }
}
function checkScript(path, root, report2) {
  const file = relative4(root, path);
  const text = readFileSync3(path, "utf8");
  for (const match of text.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
    if (!(match[1] ?? "").startsWith("node:")) {
      report2.add(
        "SCRIPT_IMPORT",
        file,
        void 0,
        `Imports "${match[1]}".`,
        "Use only built-in `node:` modules."
      );
    }
  }
  if (!text.includes("--help"))
    report2.add(
      "SCRIPT_HELP",
      file,
      void 0,
      "Script has no `--help`.",
      "Handle `--help` with a usage line."
    );
  if (/\bfetch\(|node:https?|node:net/.test(text)) {
    report2.add(
      "SCRIPT_NETWORK",
      file,
      void 0,
      "Script uses the network.",
      "Skill scripts work offline."
    );
  }
}
function checkSkills(pluginDir, root, report2, tools, plugin, brandColor) {
  const skillsDir = join4(pluginDir, "skills");
  if (!existsSync4(skillsDir)) {
    report2.add(
      "PLUGIN_NO_SKILLS",
      relative4(root, pluginDir),
      void 0,
      "Plugin has no skills folder.",
      "Add at least one skill."
    );
    return [];
  }
  const names = readdirSync2(skillsDir).filter((n) => statSync2(join4(skillsDir, n)).isDirectory()).sort();
  const skills = new Set(names);
  const agentsDir = join4(pluginDir, "agents");
  const targets = new Set(names);
  if (existsSync4(agentsDir)) {
    for (const f of readdirSync2(agentsDir)) if (f.endsWith(".md")) targets.add(f.slice(0, -3));
  }
  const prefix = skillPrefixOf(plugin);
  const infos = [];
  for (const name of names) {
    const dir = join4(skillsDir, name);
    const file = relative4(root, join4(dir, "SKILL.md"));
    if (!isSkillName(name, prefix)) {
      report2.add(
        "NAME_SKILL",
        relative4(root, dir),
        void 0,
        `Skill "${name}" is not ${prefix}- then a 2 or 3 word verb-object name.`,
        `Rename it, for example \`${prefix}-write-skill\`, or \`${prefix}\` for the router.`
      );
    }
    if (!existsSync4(join4(dir, "SKILL.md"))) {
      report2.add(
        "SKILL_MISSING",
        file,
        void 0,
        "Skill folder has no SKILL.md.",
        "Add SKILL.md or remove the folder."
      );
      continue;
    }
    checkLayout(dir, root, report2);
    const doc = parseMarkdown(join4(dir, "SKILL.md"), readFileSync3(join4(dir, "SKILL.md"), "utf8"));
    const info = checkFrontmatter(name, doc.frontmatter, file, report2, tools, plugin);
    checkSections(dir, name, root, report2, tools, targets, plugin);
    if (info) {
      checkOpenAiYaml(dir, info, skillTitleOf(name, prefix), brandColor, root, report2);
      infos.push(info);
    }
  }
  const hasRouter = skills.has(prefix);
  const needsRouter = names.filter((n) => n !== prefix).length >= 4;
  if (hasRouter !== needsRouter) {
    report2.add(
      "SKILL_ROUTER",
      relative4(root, skillsDir),
      void 0,
      needsRouter ? `Plugin has 4 or more skills but no \`${prefix}\` router.` : `Plugin has a \`${prefix}\` router but fewer than 4 other skills.`,
      needsRouter ? `Add \`skills/${prefix}\`.` : `Remove \`skills/${prefix}\`.`
    );
  }
  return infos;
}

// plugins/sidecut-agentskills/server/src/check/plugin.ts
var PLUGIN_ENTRIES = /* @__PURE__ */ new Set([
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
function readJson(path, root, report2) {
  try {
    return JSON.parse(readFileSync4(path, "utf8"));
  } catch {
    report2.add(
      "JSON_INVALID",
      relative5(root, path),
      void 0,
      "File is not valid JSON.",
      "Fix the JSON."
    );
    return null;
  }
}
function checkKeys(obj, expected, file, report2, code) {
  const keys = Object.keys(obj);
  if (keys.join() !== expected.join()) {
    report2.add(
      code,
      file,
      void 0,
      `Fields are ${keys.join(", ")}.`,
      `Use exactly, in order: ${expected.join(", ")}.`
    );
  }
}
function emptyDirs(dir) {
  const entries = readdirSync3(dir);
  const found = entries.length === 0 ? [dir] : [];
  for (const name of entries) {
    const path = join5(dir, name);
    if (statSync3(path).isDirectory()) found.push(...emptyDirs(path));
  }
  return found;
}
function pngSize(path) {
  const bytes = readFileSync4(path);
  if (bytes.length < 24 || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
function checkLayout2(pluginDir, root, report2) {
  for (const name of readdirSync3(pluginDir)) {
    if (name === ".DS_Store") continue;
    if (!PLUGIN_ENTRIES.has(name)) {
      const hint = name === "plugin.json" ? "Codex reads .codex-plugin/plugin.json; a root plugin.json stops it loading hooks." : name === "commands" ? "Turn commands into skills." : name === "evals" ? "Move evaluation cases to the repository root, outside the installed plugin." : "Move or remove it.";
      report2.add(
        "PLUGIN_ENTRY_UNEXPECTED",
        relative5(root, join5(pluginDir, name)),
        void 0,
        `"${name}" isn't part of the plugin layout.`,
        hint
      );
    }
  }
  for (const dir of emptyDirs(pluginDir)) {
    report2.add(
      "PLUGIN_EMPTY_FOLDER",
      relative5(root, dir),
      void 0,
      "Empty folder.",
      "Remove it."
    );
  }
  const assets = join5(pluginDir, "assets");
  const icon = join5(assets, "icon.png");
  if (existsSync5(assets)) {
    for (const name of readdirSync3(assets)) {
      if (name !== "icon.png")
        report2.add(
          "PLUGIN_ASSET",
          relative5(root, join5(assets, name)),
          void 0,
          "Only assets/icon.png is allowed.",
          "Remove it."
        );
    }
  }
  const size = existsSync5(icon) ? pngSize(icon) : null;
  if (size?.[0] !== 512 || size[1] !== 512) {
    report2.add(
      "PLUGIN_ICON",
      relative5(root, icon),
      void 0,
      "assets/icon.png is missing or not a 512 by 512 PNG.",
      "Add a 512 by 512 PNG."
    );
  }
  if (existsSync5(join5(pluginDir, "agents"))) {
    for (const name of readdirSync3(join5(pluginDir, "agents"))) {
      if (!/^[a-z]+\.md$/.test(name)) {
        report2.add(
          "NAME_AGENT",
          relative5(root, join5(pluginDir, "agents", name)),
          void 0,
          "Subagent file is not a one-word role noun.",
          "Rename it, for example `reviewer.md`."
        );
      }
      const prefix = relative5(join5(pluginDir, ".."), pluginDir).replace(/^sidecut-/, "");
      const profile = join5(
        pluginDir,
        "codex",
        "agents",
        `${prefix}-${name.replace(/\.md$/, "")}.toml`
      );
      if (!existsSync5(profile)) {
        report2.add(
          "AGENT_CODEX_PROFILE",
          relative5(root, profile),
          void 0,
          "The subagent has no Codex profile.",
          "Run `npm run build`, which writes codex/agents/ from agents/."
        );
      }
    }
  }
}
function checkManifests(pluginDir, id, repoName, root, report2) {
  const claudePath = join5(pluginDir, ".claude-plugin", "plugin.json");
  const portablePath = join5(pluginDir, ".codex-plugin", "plugin.json");
  for (const path of [claudePath, portablePath]) {
    if (!existsSync5(path))
      report2.add(
        "MANIFEST_MISSING",
        relative5(root, path),
        void 0,
        "Manifest is missing.",
        "Add it from the template."
      );
  }
  if (!existsSync5(claudePath) || !existsSync5(portablePath)) return null;
  const claude = readJson(claudePath, root, report2);
  const portable = readJson(portablePath, root, report2);
  if (!claude || !portable) return null;
  const claudeFile = relative5(root, claudePath);
  const portableFile = relative5(root, portablePath);
  checkKeys(claude, SHARED_FIELDS, claudeFile, report2, "MANIFEST_FIELDS");
  const paths = { skills: "./skills/" };
  if (existsSync5(join5(pluginDir, "mcp.json"))) paths.mcpServers = "./mcp.json";
  if (existsSync5(join5(pluginDir, ".app.json"))) paths.apps = "./.app.json";
  if (existsSync5(join5(pluginDir, "hooks", "codex-hooks.json")))
    paths.hooks = "./hooks/codex-hooks.json";
  checkKeys(
    portable,
    [...SHARED_FIELDS, ...Object.keys(paths), "interface"],
    portableFile,
    report2,
    "MANIFEST_FIELDS"
  );
  for (const [field, value] of Object.entries(paths)) {
    if (portable[field] !== value)
      report2.add(
        "MANIFEST_CODEX_PATH",
        portableFile,
        void 0,
        `"${field}" is not "${value}".`,
        "Set it."
      );
  }
  for (const field of SHARED_FIELDS) {
    if (!sameJson(claude[field], portable[field])) {
      report2.add(
        "MANIFEST_SYNC",
        portableFile,
        void 0,
        `"${field}" differs from .claude-plugin/plugin.json.`,
        "Make the shared fields identical."
      );
    }
  }
  if (claude.name !== id || !PLUGIN_ID.test(id)) {
    report2.add(
      "MANIFEST_NAME",
      claudeFile,
      void 0,
      `Name must be the folder name "${id}" in the form sidecut-<name>.`,
      "Rename the plugin or its folder."
    );
  }
  if (typeof claude.version !== "string" || !SEMVER.test(claude.version)) {
    report2.add("MANIFEST_VERSION", claudeFile, void 0, "Version is not x.y.z.", "Use SemVer.");
  }
  const description = String(claude.description ?? "");
  if (description.length > 120 || !description.endsWith(".") || sentences(description).length !== 1) {
    report2.add(
      "MANIFEST_DESCRIPTION",
      claudeFile,
      void 0,
      "Description is not one sentence of at most 120 characters.",
      "Shorten it to one sentence ending with a full stop."
    );
  }
  if (!sameJson(claude.author, { name: "Sidecut Studio", url: "https://sidecut.dev" })) {
    report2.add(
      "MANIFEST_AUTHOR",
      claudeFile,
      void 0,
      "Author is not Sidecut Studio.",
      'Use `{ "name": "Sidecut Studio", "url": "https://sidecut.dev" }`.'
    );
  }
  if (claude.homepage !== "https://sidecut.dev")
    report2.add(
      "MANIFEST_HOMEPAGE",
      claudeFile,
      void 0,
      "Homepage is not https://sidecut.dev.",
      "Set it."
    );
  const repository = String(claude.repository ?? "");
  const repoOk = repoName ? repository === `https://github.com/SidecutStudio/${repoName}` : repository.startsWith("https://github.com/SidecutStudio/");
  if (!repoOk)
    report2.add(
      "MANIFEST_REPOSITORY",
      claudeFile,
      void 0,
      `Repository "${repository}" is not this SidecutStudio repo.`,
      "Point it at the GitHub repo."
    );
  if (claude.license !== "MIT")
    report2.add(
      "MANIFEST_LICENSE",
      claudeFile,
      void 0,
      "License is not MIT.",
      'Set `"license": "MIT"`.'
    );
  const keywords = Array.isArray(claude.keywords) ? claude.keywords : [];
  if (keywords.length < 3 || keywords.length > 8 || keywords.some((k) => k !== k.toLowerCase() || k === id)) {
    report2.add(
      "MANIFEST_KEYWORDS",
      claudeFile,
      void 0,
      "Keywords are not 3 to 8 lowercase words without the plugin id.",
      "Fix the keyword list."
    );
  }
  const ui = portable.interface ?? {};
  checkKeys(ui, INTERFACE_FIELDS, portableFile, report2, "MANIFEST_INTERFACE");
  const expected = {
    displayName: displayNameOf(id),
    shortDescription: description,
    developerName: "Sidecut Studio",
    websiteURL: "https://sidecut.dev",
    composerIcon: "./assets/icon.png",
    logo: "./assets/icon.png"
  };
  for (const [key, value] of Object.entries(expected)) {
    if (ui[key] !== value)
      report2.add(
        "MANIFEST_INTERFACE",
        portableFile,
        void 0,
        `interface.${key} is not "${value}".`,
        "Set it."
      );
  }
  const long = sentences(String(ui.longDescription ?? "")).length;
  if (long < 2 || long > 3)
    report2.add(
      "MANIFEST_INTERFACE",
      portableFile,
      void 0,
      "longDescription is not 2 or 3 sentences.",
      "Rewrite it in 2 or 3 sentences."
    );
  const prompts = Array.isArray(ui.defaultPrompt) ? ui.defaultPrompt : [];
  if (prompts.length < 1 || prompts.length > 3 || prompts.some((p) => p.length > 128)) {
    report2.add(
      "MANIFEST_INTERFACE",
      portableFile,
      void 0,
      "defaultPrompt is not 1 to 3 prompts of at most 128 characters.",
      "Fix the prompt list."
    );
  }
  if (ui.brandColor !== BRAND_COLOR) {
    report2.add(
      "MANIFEST_INTERFACE",
      portableFile,
      void 0,
      `brandColor isn't Sidecut Builder's orange.`,
      `Use ${BRAND_COLOR}.`
    );
  }
  return claude;
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function checkApps(pluginDir, id, root, report2) {
  const path = join5(pluginDir, ".app.json");
  if (!existsSync5(path)) return;
  const file = relative5(root, path);
  const config = readJson(path, root, report2);
  const apps = config?.apps;
  if (!isRecord(config) || Object.keys(config).join() !== "apps" || !isRecord(apps) || Object.keys(apps).length === 0) {
    report2.add(
      "APP_DECLARATION",
      file,
      void 0,
      "The app file must contain a nonempty apps object.",
      'Use { "apps": { "<name>": { "id": "<verified connector id>" } } }.'
    );
    return;
  }
  const key = id.replace(/^sidecut-/, "");
  if (Object.keys(apps).join() !== key) {
    report2.add(
      "APP_KEY",
      file,
      void 0,
      `The app must be named "${key}", matching its direct MCP fallback.`,
      `Use "${key}" as the app declaration key.`
    );
  }
  for (const [name, app] of Object.entries(apps)) {
    if (!isRecord(app) || typeof app.id !== "string" || !app.id.trim() || /\s|:\/\/|^plugin[_-]|^gpt-/.test(app.id) || Object.keys(app).some((field) => !["id", "category"].includes(field)) || app.category !== void 0 && typeof app.category !== "string") {
      report2.add(
        "APP_DECLARATION",
        file,
        void 0,
        `App "${name}" needs a connector id and may have a category string.`,
        "Copy the verified connector id, not a plugin id or server URL; keep credentials out of the declaration."
      );
    }
  }
  const mcpPath = join5(pluginDir, "mcp.json");
  if (!existsSync5(mcpPath)) return;
  const mcp = readJson(mcpPath, root, report2);
  const fallback = isRecord(mcp?.mcpServers) ? mcp.mcpServers[key] : void 0;
  if (!isRecord(fallback) || fallback.type !== "http" || typeof fallback.url !== "string") {
    report2.add(
      "APP_MCP_ROUTE",
      relative5(root, mcpPath),
      void 0,
      `The app's direct fallback must be a remote HTTP server named "${key}".`,
      "Use the same declaration name for the managed app and its hosted MCP fallback; do not shadow a local server."
    );
  }
}
function checkMcp(pluginDir, id, root, report2) {
  const claudePath = join5(pluginDir, ".mcp.json");
  const portablePath = join5(pluginDir, "mcp.json");
  const hasClaude = existsSync5(claudePath);
  const hasPortable = existsSync5(portablePath);
  if (!hasClaude && !hasPortable) return null;
  if (hasClaude !== hasPortable) {
    report2.add(
      "MCP_PAIR",
      relative5(root, pluginDir),
      void 0,
      "Only one of .mcp.json and mcp.json exists.",
      "Add the other; Claude Code reads .mcp.json and Codex reads mcp.json."
    );
    return null;
  }
  const claude = readJson(claudePath, root, report2);
  const portable = readJson(portablePath, root, report2);
  if (!claude || !portable) return null;
  const claudeFile = relative5(root, claudePath);
  const portableFile = relative5(root, portablePath);
  checkKeys(claude, ["mcpServers"], claudeFile, report2, "MCP_FIELDS");
  checkKeys(portable, ["mcpServers"], portableFile, report2, "MCP_FIELDS");
  const a = claude.mcpServers ?? {};
  const b = portable.mcpServers ?? {};
  const key = id.replace(/^sidecut-/, "");
  if (Object.keys(a).join() !== key || Object.keys(b).join() !== key) {
    report2.add(
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
        report2.add(
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
        report2.add(
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
        report2.add(
          "MCP_LOCAL",
          portableFile,
          void 0,
          `Server "${name}" isn't node running server/index.mjs with \`cwd: "."\`.`,
          "Use `command`, `args` and `cwd` as the template does."
        );
      }
    }
  }
  return local ? checkServer(pluginDir, root, report2) : null;
}
function kebab(event) {
  return event.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
function checkHookConfig(config, file, registered, report2) {
  for (const [event, groups] of Object.entries(config.hooks ?? {})) {
    for (const group of groups) {
      for (const handler of group.hooks ?? []) {
        const match = /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/([a-z0-9-]+\.mjs)"$/.exec(
          String(handler.command ?? "")
        );
        if (!match) {
          report2.add(
            "HOOK_COMMAND",
            file,
            void 0,
            `A ${event} hook isn't \`node "\${CLAUDE_PLUGIN_ROOT}/hooks/<file>.mjs"\`.`,
            "Run a hook script with node from the plugin root; Codex fills in the same variable."
          );
          continue;
        }
        const script = match[1] ?? "";
        registered.add(script);
        if (!script.startsWith(`${kebab(event)}-`)) {
          report2.add(
            "NAME_HOOK",
            file,
            void 0,
            `Hook ${script} doesn't start with its event, ${kebab(event)}.`,
            `Rename it to ${kebab(event)}-<what>.mjs.`
          );
        }
        if (typeof handler.timeout !== "number" || handler.timeout > 5) {
          report2.add(
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
function checkHooks(pluginDir, root, report2) {
  const dir = join5(pluginDir, "hooks");
  if (!existsSync5(dir)) return;
  const configPath = join5(dir, "hooks.json");
  if (!existsSync5(configPath) || !readJson(configPath, root, report2)) {
    report2.add(
      "HOOKS_CONFIG",
      relative5(root, configPath),
      void 0,
      "hooks/ has no valid hooks.json.",
      "Add hooks.json or remove the folder."
    );
    return;
  }
  const registered = /* @__PURE__ */ new Set();
  const byHost = /* @__PURE__ */ new Map();
  for (const name of ["hooks.json", "codex-hooks.json"]) {
    const path = join5(dir, name);
    const config = existsSync5(path) ? readJson(path, root, report2) : null;
    const scripts2 = /* @__PURE__ */ new Set();
    if (config) checkHookConfig(config, relative5(root, path), scripts2, report2);
    for (const script of scripts2) registered.add(script);
    byHost.set(name, scripts2);
  }
  const claudeHooks = [...byHost.get("hooks.json") ?? []].sort().join();
  const codexHooks = [...byHost.get("codex-hooks.json") ?? []].sort().join();
  if (claudeHooks !== codexHooks) {
    report2.add(
      "HOOK_PARITY",
      relative5(root, join5(dir, "codex-hooks.json")),
      void 0,
      "hooks.json and codex-hooks.json don't register the same scripts.",
      "Register every hook script in both, with the event and matcher each host uses."
    );
  }
  const scripts = readdirSync3(dir).filter((n) => n.endsWith(".mjs"));
  for (const name of scripts) {
    const path = join5(dir, name);
    if (!registered.has(name))
      report2.add(
        "HOOK_UNREGISTERED",
        relative5(root, path),
        void 0,
        "Hook script is not registered.",
        "Register it in hooks.json or codex-hooks.json, or delete it."
      );
    const text = readFileSync4(path, "utf8");
    if (/\bfetch\(|node:https?|node:net|node:dgram/.test(text)) {
      report2.add(
        "HOOK_NETWORK",
        relative5(root, path),
        void 0,
        "Hook uses the network.",
        "Hooks make no network calls."
      );
    }
    if (name === "post-tool-use-skill-log.mjs") {
      const canonical = readFileSync4(
        join5(templatesRoot, "plugin", "hooks", `${name}.tmpl`),
        "utf8"
      );
      if (text !== canonical) {
        report2.add(
          "HOOK_SKILL_LOG",
          relative5(root, path),
          void 0,
          "The usage log hook differs from the Sidecut copy.",
          "Copy it again from the sidecut-agentskills template."
        );
      }
    }
  }
  for (const name of registered) {
    if (!scripts.includes(name))
      report2.add(
        "HOOK_MISSING",
        relative5(root, dir),
        void 0,
        `Registered hook ${name} doesn't exist.`,
        "Add the script or remove the entry."
      );
  }
}
function checkEvals(skills, root, report2) {
  const dir = join5(root, "evals");
  const cases = existsSync5(dir) ? readdirSync3(dir).filter((n) => statSync3(join5(dir, n)).isDirectory()) : [];
  for (const name of cases) {
    const where = relative5(root, join5(dir, name));
    const owner = skills.find((s) => name.startsWith(`${s}-`));
    if (!owner && !/^negative-[a-z0-9-]+$/.test(name)) {
      report2.add(
        "EVAL_NAME",
        where,
        void 0,
        "Eval case is not named <skill>-<what> or negative-<what>.",
        "Rename it after the skill it tests."
      );
    }
    const prompt = join5(dir, name, "prompt.md");
    if (!existsSync5(prompt) || !readFileSync4(prompt, "utf8").startsWith("---\n")) {
      report2.add(
        "EVAL_PROMPT",
        where,
        void 0,
        "Eval case has no prompt.md with frontmatter.",
        "Add prompt.md with tags, runs, max_turns and allowed_tools."
      );
    }
    const graders = join5(dir, name, "graders");
    if (!existsSync5(graders) || !readdirSync3(graders).some((g) => g.endsWith(".md"))) {
      report2.add(
        "EVAL_GRADERS",
        where,
        void 0,
        "Eval case has no graders.",
        "Add at least one graders/*.md file."
      );
    }
  }
  if (cases.length > 0 && !cases.some((c) => c.startsWith("negative-"))) {
    report2.add(
      "EVAL_MISSING",
      relative5(root, dir),
      void 0,
      "There is no negative- eval case.",
      "Add evals/negative-<what>/ for a request no skill should answer."
    );
  }
  for (const skill of skills) {
    if (!cases.some((c) => c.startsWith(`${skill}-`))) {
      report2.add(
        "EVAL_MISSING",
        relative5(root, dir),
        void 0,
        `Skill ${skill} has no eval case.`,
        `Add evals/${skill}-<what>/ with a trigger case.`
      );
    }
  }
}
function checkReadme(pluginDir, description, skills, root, report2) {
  const path = join5(pluginDir, "README.md");
  if (!existsSync5(path)) {
    report2.add(
      "README_MISSING",
      relative5(root, path),
      void 0,
      "Plugin has no README.md.",
      "Add it from the template."
    );
    return;
  }
  const file = relative5(root, path);
  const text = readFileSync4(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report2, { skipH1Case: true });
  const h1 = doc.headings.find((h) => h.level === 1);
  const id = relative5(join5(pluginDir, ".."), pluginDir);
  if (h1 && h1.text !== displayNameOf(id))
    report2.add(
      "README_TITLE",
      file,
      h1.line,
      `H1 is not "${displayNameOf(id)}".`,
      "Use the display name."
    );
  if (h1 && paragraphAfter(doc, h1.line)?.text !== description) {
    report2.add(
      "README_DESCRIPTION",
      file,
      h1.line + 2,
      "First paragraph is not the manifest description.",
      "Use the description word for word."
    );
  }
  const found = sections(doc);
  if (found.map((h) => h.text).join("|") !== README_SECTIONS.join("|")) {
    report2.add(
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
      report2.add(
        "README_SKILLS",
        file,
        whatItDoes.line,
        "The skill table doesn't match the skills.",
        "List every skill once, in name order, with its description's first sentence."
      );
    }
  }
  const install = /\n## Install\n([\s\S]*?)(?=\n## |$)/.exec(text)?.[1];
  if (install !== void 0 && !/^```/m.test(install)) {
    const at = found.find((h) => h.text === "Install");
    report2.add(
      "README_INSTALL_BLOCK",
      file,
      at?.line,
      "The Install section has no code block.",
      "Put the install commands in a code block, as the template does."
    );
  }
  if (!text.includes("## License\n\nMIT. See [LICENSE](LICENSE).\n")) {
    report2.add(
      "README_LICENSE",
      file,
      void 0,
      'License section is not "MIT. See [LICENSE](LICENSE)."',
      "Use that line."
    );
  }
}
function checkChangelog(pluginDir, version, root, report2) {
  const path = join5(pluginDir, "CHANGELOG.md");
  if (!existsSync5(path)) {
    report2.add(
      "CHANGELOG_MISSING",
      relative5(root, path),
      void 0,
      "Plugin has no CHANGELOG.md.",
      "Add it."
    );
    return;
  }
  const file = relative5(root, path);
  const text = readFileSync4(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report2, { allowDates: true });
  if (doc.headings[0]?.text !== "Changelog" || doc.headings[0]?.level !== 1) {
    report2.add(
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
      report2.add(
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
        report2.add(
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
    report2.add(
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
      report2.add(
        "CHANGELOG_ORDER",
        file,
        void 0,
        "Entries are not newest first.",
        "Order entries by version, newest first."
      );
  }
}
function checkPlugin(pluginDir, root, report2, repoName) {
  const id = relative5(join5(pluginDir, ".."), pluginDir);
  checkLayout2(pluginDir, root, report2);
  const manifest = checkManifests(pluginDir, id, repoName, root, report2);
  checkApps(pluginDir, id, root, report2);
  const tools = checkMcp(pluginDir, id, root, report2);
  const skills = checkSkills(pluginDir, root, report2, tools, id, brandColorOf(pluginDir));
  checkHooks(pluginDir, root, report2);
  if (repoName)
    checkEvals(
      skills.map((s) => s.name),
      root,
      report2
    );
  const version = typeof manifest?.version === "string" ? manifest.version : null;
  checkReadme(pluginDir, String(manifest?.description ?? ""), skills, root, report2);
  if (version) checkChangelog(pluginDir, version, root, report2);
  for (const path of listFiles(pluginDir)) {
    if (path.endsWith(".md") && !path.includes("/skills/") && !/\/(README|CHANGELOG)\.md$/.test(path)) {
      const text = readFileSync4(path, "utf8");
      checkMarkdown(parseMarkdown(path, text), text, root, report2);
    }
  }
  return { version };
}

// plugins/sidecut-agentskills/server/src/check/sync.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync2, readFileSync as readFileSync5, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname3, join as join6 } from "node:path";
var OWNED_FILES = [
  "CLAUDE.md",
  "VOICE.md",
  "scripts/eval.mjs",
  "scripts/build-server.ts",
  "scripts/release.ts"
];
function pluginOwnedFile(id) {
  return `plugins/${id}/${OWNER_INPUT_PATH}`;
}
var BLOCK_FILES = [".gitignore", "AGENTS.md", "SECURITY.md"];
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
var MARK = /^(?:<!--|#) sidecut:(start|end) ([\w-]+)(?: -->)?$/;
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
function mergeBlocks(current, template, file) {
  const crlf = current.includes("\r\n");
  const want = template.split("\n");
  let have = current.replaceAll("\r\n", "\n").split("\n");
  const templateBlocks = blocksOf(want);
  if (typeof templateBlocks === "string") throw new Error(`Template ${file}: ${templateBlocks}`);
  for (const block of templateBlocks) {
    const found = blocksOf(have);
    if (typeof found === "string")
      return { error: `The sidecut markers in ${file} are broken: ${found}.` };
    const body = want.slice(block.start, block.end + 1);
    const same = found.find((b) => b.name === block.name);
    if (same) {
      have = [...have.slice(0, same.start), ...body, ...have.slice(same.end + 1)];
      continue;
    }
    const anchor = want.slice(0, block.start).reverse().find((line) => line.trim() !== "" && !MARK.test(line));
    let at = anchor === void 0 ? -1 : have.indexOf(anchor);
    if (at < 0 && file.endsWith(".md")) at = have.findIndex((line) => line.startsWith("# "));
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
function planPackage(root, vars) {
  const path = join6(root, "package.json");
  if (!existsSync6(path)) return null;
  const text = readFileSync5(path, "utf8");
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
  if (newer(npm(template.packageManager), npm(pkg.packageManager))) {
    pkg.packageManager = template.packageManager;
    raised.push(template.packageManager);
  }
  const dev = pkg.devDependencies ?? {};
  for (const name of SHARED_TOOLS) {
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
function planSync(root, vars, kept = () => false) {
  const changes = [];
  const render2 = (file) => renderFile(`repo/${file}.tmpl`, {
    id: vars.id,
    repo: vars.repo,
    displayName: displayNameOf(vars.id)
  });
  const guide = pluginOwnedFile(vars.id);
  for (const file of [...OWNED_FILES, guide]) {
    if (kept(file)) continue;
    const want = file === guide ? ownerInput() : render2(file);
    const path = join6(root, file);
    const have = existsSync6(path) ? readFileSync5(path, "utf8") : null;
    if (have !== want)
      changes.push({
        file,
        what: have === null ? `${file} is missing.` : `${file} differs from the Sidecut copy.`,
        next: want
      });
  }
  for (const file of BLOCK_FILES) {
    if (kept(file)) continue;
    const path = join6(root, file);
    const template = render2(file);
    if (!existsSync6(path)) {
      changes.push({ file, what: `${file} is missing.`, next: template });
      continue;
    }
    const have = readFileSync5(path, "utf8");
    const merged = mergeBlocks(have, template, file);
    if ("error" in merged)
      changes.push({ file, what: `${merged.error} Fix them by hand.`, next: null });
    else if (merged.text !== have)
      changes.push({
        file,
        what: `The Sidecut blocks in ${file} are out of date.`,
        next: merged.text
      });
  }
  if (!kept("package.json")) {
    const pkg = planPackage(root, vars);
    if (pkg) changes.push(pkg);
  }
  return changes;
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
  "solo-workflow.toml",
  "tests",
  "evals",
  "tsconfig.json"
];
var OPTIONAL_ENTRIES = [
  ".git",
  "node_modules",
  "vitest.config.ts",
  "bin",
  "VOICE.md",
  "RELEASING.md",
  "docs",
  ".claude-plugin",
  ".agents"
];
var MARKETPLACES = [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"];
var CHECK_STEPS = [
  "biome check .",
  "tsc --noEmit",
  "npm run style",
  "npm test",
  "node scripts/build-server.ts --check"
];
function inOrder(script, steps) {
  let at = 0;
  for (const step of script.split("&&").map((s) => s.trim())) if (step === steps[at]) at++;
  return at === steps.length;
}
var AGENTS_SECTIONS = ["Commands", "Layout", "Rules"];
function ignoredBy(patterns, name) {
  return patterns.some((p) => {
    const clean = p.replace(/\/$/, "");
    if (clean.includes("*"))
      return new RegExp(`^${clean.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`).test(name);
    return clean === name;
  });
}
function git(root, ...args) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))
  );
  const result = spawnSync2("git", args, { cwd: root, env, encoding: "utf8" });
  return result.status === 0 ? result.stdout : void 0;
}
var isRealDir = (path) => {
  const stat = lstatSync(path);
  return stat.isDirectory() && !stat.isSymbolicLink();
};
var HOST_FOLDERS = [".claude", ".codex"];
function onlyHostState(root, folder) {
  const dir = join7(root, folder);
  if (!isRealDir(dir)) return false;
  const top = git(root, "rev-parse", "--show-toplevel")?.trim();
  if (!top || realpathSync(top) !== realpathSync(root)) return false;
  if (git(root, "ls-files", "-z", "--", folder) !== "") return false;
  const registered = new Set(
    (git(root, "worktree", "list", "--porcelain", "-z") ?? "").split("\0").filter((line) => line.startsWith("worktree ")).flatMap((line) => {
      const path = line.slice("worktree ".length);
      return existsSync7(path) ? [realpathSync(path)] : [];
    })
  );
  return readdirSync4(dir).every((name) => {
    const path = join7(dir, name);
    if (folder === ".claude" && name === "worktrees" && isRealDir(path))
      return readdirSync4(path).every(
        (tree) => isRealDir(join7(path, tree)) && registered.has(realpathSync(join7(path, tree)))
      );
    return git(root, "check-ignore", "-q", "--", `${folder}/${name}`) !== void 0;
  });
}
function checkCheckerVersion(root, report2) {
  const read = (path) => {
    try {
      return JSON.parse(readFileSync6(join7(root, path), "utf8"));
    } catch {
      return null;
    }
  };
  const pinned = /#v(\d+\.\d+\.\d+)$/.exec(
    read("package.json")?.devDependencies?.["sidecut-agentskills"] ?? ""
  )?.[1];
  const installed = read("node_modules/sidecut-agentskills/package.json")?.version;
  if (pinned && installed && pinned !== installed)
    report2.add(
      "REPO_CHECKER_VERSION",
      "package.json",
      void 0,
      `package.json pins sidecut-agentskills v${pinned}, but node_modules holds v${installed}, so \`npm run style\` can differ from CI.`,
      "Run `npm install`, then check again."
    );
}
function checkTopLevel(root, report2) {
  const gitignore = existsSync7(join7(root, ".gitignore")) ? readFileSync6(join7(root, ".gitignore"), "utf8").split("\n").filter(Boolean) : [];
  const entries = readdirSync4(root).filter(
    (n) => !ignoredBy(gitignore, n) && !(HOST_FOLDERS.includes(n) && onlyHostState(root, n))
  );
  for (const name of entries) {
    if (!REQUIRED_ENTRIES.includes(name) && !OPTIONAL_ENTRIES.includes(name)) {
      report2.add(
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
      report2.add(
        "REPO_ENTRY_MISSING",
        name,
        void 0,
        `"${name}" is missing.`,
        "Add it from the template."
      );
  }
}
function checkLicense(root, report2) {
  const license = existsSync7(join7(root, "LICENSE")) ? readFileSync6(join7(root, "LICENSE"), "utf8") : "";
  if (!/^MIT License\n\nCopyright \(c\) \d{4} Sidecut Studio\n/.test(license)) {
    report2.add(
      "REPO_LICENSE",
      "LICENSE",
      1,
      'LICENSE is not MIT with "Copyright (c) <year> Sidecut Studio".',
      "Copy the template LICENSE."
    );
  }
}
function checkPackage(root, id, version, report2) {
  const path = join7(root, "package.json");
  if (!existsSync7(path)) return {};
  const pkg = JSON.parse(readFileSync6(path, "utf8"));
  if (pkg.name !== id)
    report2.add(
      "REPO_PACKAGE_NAME",
      "package.json",
      void 0,
      `Name is not "${id}".`,
      "Use the plugin id."
    );
  if (version && pkg.version !== version) {
    report2.add(
      "VERSION_SYNC",
      "package.json",
      void 0,
      `Version is ${pkg.version}, the manifests say ${version}.`,
      "Make them the same."
    );
  }
  if (!/^npm@\d+\.\d+\.\d+$/.test(String(pkg.packageManager ?? ""))) {
    report2.add(
      "REPO_PACKAGE_MANAGER",
      "package.json",
      void 0,
      "`packageManager` is not a pinned npm@x.y.z.",
      "Set it, for example `npm@11.19.1`."
    );
  }
  const scripts = pkg.scripts ?? {};
  if (!inOrder(scripts.check ?? "", CHECK_STEPS)) {
    report2.add(
      "REPO_CHECK_SCRIPT",
      "package.json",
      void 0,
      "`check` leaves out a standard step or changes their order.",
      `Run these in this order, adding the repo's own steps anywhere: \`${CHECK_STEPS.join(" && ")}\`.`
    );
  }
  if (!scripts.style)
    report2.add(
      "REPO_STYLE_SCRIPT",
      "package.json",
      void 0,
      "There is no `style` script.",
      'Add `"style": "sidecut-check"`.'
    );
  if (!inOrder(scripts.build ?? "", ["node scripts/build-server.ts"]))
    report2.add(
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
      report2.add(
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
function checkAgents(root, id, scripts, report2) {
  const path = join7(root, "AGENTS.md");
  if (!existsSync7(path)) return;
  const text = readFileSync6(path, "utf8");
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report2, { skipH1Case: true });
  const h1 = doc.headings.find((h) => h.level === 1);
  if (h1?.text !== id)
    report2.add("AGENTS_TITLE", "AGENTS.md", h1?.line, `H1 is not "${id}".`, `Use \`# ${id}\`.`);
  const found = sections(doc).map((h) => h.text);
  const before = found.filter((s) => s !== "Sidecut Solo" && s !== "Solo Workflow");
  if (before.join("|") !== AGENTS_SECTIONS.join("|")) {
    report2.add(
      "AGENTS_SECTIONS",
      "AGENTS.md",
      void 0,
      "Sections are not Commands, Layout, Rules.",
      "Use exactly those, then the Sidecut Solo section."
    );
  }
  if (!/<!-- solo-workflow:start -->[\s\S]*<!-- solo-workflow:end -->\n$/.test(text)) {
    report2.add(
      "AGENTS_SOLO",
      "AGENTS.md",
      void 0,
      "AGENTS.md does not end with the Sidecut Solo markers.",
      "Run solo-configure-project."
    );
  }
  const commands = sections(doc).find((h) => h.text === "Commands");
  if (commands) {
    const rows = tableAfter(doc, commands).slice(1).map((r) => r[0] ?? "");
    const want = Object.keys(scripts).map((s) => `\`npm run ${s}\``);
    if (rows.join() !== want.join()) {
      report2.add(
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
    report2.add(
      "AGENTS_LAYOUT",
      "AGENTS.md",
      layout.line,
      "Layout has no `text` tree.",
      "Add a `text` fence with the top two levels."
    );
  }
}
function checkCi(root, report2) {
  const dir = join7(root, ".github", "workflows");
  if (!existsSync7(join7(dir, "check.yml"))) {
    report2.add(
      "CI_MISSING",
      ".github/workflows/check.yml",
      void 0,
      "There is no check workflow.",
      "Copy check.yml from the template."
    );
  }
  if (!existsSync7(join7(dir, "release.yml"))) {
    report2.add(
      "CI_RELEASE",
      ".github/workflows/release.yml",
      void 0,
      "There is no release workflow.",
      "Copy release.yml from the template, so merging a version bump publishes it."
    );
  }
  if (!existsSync7(dir)) return;
  for (const name of readdirSync4(dir)) {
    const file = `.github/workflows/${name}`;
    const text = readFileSync6(join7(dir, name), "utf8");
    text.split("\n").forEach((line, i) => {
      const uses = /uses:\s*([^\s#]+)/.exec(line)?.[1];
      if (uses && !uses.startsWith("./") && !/@[0-9a-f]{40}$/.test(uses)) {
        report2.add(
          "CI_PIN",
          file,
          i + 1,
          `${uses} is not pinned by full SHA.`,
          "Pin the action to a 40-character commit SHA."
        );
      }
      if (/runs-on:.*(macos|windows)/i.test(line)) {
        report2.add(
          "CI_RUNNER",
          file,
          i + 1,
          "Job runs on hosted macOS or Windows.",
          "Use `ubuntu-24.04` in a public repo, or the sidecut-ops runner picker in a private one."
        );
      }
      if (/node-version:\s*(?:latest|node|\*)\s*$/.test(line))
        report2.add(
          "CI_NODE",
          file,
          i + 1,
          "Node version is not pinned.",
          "Pin an exact Node.js version."
        );
    });
  }
  for (const name of readdirSync4(dir)) {
    const file = `.github/workflows/${name}`;
    for (const line of bunlessToolSteps(readFileSync6(join7(dir, name), "utf8"))) {
      report2.add(
        "CI_TOOLS",
        file,
        line,
        "sidecut-ops' setup-ci-tools runs on Bun, and this job doesn't install Bun.",
        "Download the tool's pinned build and check its checksum from sidecut-ops' tools.json, as the template does."
      );
    }
  }
  const check = existsSync7(join7(dir, "check.yml")) ? readFileSync6(join7(dir, "check.yml"), "utf8") : "";
  const hostedOnly = isHostedOnly(check);
  const release = existsSync7(join7(dir, "release.yml")) ? readFileSync6(join7(dir, "release.yml"), "utf8") : "";
  if (hostedOnly && /self-hosted|SidecutStudio\/sidecut-ops\/\.github\/actions\//.test(release)) {
    report2.add(
      "CI_RELEASE",
      ".github/workflows/release.yml",
      void 0,
      "A public repo releases on a self-hosted runner or with a private sidecut-ops action.",
      "Run the release job on `ubuntu-24.04` with no sidecut-ops action; gh is already there."
    );
  }
  if (check && !check.includes("/pick-runner@") && !hostedOnly) {
    report2.add(
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
function isHostedOnly(workflow) {
  const jobs = jobsOf(workflow);
  return jobs.length > 0 && jobs.every((job) => job.runsOn === "ubuntu-24.04");
}
function filesUnder(root, dir, ignored) {
  const path = join7(root, dir);
  if (!existsSync7(path)) return [];
  if (!lstatSync(path).isDirectory()) return [dir];
  return readdirSync4(path).filter((name) => name !== ".DS_Store" && !ignoredBy(ignored, name)).flatMap((name) => filesUnder(root, `${dir}/${name}`, ignored));
}
function checkInstallSource(root, id, repo, report2) {
  const check = join7(root, ".github", "workflows", "check.yml");
  const isPublic = existsSync7(check) && isHostedOnly(readFileSync6(check, "utf8"));
  const gitignore = existsSync7(join7(root, ".gitignore")) ? readFileSync6(join7(root, ".gitignore"), "utf8").split("\n").filter(Boolean) : [];
  const found = [".claude-plugin", ".agents"].flatMap((dir) => filesUnder(root, dir, gitignore));
  const extra = found.filter((f) => !MARKETPLACES.includes(f));
  for (const file of extra)
    report2.add(
      "REPO_MARKETPLACE",
      file,
      void 0,
      `"${file}" isn't part of the repo layout; the root .claude-plugin/ and .agents/ hold only a public repo's marketplace files.`,
      "Move it into the plugin, or remove it."
    );
  if (!isPublic) {
    for (const file of found.filter((f) => MARKETPLACES.includes(f)))
      report2.add(
        "REPO_MARKETPLACE",
        file,
        void 0,
        "A private repo has its own marketplace.",
        "List the plugin from the sidecut-plugins marketplace only; a public repo, whose jobs all run on ubuntu-24.04, keeps one."
      );
    return;
  }
  const [claudeFile, codexFile] = MARKETPLACES;
  const how = "Write it as the house style's Install source section shows.";
  for (const file of MARKETPLACES) {
    if (!existsSync7(join7(root, file)))
      report2.add(
        "REPO_MARKETPLACE",
        file,
        void 0,
        `A public repo has no ${file}, so only people with access to the private sidecut-plugins marketplace can install it.`,
        how
      );
  }
  const only = (file, source) => {
    if (!existsSync7(join7(root, file))) return;
    const marketplace = readJson2(join7(root, file));
    const plugins = marketplace.plugins;
    const ok = marketplace.name === id && Array.isArray(plugins) && plugins.length === 1 && plugins[0]?.name === id && source(plugins[0]);
    if (!ok)
      report2.add(
        "REPO_MARKETPLACE",
        file,
        void 0,
        `${file} doesn't list only plugins/${id} under the marketplace name ${id}.`,
        how
      );
  };
  const path = `./plugins/${id}`;
  only(claudeFile, (entry) => entry.source === path);
  only(codexFile, (entry) => {
    const source = entry.source;
    return source?.source === "local" && source.path === path;
  });
  const readme = existsSync7(join7(root, "README.md")) ? readFileSync6(join7(root, "README.md"), "utf8") : "";
  const install = /\n## Install\n([\s\S]*?)(?=\n## |$)/.exec(readme)?.[1] ?? "";
  const add = `marketplace add SidecutStudio/${repo}`;
  const named = new Set(
    [...install.matchAll(/plugin (?:install|add) [\w.-]+@([\w.-]+)/g)].map((m) => m[1])
  );
  const added = new Set(
    [...install.matchAll(/plugin marketplace add (\S+)/g)].map((m) => m[1]?.replace(/`$/, ""))
  );
  for (const source of added) {
    if (source !== `SidecutStudio/${repo}`)
      report2.add(
        "README_INSTALL",
        "README.md",
        void 0,
        `The Install section adds the marketplace ${source}, which isn't this repo.`,
        `Add \`SidecutStudio/${repo}\` instead.`
      );
  }
  for (const marketplace of named) {
    if (marketplace !== id)
      report2.add(
        "README_INSTALL",
        "README.md",
        void 0,
        `The Install section installs from ${marketplace}, a marketplace this public repo doesn't provide.`,
        `Install ${id}@${id} after \`/plugin ${add}\` in Claude Code and \`codex plugin ${add}\` in Codex.`
      );
  }
  const steps = [
    `/plugin ${add}`,
    `/plugin install ${id}@${id}`,
    `codex plugin ${add}`,
    `codex plugin add ${id}@${id}`
  ];
  const lines = new Set(install.split("\n").map((line) => line.replace(/\s+#.*$/, "").trim()));
  const missing = steps.filter((step) => !lines.has(step));
  if (missing.length > 0)
    report2.add(
      "README_INSTALL",
      "README.md",
      void 0,
      `The Install section is missing ${missing.map((step) => `\`${step}\``).join(", ")}.`,
      "Use the public install steps from the house style's Install source section."
    );
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
    }
  }
  return jobs;
}
function checkSolo(root, report2) {
  const path = join7(root, "solo-workflow.toml");
  if (!existsSync7(path)) return;
  if (!/required_checks\s*=\s*\[[^\]]*"check"/.test(readFileSync6(path, "utf8"))) {
    report2.add(
      "SOLO_REQUIRED",
      "solo-workflow.toml",
      void 0,
      '`required_checks` does not include "check".',
      'Add "check" to required_checks.'
    );
  }
}
function readJson2(path) {
  try {
    return JSON.parse(readFileSync6(path, "utf8"));
  } catch {
    return {};
  }
}
function identify(root) {
  const pluginsDir = join7(root, "plugins");
  const plugins = existsSync7(pluginsDir) ? readdirSync4(pluginsDir).filter((n) => n !== ".DS_Store") : [];
  const only = plugins.length === 1 ? plugins[0] ?? "" : "";
  const manifest = readJson2(join7(pluginsDir, only, ".claude-plugin", "plugin.json"));
  const pkg = readJson2(join7(root, "package.json"));
  const repo = /^https:\/\/github\.com\/SidecutStudio\/([\w.-]+)$/.exec(
    String(manifest.repository ?? "")
  )?.[1] ?? "";
  const keep = pkg.sidecut?.keep ?? {};
  const olderName = only === `sidecut-${repo}` && pkg.name === only;
  const renamed = pkg.name === only && Object.hasOwn(keep, "REPO_PLUGIN_ID");
  if (only && repo && (repo === only || olderName || renamed))
    return { plugins, id: only, repo, scope: `Checked the whole repo for ${only}.`, keep };
  const scope = !only ? `Checked ${plugins.length} plugins only: the repo holds ${plugins.length === 0 ? "none" : "more than one"}.` : `Checked the plugin only: its manifest points at ${repo || "no SidecutStudio repo"}, not a repo that exists only for ${only}.`;
  return { plugins, id: null, repo, scope, keep };
}
function checkRepo(root, report2) {
  const pluginsDir = join7(root, "plugins");
  if (!existsSync7(pluginsDir)) {
    report2.add(
      "REPO_NO_PLUGINS",
      "plugins",
      void 0,
      "There is no plugins/ folder.",
      "Put the plugin in plugins/<plugin-id>/."
    );
    return;
  }
  const { plugins, id: only, repo: repoName, scope, keep } = identify(root);
  report2.scope = scope;
  if (!only) {
    for (const id2 of plugins) checkPlugin(join7(pluginsDir, id2), root, report2, null);
    report2.applyKeep(keep);
    return;
  }
  const id = only;
  const pluginDir = join7(pluginsDir, id);
  if (repoName !== id && id !== `sidecut-${repoName}`)
    report2.add(
      "REPO_PLUGIN_ID",
      "package.json",
      void 0,
      `Plugin ${id} retains the repository name ${repoName}.`,
      "Keep REPO_PLUGIN_ID with the reason for retaining the repository name."
    );
  const { version } = checkPlugin(pluginDir, root, report2, repoName);
  checkTopLevel(root, report2);
  checkLicense(root, report2);
  const scripts = checkPackage(root, id, version, report2);
  checkCheckerVersion(root, report2);
  checkAgents(root, id, scripts, report2);
  checkCi(root, report2);
  checkInstallSource(root, id, repoName, report2);
  checkSolo(root, report2);
  for (const name of ["README.md", "LICENSE", "CHANGELOG.md"]) {
    const a = join7(root, name);
    const b = join7(pluginDir, name);
    if (existsSync7(a) && existsSync7(b) && readFileSync6(a, "utf8") !== readFileSync6(b, "utf8")) {
      report2.add(
        "REPO_COPY",
        name,
        void 0,
        `${name} differs from plugins/${id}/${name}.`,
        "Keep the two copies identical."
      );
    }
  }
  for (const change of planSync(root, { id, repo: repoName, version: ownVersion }))
    report2.add(
      "REPO_SYNC",
      change.file,
      void 0,
      change.what,
      "Run `npm exec --no -- sidecut-sync`. If this repo got it right, change the template in sidecut-agentskills instead."
    );
  const security = join7(root, "SECURITY.md");
  if (existsSync7(security)) {
    const text = readFileSync6(security, "utf8");
    checkMarkdown(parseMarkdown(security, text), text, root, report2);
  }
  report2.applyKeep(keep);
}

// scripts/check.ts
var usage = `Usage: sidecut-check [<repo>] [--json]

Checks a plugin repo against the Sidecut house style. Exits 1 when it finds a problem.`;
var { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { json: { type: "boolean" }, help: { type: "boolean" } }
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
var report = new Report();
checkRepo(resolve(positionals[0] ?? "."), report);
if (values.json)
  console.log(
    JSON.stringify(
      {
        scope: report.scope,
        problems: report.problems,
        advisories: report.advisories,
        kept: report.kept
      },
      null,
      2
    )
  );
else {
  console.log(report.scope);
  for (const p of report.advisories) console.log("Advisory: " + p.file + ": " + p.message);
  for (const p of report.kept) console.log(`Kept on purpose: ${p.code} ${p.file} (${p.reason})`);
  console.log(
    report.problems.length === 0 ? "House style: no problems." : `${report.format()}

${report.problems.length} problems.`
  );
}
process.exit(report.problems.length === 0 ? 0 : 1);
