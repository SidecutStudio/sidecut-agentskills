#!/usr/bin/env node

// scripts/sync.ts
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

// plugins/sidecut-agentskills/server/src/check/repo.ts
import { existsSync as existsSync3, lstatSync, readdirSync as readdirSync2, readFileSync as readFileSync3, realpathSync } from "node:fs";
import { join as join3 } from "node:path";

// plugins/sidecut-agentskills/server/src/scaffold.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// plugins/sidecut-agentskills/server/src/check/report.ts
function keepCovers(key, code, file) {
  return key === code || key === file || file.startsWith(`${key}/`) || key === `${code} ${file}`;
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

// plugins/sidecut-agentskills/server/src/check/sync.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
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
function planPackage(root2, vars) {
  const path = join2(root2, "package.json");
  if (!existsSync2(path)) return null;
  const text = readFileSync2(path, "utf8");
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
function planSync(root2, vars, kept = () => false) {
  const changes2 = [];
  const render2 = (file) => renderFile(`repo/${file}.tmpl`, {
    id: vars.id,
    repo: vars.repo,
    displayName: displayNameOf(vars.id)
  });
  const guide = pluginOwnedFile(vars.id);
  for (const file of [...OWNED_FILES, guide]) {
    if (kept(file)) continue;
    const want = file === guide ? ownerInput() : render2(file);
    const path = join2(root2, file);
    const have = existsSync2(path) ? readFileSync2(path, "utf8") : null;
    if (have !== want)
      changes2.push({
        file,
        what: have === null ? `${file} is missing.` : `${file} differs from the Sidecut copy.`,
        next: want
      });
  }
  for (const file of BLOCK_FILES) {
    if (kept(file)) continue;
    const path = join2(root2, file);
    const template = render2(file);
    if (!existsSync2(path)) {
      changes2.push({ file, what: `${file} is missing.`, next: template });
      continue;
    }
    const have = readFileSync2(path, "utf8");
    const merged = mergeBlocks(have, template, file);
    if ("error" in merged)
      changes2.push({ file, what: `${merged.error} Fix them by hand.`, next: null });
    else if (merged.text !== have)
      changes2.push({
        file,
        what: `The Sidecut blocks in ${file} are out of date.`,
        next: merged.text
      });
  }
  if (!kept("package.json")) {
    const pkg = planPackage(root2, vars);
    if (pkg) changes2.push(pkg);
  }
  return changes2;
}
function applySync(root2, changes2) {
  const left2 = [];
  for (const change of changes2) {
    if (change.next === null) {
      left2.push(change);
      continue;
    }
    const path = join2(root2, change.file);
    mkdirSync2(dirname2(path), { recursive: true });
    writeFileSync2(path, change.next);
  }
  return left2;
}

// plugins/sidecut-agentskills/server/src/check/repo.ts
function readJson(path) {
  try {
    return JSON.parse(readFileSync3(path, "utf8"));
  } catch {
    return {};
  }
}
function identify(root2) {
  const pluginsDir = join3(root2, "plugins");
  const plugins = existsSync3(pluginsDir) ? readdirSync2(pluginsDir).filter((n) => n !== ".DS_Store") : [];
  const only = plugins.length === 1 ? plugins[0] ?? "" : "";
  const manifest = readJson(join3(pluginsDir, only, ".claude-plugin", "plugin.json"));
  const pkg = readJson(join3(root2, "package.json"));
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
if (!who.id) {
  console.log(`Nothing to sync. ${who.scope}`);
  process.exit(0);
}
if (!values.check && !values.force) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_"))
  );
  const touched = [
    ...OWNED_FILES,
    ...BLOCK_FILES,
    pluginOwnedFile(who.id),
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
  { id: who.id, repo: who.repo, version: ownVersion },
  (file) => keys.some((key) => keepCovers(key, "REPO_SYNC", file))
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
