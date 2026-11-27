#!/usr/bin/env node

// scripts/icon.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { createRequire } from "node:module";
import { dirname as dirname2, join as join2 } from "node:path";
import { Resvg } from "@resvg/resvg-js";

// plugins/sidecut-agentskills/server/src/settings.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

// plugins/sidecut-agentskills/server/src/sidecut-profile.ts
var SOLO_START = "<!-- solo-workflow:start -->";
var SOLO_END = "<!-- solo-workflow:end -->";
var SOLO_BLOCK = `${SOLO_START}
## Sidecut Solo

Follow \`solo-workflow.toml\`. Use the relevant Solo skill, or \`solo\` to route the request.
${SOLO_END}`;
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

// plugins/sidecut-agentskills/server/src/settings.ts
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
  if (!existsSync(path)) return null;
  try {
    return cleanSettings(JSON.parse(readFileSync(path, "utf8")));
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
function readRepoSettings(root) {
  return readInput(join(root, REPO_FILE));
}
function inferRepoSettings(root) {
  const plugins = join(root, "plugins");
  const ids = existsSync(plugins) ? readdirSync(plugins).filter((n) => n !== ".DS_Store") : [];
  for (const id of ids) {
    try {
      const manifest = JSON.parse(
        readFileSync(join(plugins, id, ".claude-plugin", "plugin.json"), "utf8")
      );
      const owner2 = /^https:\/\/github\.com\/([\w.-]+)\//.exec(
        String(manifest.repository ?? "")
      )?.[1];
      if (!owner2) continue;
      if (owner2 === SIDECUT_OWNER) return { profile: "sidecut" };
      const check = join(root, ".github", "workflows", "check.yml");
      const picker = existsSync(check) && readFileSync(check, "utf8").includes("/pick-runner@");
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
    cwd: root,
    encoding: "utf8",
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")))
  });
  const owner = /github\.com[/:]([\w.-]+)\//.exec(remote.stdout ?? "")?.[1];
  if (remote.status === 0 && owner === SIDECUT_OWNER) return { profile: "sidecut" };
  return {};
}
function repoSettings(root) {
  return mergeSettings(readRepoSettings(root) ?? inferRepoSettings(root));
}
var active = mergeSettings();
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

// scripts/icon.ts
var TILE = "#0a0a0a";
function iconSvg(lucideSvg, dot) {
  const shapes = [
    ...lucideSvg.matchAll(/<(path|rect|circle|line|polyline|polygon|ellipse)\b[^>]*\/>/g)
  ].map((m) => m[0]).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="${TILE}"/><g transform="translate(7.4 8.2) scale(0.98)" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes}</g><circle cx="31.5" cy="30.5" r="2.6" fill="${dot}"/></svg>`;
}
function iconPng(svg) {
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 512 } }).render().asPng());
}
if (import.meta.main) {
  const usage = "Usage: sidecut-icon <lucide-icon-name> [--out <file>]";
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(usage);
    process.exit(0);
  }
  const outFlag = args.indexOf("--out");
  const out = outFlag >= 0 ? args[outFlag + 1] : void 0;
  const names = outFlag >= 0 ? args.filter((_, i) => i !== outFlag && i !== outFlag + 1) : args;
  const name = names[0];
  if (names.length !== 1 || !name || !/^[a-z0-9-]+$/.test(name) || outFlag >= 0 && !out) {
    console.error(usage);
    process.exit(1);
  }
  const lucide = join2(
    dirname2(createRequire(import.meta.url).resolve("lucide-static/package.json")),
    "icons",
    `${name}.svg`
  );
  if (!existsSync2(lucide)) {
    console.error(`No Lucide icon is named ${name}. Pick one from https://lucide.dev/icons.`);
    process.exit(1);
  }
  const target = out ?? join2("plugins", JSON.parse(readFileSync2("package.json", "utf8")).name, "assets", "icon.png");
  mkdirSync2(dirname2(target), { recursive: true });
  const dot = repoSettings(process.cwd()).brandColor;
  writeFileSync2(target, iconPng(iconSvg(readFileSync2(lucide, "utf8"), dot)));
  console.log(`Wrote ${target}.`);
}
export {
  TILE,
  iconPng,
  iconSvg
};
