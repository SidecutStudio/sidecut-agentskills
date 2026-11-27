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

/** The Claude Code hook events Antigravity also has; `Stop` and `SessionStart` take handlers with no matcher. */
const EVENTS: Record<string, { flat: boolean }> = {
  PreToolUse: { flat: false },
  PostToolUse: { flat: false },
  Stop: { flat: true },
  SessionStart: { flat: true },
};
/**
 * Antigravity's tools for each Claude Code tool a matcher names. Antigravity reads a file with
 * `read_file` (its CLI) or `view_file` (its app), runs a shell command with `run_command`, and opens a
 * skill by reading its `SKILL.md`, which can be a shell read.
 */
const TOOLS: Record<string, string[]> = {
  Bash: ['run_command'],
  Skill: ['read_file', 'view_file', 'run_command'],
  Read: ['read_file', 'view_file'],
  Edit: ['replace_file_content', 'multi_replace_file_content'],
  Write: ['write_to_file'],
  Grep: ['grep_search'],
  Glob: ['find_by_name'],
};
const PREFIX = /^(?:pre-tool-use|post-tool-use|stop|session-start)-/;
const SCRIPT = /hooks\/([\w.-]+\.mjs)/g;

/** Antigravity's matcher for a Claude Code one, or null when a tool in it has no Antigravity name. */
function antigravityMatcher(matcher: unknown): string | null {
  if (matcher === undefined || matcher === '' || matcher === '*') return '*';
  if (typeof matcher !== 'string') return null;
  const tools: string[] = [];
  for (const part of matcher.split('|')) {
    const mapped = TOOLS[part];
    if (!mapped) return null;
    for (const tool of mapped) if (!tools.includes(tool)) tools.push(tool);
  }
  return tools.join('|');
}

/**
 * The hook script a Claude Code handler runs as `node <script>` and nothing more, or null. A handler
 * with other arguments is left out rather than written without them.
 */
function scriptOf(handler: unknown): string | null {
  if (!isRecord(handler) || typeof handler.command !== 'string') return null;
  const args = Array.isArray(handler.args) ? handler.args : [];
  const path =
    args.length === 0
      ? /^node\s+"?([^\s"]+)"?$/.exec(handler.command)?.[1]
      : handler.command === 'node' && args.length === 1 && typeof args[0] === 'string'
        ? args[0]
        : undefined;
  return path ? (/(?:^|\/)hooks\/([\w.-]+\.mjs)$/.exec(path)?.[1] ?? null) : null;
}

/**
 * Antigravity's hooks for a plugin whose Claude Code hooks are `claudeHooks`. The usage log hook
 * always runs there. Any other script runs there only when the plugin's `hooks.json` already names
 * it (`current`), since a script has to read Antigravity's input and answer in its form; sync then
 * writes its entries from the Claude Code ones. Each script is a group named for it without its event
 * prefix, run with `node` from the plugin's folder, as Antigravity runs plugin hooks. Events, tools and
 * handlers it can't carry over are left out, and a script left with no entry drops out of the file.
 */
export function antigravityHooks(
  claudeHooks: Json | null,
  current: string | null,
  skillLog = true,
): Json {
  const out: Json = {};
  if (skillLog)
    out['skill-log'] = {
      PostToolUse: [
        {
          matcher: 'read_file|view_file|run_command',
          hooks: [{ type: 'command', command: `node ./hooks/${SKILL_LOG_HOOK}`, timeout: 5 }],
        },
      ],
    };
  const chosen = new Set([...(current ?? '').matchAll(SCRIPT)].map((m) => m[1]));
  chosen.delete(SKILL_LOG_HOOK);
  const events = claudeHooks && isRecord(claudeHooks.hooks) ? claudeHooks.hooks : {};
  for (const [event, groups] of Object.entries(events)) {
    const shape = EVENTS[event];
    if (!shape || !Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!isRecord(group) || !Array.isArray(group.hooks)) continue;
      const matcher = antigravityMatcher(group.matcher);
      // Antigravity ignores a matcher on Stop and SessionStart, so a narrowed one would widen there.
      if (matcher === null || (shape.flat && matcher !== '*')) continue;
      for (const handler of group.hooks) {
        const script = scriptOf(handler);
        if (!script || !chosen.has(script) || !isRecord(handler)) continue;
        const name = script.replace(/\.mjs$/, '').replace(PREFIX, '');
        if (name === 'skill-log') continue;
        const entry: Json = { type: 'command', command: `node ./hooks/${script}` };
        if (typeof handler.timeout === 'number') entry.timeout = handler.timeout;
        if (!isRecord(out[name])) out[name] = {};
        const group = out[name] as Json;
        if (!Array.isArray(group[event])) group[event] = [];
        (group[event] as Json[]).push(shape.flat ? entry : { matcher, hooks: [entry] });
      }
    }
  }
  return out;
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
  const hooks = antigravityHooks(parse('hooks/hooks.json'), read(ANTIGRAVITY_HOOKS), hasSkillLog);
  return [
    { path: ANTIGRAVITY_MANIFEST, text: formatJson(antigravityManifest(claude, codex)) },
    { path: ANTIGRAVITY_MCP, text: mcp ? formatJson(antigravityMcp(mcp)) : null },
    {
      path: ANTIGRAVITY_HOOKS,
      text: Object.keys(hooks).length ? formatJson(hooks) : null,
    },
  ];
}

/** The Antigravity files for the plugin folder `pluginDir`. */
export function antigravityFiles(pluginDir: string): AntigravityFile[] | null {
  return antigravityFilesFrom((path) => {
    const full = join(pluginDir, path);
    return existsSync(full) ? readFileSync(full, 'utf8') : null;
  });
}
