#!/usr/bin/env node

// scripts/sync.ts
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

// plugins/sidecut-agentskills/server/src/check/repo.ts
import { existsSync as existsSync6, lstatSync, readdirSync as readdirSync4, readFileSync as readFileSync6, realpathSync } from "node:fs";
import { join as join6 } from "node:path";

// plugins/sidecut-agentskills/server/src/scaffold.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readdirSync as readdirSync2, readFileSync as readFileSync3, statSync, writeFileSync as writeFileSync2 } from "node:fs";
import { basename, dirname as dirname2, join as join3 } from "node:path";
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
function antigravityHooks() {
  return {
    "skill-log": {
      PostToolUse: [
        {
          matcher: "read_file|view_file|run_command",
          hooks: [
            {
              type: "command",
              command: `node ./hooks/${SKILL_LOG_HOOK}`,
              timeout: 5
            }
          ]
        }
      ]
    }
  };
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
function antigravityFilesFrom(read) {
  const parse = (path) => {
    const text = read(path);
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
  if (!mcp && read(".mcp.json") !== null) return null;
  const hasSkillLog = read(`hooks/${SKILL_LOG_HOOK}`) !== null;
  return [
    { path: ANTIGRAVITY_MANIFEST, text: formatJson(antigravityManifest(claude, codex)) },
    { path: ANTIGRAVITY_MCP, text: mcp ? formatJson(antigravityMcp(mcp)) : null },
    { path: ANTIGRAVITY_HOOKS, text: hasSkillLog ? formatJson(antigravityHooks()) : null }
  ];
}
function antigravityFiles(pluginDir) {
  return antigravityFilesFrom((path) => {
    const full = join(pluginDir, path);
    return existsSync(full) ? readFileSync(full, "utf8") : null;
  });
}

// plugins/sidecut-agentskills/server/src/check/report.ts
function keepCovers(key, code, file) {
  return key === code || key === file || file.startsWith(`${key}/`) || key === `${code} ${file}`;
}

// plugins/sidecut-agentskills/server/src/sidecut-profile.ts
var SOLO_LOCAL_FILE = "solo-workflow.local.toml";
var SOLO_START = "<!-- solo-workflow:start -->";
var SOLO_END = "<!-- solo-workflow:end -->";
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
  workflow: "solo"
};
var SIDECUT_OWNER = SIDECUT_SETTINGS.org;
var SIDECUT_CI_SNIPPETS = {
  ciLightRunner: `'{"group":"sidecut-linux-x64","labels":["self-hosted","Linux","X64","sidecut-light"]}'`,
  ciReleaseLabels: "[self-hosted, Linux, X64, sidecut-ci]",
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
  ciAppKey: "${{ secrets.SIDECUT_CI_APP_KEY }}"
};

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

// plugins/sidecut-agentskills/server/src/settings.ts
import { existsSync as existsSync2, mkdirSync, readdirSync, readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join as join2 } from "node:path";
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
  workflow: ""
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
  if (!existsSync2(path)) return null;
  try {
    return cleanSettings(JSON.parse(readFileSync2(path, "utf8")));
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
  return readInput(join2(root2, REPO_FILE));
}
function inferRepoSettings(root2) {
  const plugins = join2(root2, "plugins");
  const ids = existsSync2(plugins) ? readdirSync(plugins).filter((n) => n !== ".DS_Store") : [];
  for (const id2 of ids) {
    try {
      const manifest = JSON.parse(
        readFileSync2(join2(plugins, id2, ".claude-plugin", "plugin.json"), "utf8")
      );
      const owner = /^https:\/\/github\.com\/([\w.-]+)\//.exec(
        String(manifest.repository ?? "")
      )?.[1];
      if (!owner) continue;
      if (owner === SIDECUT_OWNER) return { profile: "sidecut" };
      const check = join2(root2, ".github", "workflows", "check.yml");
      const picker = existsSync2(check) && readFileSync2(check, "utf8").includes("/pick-runner@");
      return cleanSettings({
        org: owner,
        authorName: manifest.author?.name,
        authorUrl: manifest.author?.url,
        homepage: manifest.homepage,
        ci: picker ? "sidecut" : "hosted"
      });
    } catch {
    }
  }
  return {};
}
function repoSettings(root2) {
  return mergeSettings(readRepoSettings(root2) ?? inferRepoSettings(root2));
}
var active = mergeSettings();
function current() {
  return active;
}
var QUESTIONS = [
  {
    key: "profile",
    ask: `Start from a saved profile? Answer "sidecut" for Sidecut Studio's values, or leave it empty and answer the rest.`,
    default: ""
  },
  { key: "org", ask: "Which GitHub user or organization will hold the repo?", default: "" },
  { key: "authorName", ask: "Whose name goes in the manifests and the licence?", default: "" },
  { key: "authorUrl", ask: "The author's web address, if any?", default: "" },
  { key: "homepage", ask: "The plugin's homepage, if any?", default: "" },
  {
    key: "prefix",
    ask: 'A prefix for every plugin id, such as "acme-", or none?',
    default: DEFAULTS.prefix
  },
  {
    key: "marketplace",
    ask: "Which marketplace lists the plugin: its own repo (leave empty), or another repo as owner/repo?",
    default: DEFAULTS.marketplace
  },
  {
    key: "ci",
    ask: `Where does CI run: "hosted" (GitHub-hosted ubuntu-24.04), or "sidecut" for the sidecut profile's own runners?`,
    default: DEFAULTS.ci
  }
];
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function brandSpace(s = active) {
  return s.brand ? `${s.brand} ` : "";
}
function marketplaceName(id2, s = active) {
  return s.marketplace ? s.marketplace.split("/")[1] ?? s.marketplace : id2;
}

