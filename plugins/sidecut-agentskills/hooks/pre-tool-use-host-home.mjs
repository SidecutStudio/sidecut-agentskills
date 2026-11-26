// Keeps this plugin's subagents, such as the reviewer, out of the user's own host config. Their
// `codex` and `claude` commands must name a throwaway home (CODEX_HOME, CLAUDE_CONFIG_DIR) in the
// command itself, and they never read ~/.codex, ~/.claude or ~/.claude.json directly. Those hold
// sign-ins and MCP settings, and `codex mcp list` / `codex mcp get` print the tokens in them.
// Claude Code and Codex both send the subagent's name as agent_type; a call without one, from the
// main session, passes untouched. A denied call says what to run instead.
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';

const OWN_AGENT = /^(?:sidecut-agentskills:|agentskills_)/;
const HOSTS = {
  codex: { variable: 'CODEX_HOME', home: '.codex', packages: /^@openai\/codex(?:@|$)/ },
  claude: {
    variable: 'CLAUDE_CONFIG_DIR',
    home: '.claude',
    packages: /^@anthropic-ai\/claude-code(?:@|$)/,
  },
};
const WRAPPERS = new Set(['env', 'command', 'exec', 'time', 'nohup', 'sudo']);
const RUNNERS = new Set(['npx', 'bunx', 'pnpx']);
const HARMLESS = new Set(['--version', '-V', '--help', '-h']);
const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s;

const unquote = (word) => word.replace(/^(['"])(.*)\1$/s, '$2');

// The user's own config folders, as the paths a command or a file tool might name.
function ownFolders(env) {
  const home = homedir();
  const folders = [
    resolve(home, '.codex'),
    resolve(home, '.claude'),
    resolve(home, '.claude.json'),
  ];
  for (const name of ['CODEX_HOME', 'CLAUDE_CONFIG_DIR'])
    if (env[name]) folders.push(resolve(expand(env[name], env)));
  return folders;
}

function expand(value, env) {
  const home = env.HOME || homedir();
  return unquote(value)
    .replace(/^~(?=\/|$)/, home)
    .replace(/\$\{HOME\}|\$HOME\b/g, home);
}

const inside = (path, folders) =>
  folders.some((folder) => path === folder || path.startsWith(`${folder}/`));

// A home is throwaway when it's named, and isn't one of the user's own folders or their home itself.
function throwaway(value, env) {
  if (value === undefined) return false;
  const raw = unquote(value).trim();
  if (raw === '' || /^\$\{?(?:CODEX_HOME|CLAUDE_CONFIG_DIR)\}?$/.test(raw)) return false;
  // A value only the shell can work out, such as "$tmp" or "$(mktemp -d)", is taken as named.
  const path = expand(raw, env);
  if (!path.startsWith('/') && !path.startsWith('.')) return true;
  const full = resolve(path);
  return full !== resolve(env.HOME || homedir()) && !inside(full, ownFolders(env));
}

// Each simple command in a shell line, split on the operators that start a new one.
const commands = (line) =>
  line
    .split(/\r?\n|&&|\|\||[;|&]/)
    .map((part) => part.trim())
    .filter(Boolean);

function problem(line, env) {
  const exported = {};
  const folders = ownFolders(env);
  for (const part of commands(line)) {
    const words = part.match(/(?:[^\s'"]+|'[^']*'|"[^"]*")+/g) ?? [];
    // Only bare words: a quoted one is usually a pattern or a message, not a path being read.
    for (const word of words.filter((w) => !/['"]/.test(w))) {
      const path = expand(word.replace(/^[^=]*=/, ''), env);
      if (path.startsWith('/') && inside(resolve(path), folders))
        return `\`${part}\` reads the user's own host config, which holds their sign-ins and tokens.`;
    }
    const assigned = { ...exported };
    let i = 0;
    if (words[0] === 'export') {
      for (const word of words.slice(1)) {
        const match = ASSIGNMENT.exec(word);
        if (match) exported[match[1]] = match[2];
      }
      continue;
    }
    for (; i < words.length; i++) {
      const match = ASSIGNMENT.exec(words[i]);
      if (match) assigned[match[1]] = match[2];
      else if (WRAPPERS.has(words[i]) || words[i].startsWith('-')) continue;
      else break;
    }
    let program = basename(unquote(words[i] ?? ''));
    let rest = words.slice(i + 1);
    if (RUNNERS.has(program)) {
      const at = rest.findIndex((word) => !word.startsWith('-'));
      const name = Object.keys(HOSTS).find((key) => HOSTS[key].packages.test(rest[at] ?? ''));
      if (!name) continue;
      program = name;
      rest = rest.slice(at + 1);
    }
    const host = HOSTS[program];
    if (!host) continue;
    if (rest.length > 0 && rest.every((word) => HARMLESS.has(word))) continue;
    if (!throwaway(assigned[host.variable], env))
      return `\`${part}\` runs ${program} with the user's own config. Put \`${host.variable}=<an empty folder you made>\` in front of it, in the same command.`;
  }
  return undefined;
}

// What the tool call would touch: a shell line, or a path a file tool reads.
function check(input, env) {
  if (!OWN_AGENT.test(String(input.agent_type ?? ''))) return undefined;
  const tool = input.tool_input ?? {};
  if (typeof tool.command === 'string') return problem(tool.command, env);
  for (const key of ['file_path', 'path']) {
    if (typeof tool[key] !== 'string') continue;
    const path = resolve(input.cwd ?? '.', expand(tool[key], env));
    if (inside(path, ownFolders(env)))
      return `${tool[key]} is the user's own host config, which holds their sign-ins and tokens.`;
  }
  return undefined;
}

let text = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  text += chunk;
});
process.stdin.on('end', () => {
  try {
    const reason = check(JSON.parse(text), process.env);
    if (reason)
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `${reason} Test hosts only from throwaway folders, as codex-testing.md in agentskills-build-mcp-server describes, and never print what a host config holds.`,
          },
        }),
      );
  } catch {
    // A hook that can't read its input lets the call through.
  }
  process.exit(0);
});
