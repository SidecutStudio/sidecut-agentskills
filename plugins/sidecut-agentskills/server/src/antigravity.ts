// The files that make a plugin installable in Google Antigravity, written from the plugin's Claude
// Code and Codex files so the three hosts can't drift apart. Scaffolding writes them, sidecut-sync
// keeps them current and the checker compares them. Antigravity reads `.antigravity-plugin/plugin.json`
// beside `.claude-plugin/`, `mcp_config.json` and `hooks.json` at the plugin root, and the same
// `skills/` folder. It ignores `.mcp.json`, `mcp.json` and `hooks/`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Json = Record<string, unknown>;

export const ANTIGRAVITY_SCHEMA = 'https://antigravity.google/schemas/v1/plugin.json';
export const ANTIGRAVITY_MANIFEST = '.antigravity-plugin/plugin.json';
export const ANTIGRAVITY_MCP = 'mcp_config.json';
export const ANTIGRAVITY_HOOKS = 'hooks.json';
export const SKILL_LOG_HOOK = 'post-tool-use-skill-log.mjs';
/** The fields the Antigravity manifest copies from the Claude Code manifest. */
const COPIED = ['author', 'homepage', 'repository', 'license', 'keywords'];

const isRecord = (value: unknown): value is Json =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** The Antigravity manifest for a plugin with these Claude Code and Codex manifests. */
export function antigravityManifest(claude: Json, codex: Json): Json {
  const ui = isRecord(codex.interface) ? codex.interface : {};
  const prompts = Array.isArray(ui.defaultPrompt) ? ui.defaultPrompt.slice(0, 3) : [];
  const manifest: Json = {
    $schema: ANTIGRAVITY_SCHEMA,
    name: claude.name,
    displayName: ui.displayName ?? claude.name,
    version: claude.version,
    description: claude.description,
    logo: 'assets/icon.png',
  };
  if (prompts.length) manifest.suggestedPrompts = prompts;
  for (const field of COPIED) if (claude[field] !== undefined) manifest[field] = claude[field];
  return manifest;
}

/**
 * Antigravity's MCP config for a plugin with this Claude Code `.mcp.json`. Antigravity fills in
 * `${PLUGIN_ROOT}` where Claude Code fills in `${CLAUDE_PLUGIN_ROOT}`, and takes a remote server as
 * its `url` alone.
 */
export function antigravityMcp(claudeMcp: Json): Json {
  const servers = isRecord(claudeMcp.mcpServers) ? claudeMcp.mcpServers : {};
  const out: Json = {};
  for (const [name, server] of Object.entries(servers)) {
    if (!isRecord(server)) continue;
    if (typeof server.url === 'string') {
      out[name] = { url: server.url };
      continue;
    }
    const entry: Json = { command: server.command };
    if (Array.isArray(server.args))
      entry.args = server.args.map((arg) =>
        typeof arg === 'string' ? arg.replaceAll('${CLAUDE_PLUGIN_ROOT}', '${PLUGIN_ROOT}') : arg,
      );
    out[name] = entry;
  }
  return { mcpServers: out };
}

/**
 * Antigravity's hooks for a plugin with the usage log hook. Antigravity runs a plugin hook from the
 * plugin's folder and reads skills with `read_file` (its CLI) or `view_file` (its app), or
 * `run_command` for a shell read.
 */
export function antigravityHooks(): Json {
  return {
    'skill-log': {
      PostToolUse: [
        {
          matcher: 'read_file|view_file|run_command',
          hooks: [
            {
              type: 'command',
              command: `node ./hooks/${SKILL_LOG_HOOK}`,
              timeout: 5,
            },
          ],
        },
      ],
    },
  };
}

/** JSON written the way Biome formats it: objects on their own lines, short arrays on one. */
export function formatJson(value: unknown, width = 100): string {
  const out = (v: unknown, indent: string, lead: number, comma: boolean): string => {
    if (Array.isArray(v)) {
      if (v.length === 0) return '[]';
      const flat = v.every((x) => x === null || typeof x !== 'object');
      const inline = `[${v.map((x) => JSON.stringify(x)).join(', ')}]`;
      if (flat && lead + inline.length + (comma ? 1 : 0) <= width) return inline;
      const inner = `${indent}  `;
      const items = v.map((x, i) => `${inner}${out(x, inner, inner.length, i < v.length - 1)}`);
      return `[\n${items.join(',\n')}\n${indent}]`;
    }
    if (isRecord(v)) {
      const entries = Object.entries(v);
      if (entries.length === 0) return '{}';
      const inner = `${indent}  `;
      const items = entries.map(([k, x], i) => {
        const key = `${inner}${JSON.stringify(k)}: `;
        return `${key}${out(x, inner, key.length, i < entries.length - 1)}`;
      });
      return `{\n${items.join(',\n')}\n${indent}}`;
    }
    return JSON.stringify(v);
  };
  return `${out(value, '', 0, false)}\n`;
}

/** One Antigravity file a plugin should have: its path in the plugin and its text, or null when it shouldn't exist. */
export type AntigravityFile = { path: string; text: string | null };

/**
 * The Antigravity files for the plugin whose files `read` returns (a path in the plugin, or null when
 * missing), or null when the Claude Code and Codex manifests can't be read.
 */
export function antigravityFilesFrom(
  read: (path: string) => string | null,
): AntigravityFile[] | null {
  const parse = (path: string): Json | null => {
    const text = read(path);
    if (text === null) return null;
    try {
      const value = JSON.parse(text);
      return isRecord(value) ? value : null;
    } catch {
      return null;
    }
  };
  const claude = parse('.claude-plugin/plugin.json');
  const codex = parse('.codex-plugin/plugin.json');
  if (!claude || !codex) return null;
  const mcp = parse('.mcp.json');
  // An unreadable .mcp.json is JSON_INVALID; nothing here can follow from it until it's fixed.
  if (!mcp && read('.mcp.json') !== null) return null;
  const hasSkillLog = read(`hooks/${SKILL_LOG_HOOK}`) !== null;
  return [
    { path: ANTIGRAVITY_MANIFEST, text: formatJson(antigravityManifest(claude, codex)) },
    { path: ANTIGRAVITY_MCP, text: mcp ? formatJson(antigravityMcp(mcp)) : null },
    { path: ANTIGRAVITY_HOOKS, text: hasSkillLog ? formatJson(antigravityHooks()) : null },
  ];
}

/** The Antigravity files for the plugin folder `pluginDir`. */
export function antigravityFiles(pluginDir: string): AntigravityFile[] | null {
  return antigravityFilesFrom((path) => {
    const full = join(pluginDir, path);
    return existsSync(full) ? readFileSync(full, 'utf8') : null;
  });
}