// plugins/sidecut-agentskills/server/src/scaffold.ts
var here = dirname2(fileURLToPath(import.meta.url));
var dataRoot = existsSync3(join3(here, "data")) ? join3(here, "data") : existsSync3(join3(here, "..", "data")) ? join3(here, "..", "data") : join3(here, "..", "plugins", "sidecut-agentskills", "server", "data");
var templatesRoot = join3(dataRoot, "templates");
var USER_INPUT_PATH = "server/data/user-input.md";
var OLD_USER_INPUT_PATH = "server/data/owner-input.md";
function userInput() {
  return readFileSync3(join3(dataRoot, "user-input.md"), "utf8");
}
var ownVersion = JSON.parse(readFileSync3(join3(dataRoot, "..", "..", ".claude-plugin", "plugin.json"), "utf8")).version;
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
function render(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key] ?? CI_SNIPPETS[key];
    if (value === void 0) throw new Error(`Template uses unknown variable ${match}`);
    return value;
  });
}
function renderFile(path, vars) {
  return render(readFileSync3(join3(templatesRoot, path), "utf8"), vars);
}
function settingsVars(id2, s = current()) {
  const brand = brandSpace(s);
  const market = marketplaceName(id2, s);
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
${SOLO_LOCAL_FILE}` : ""
  };
}

// plugins/sidecut-agentskills/server/src/check/server.ts
import { existsSync as existsSync4, mkdtempSync, readFileSync as readFileSync4, rmSync } from "node:fs";
import { join as join4, relative } from "node:path";
var ESBUILD = /"esbuild": "([^"]+)"/.exec(
  readFileSync4(join4(templatesRoot, "repo", "package.json.tmpl"), "utf8")
)?.[1] ?? "";

// plugins/sidecut-agentskills/server/src/check/sync.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync3, readdirSync as readdirSync3, readFileSync as readFileSync5, rmSync as rmSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname as dirname3, join as join5 } from "node:path";
var OWNED_FILES = [
  "CLAUDE.md",
  "VOICE.md",
  "scripts/eval.mjs",
  "scripts/build-server.ts",
  "scripts/release.ts"
];
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
var MARK = /^(?:<!--|#|\/\/) sidecut:(start|end) ([\w-]+)(?: -->)?$/;
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
function planPackage(root2, vars, pinOnly) {
  const path = join5(root2, "package.json");
  if (!existsSync5(path)) return null;
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
  if (!pinOnly && newer(npm(template.packageManager), npm(pkg.packageManager))) {
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
function planSync(root2, vars, kept = () => false) {
  const changes2 = [];
  const settings = settingsVars(vars.id, repoSettings(root2));
  const render2 = (file) => renderFile(`repo/${file}.tmpl`, {
    ...settings,
    id: vars.id,
    repo: vars.repo,
    displayName: displayNameOf(vars.id)
  });
  const guide = pluginOwnedFile(vars.id);
  const beside = vars.scope === "beside";
  const applies = (file) => !beside || file === guide && existsSync5(join5(root2, file)) || file === "scripts/eval.mjs" && existsSync5(join5(root2, "evals"));
  for (const file of [...OWNED_FILES, guide].filter(applies)) {
    if (kept(file)) continue;
    const want = file === guide ? userInput() : render2(file);
    const path = join5(root2, file);
    const have = existsSync5(path) ? readFileSync5(path, "utf8") : null;
    if (have !== want)
      changes2.push({
        file,
        what: have === null ? `${file} is missing.` : `${file} differs from the template copy.`,
        next: want
      });
  }
  const hook = `plugins/${vars.id}/hooks/${SKILL_LOG_HOOK}`;
  if (!kept(hook, "HOOK_SKILL_LOG") && existsSync5(join5(root2, hook))) {
    const want = renderFile(`plugin/hooks/${SKILL_LOG_HOOK}.tmpl`, settings);
    if (readFileSync5(join5(root2, hook), "utf8") !== want)
      changes2.push({
        file: hook,
        what: `${hook} differs from the template copy.`,
        next: want,
        code: "HOOK_SKILL_LOG"
      });
  }
  for (const { path, text } of antigravityFiles(join5(root2, "plugins", vars.id)) ?? []) {
    const file = `plugins/${vars.id}/${path}`;
    const have = existsSync5(join5(root2, file)) ? readFileSync5(join5(root2, file), "utf8") : null;
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
    const have = readFileSync5(join5(root2, file), "utf8");
    changes2.push({
      file,
      what: `${file} points at ${OLD_USER_INPUT_PATH}, now ${USER_INPUT_PATH}.`,
      next: have.replaceAll(OLD_USER_INPUT_PATH, USER_INPUT_PATH)
    });
  }
  for (const file of [...BLOCK_FILES, SETUP_FILE]) {
    if (kept(file)) continue;
    const path = join5(root2, file);
    if (file === SETUP_FILE && !existsSync5(path)) continue;
    if (beside && file !== SETUP_FILE && !(existsSync5(path) && hasBlocks(readFileSync5(path, "utf8"))))
      continue;
    const template = render2(file);
    if (!existsSync5(path)) {
      changes2.push({ file, what: `${file} is missing.`, next: template });
      continue;
    }
    const have = readFileSync5(path, "utf8");
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
    (file) => file !== oldGuide && readFileSync5(join5(root2, file), "utf8").includes(OLD_USER_INPUT_PATH)
  );
  return [...existsSync5(join5(root2, oldGuide)) ? [oldGuide] : [], ...pointers];
}
function markdownUnder(root2, dir) {
  const path = join5(root2, dir);
  if (!existsSync5(path)) return [];
  return readdirSync3(path, { withFileTypes: true }).flatMap((entry) => {
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
    const path = join5(root2, change.file);
    if (change.remove) {
      rmSync2(path, { force: true });
      continue;
    }
    mkdirSync3(dirname3(path), { recursive: true });
    writeFileSync3(path, change.next);
  }
  return left2;
}

// plugins/sidecut-agentskills/server/src/check/test-git-env.ts
var DELETES_BY_NAME = ["GIT_DIR", "GIT_INDEX_FILE"].map(
  (name) => new RegExp(`\\bdelete\\s+process\\.env(?:\\.${name}\\b|\\[\\s*['"\`]${name}['"\`]\\s*\\])`)
);

// plugins/sidecut-agentskills/server/src/check/repo.ts
function readJson(path) {
  try {
    return JSON.parse(readFileSync6(path, "utf8"));
  } catch {
    return {};
  }
}
function identify(root2) {
  const pluginsDir = join6(root2, "plugins");
  const plugins = existsSync6(pluginsDir) ? readdirSync4(pluginsDir).filter((n) => n !== ".DS_Store") : [];
  const only = plugins.length === 1 ? plugins[0] ?? "" : "";
  const manifest = readJson(join6(pluginsDir, only, ".claude-plugin", "plugin.json"));
  const pkg = readJson(join6(root2, "package.json"));
  const settings = repoSettings(root2);
  const owner = settings.org ? escapeRegExp(settings.org) : "[\\w.-]+";
  const repo = new RegExp(`^https:\\/\\/github\\.com\\/${owner}\\/([\\w.-]+)$`).exec(
    String(manifest.repository ?? "")
  )?.[1] ?? "";
  const keep = pkg.sidecut?.keep ?? {};
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

// scripts/sync.ts
var usage = `Usage: sidecut-sync [<repo>] [--check] [--force]

Brings a plugin repo up to date with sidecut-agentskills: the files it owns, the blocks marked
sidecut:start, and the shared tool versions in package.json. Uses the installed, pinned version of Agentskills. Paths and rules listed under sidecut.keep in
package.json are left alone.

  --check    change nothing; list what would change and exit 1 if anything would
  --force    also overwrite files with uncommitted changes`;
var { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: "boolean" },
    force: { type: "boolean" },
    help: { type: "boolean" }
  }
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
var root = resolve(positionals[0] ?? ".");
var who = identify(root);
var id = who.id ?? who.plugin;
if (!id) {
  console.log(`Nothing to sync. ${who.scope}`);
  process.exit(0);
}
var scope = who.id ? "whole" : "beside";
if (scope === "beside")
  console.log(
    `Syncing ${id} and the repo files that already follow the template: the repo ships it beside other work.`
  );
if (!values.check && !values.force) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_"))
  );
  const touched = [
    ...OWNED_FILES,
    ...BLOCK_FILES,
    SETUP_FILE,
    pluginOwnedFile(id),
    ...pluginSyncFiles(id),
    ...guideMoveFiles(root, id),
    "package.json",
    "package-lock.json"
  ];
  const dirty = spawnSync("git", ["status", "--porcelain", "--", ...touched], {
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
var keys = Object.keys(who.keep);
var changes = planSync(
  root,
  { id, repo: who.repo, version: ownVersion, scope },
  (file, code) => keys.some(
    (key) => keepCovers(key, "REPO_SYNC", file) || code !== void 0 && keepCovers(key, code, file)
  )
);
if (changes.length === 0) {
  console.log(`Up to date with sidecut-agentskills v${ownVersion}.`);
  process.exit(0);
}
if (values.check) {
  for (const change of changes) console.log(`Would change ${change.file}: ${change.what}`);
  process.exit(1);
}
var left = applySync(root, changes);
for (const change of changes)
  if (change.next !== null) console.log(`Changed ${change.file}: ${change.what}`);
if (changes.some((c) => c.file === "package.json")) {
  const install = spawnSync("npm", ["install"], { cwd: root, stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status ?? 1);
}
if (left.length > 0) {
  console.error(`
${left.map((c) => c.what).join("\n")}`);
  process.exit(1);
}
console.log(
  `
Synced with sidecut-agentskills v${ownVersion}. Review the diff: where this repo was ahead, change the template instead and keep the repo's version under sidecut.keep until it lands.`
);
