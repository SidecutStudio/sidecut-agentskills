// Sidecut usage log, on by default: records one line per run of this plugin's own skills to
// ~/.sidecut/skill-log.jsonl. SIDECUT_SKILL_LOG=0, DO_NOT_TRACK=1 or a CI environment turns it off.
// Sends nothing.
// Claude Code runs a skill through its Skill tool. Codex has no skill tool: it reads the skill's
// SKILL.md with a shell command, so a Bash call that reads one of this plugin's SKILL.md files counts.
// Antigravity reads it with read_file (view_file in its app), or a shell command through run_command.
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CI_VARIABLES = [
  'CI',
  'GITHUB_ACTIONS',
  'BUILDKITE',
  'CIRCLECI',
  'GITLAB_CI',
  'JENKINS_URL',
  'TF_BUILD',
];
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const READERS = /^(cat|sed|head|tail|less|more|bat|nl)\b/;
const OFF = new Set(['0', 'false', 'off', 'no']);

function isOn(env) {
  if (env.DO_NOT_TRACK === '1' || CI_VARIABLES.some((name) => env[name])) return false;
  return !OFF.has((env.SIDECUT_SKILL_LOG ?? '').toLowerCase());
}

// The plugin's folder, then an optional version folder, then skills/<skill>/SKILL.md.
const skillPath = (plugin) =>
  new RegExp(`/${plugin}/(?:[^/\\s'"]+/)?skills/([a-z0-9-]+)/SKILL\\.md`);

// The skill a tool call ran, or nothing when the call wasn't one of this plugin's skills.
function skillOf(input, plugin, roots) {
  if (input.tool_name === 'Skill') {
    const [namespace, skill] = String(input.tool_input?.skill ?? '').split(':');
    return namespace === plugin ? skill : undefined;
  }
  // Antigravity sends the call as toolCall, and an error when it failed. read_file (view_file in the
  // app) is its ordinary file reader, so only the first read of a SKILL.md inside this installed
  // plugin counts.
  if (input.toolCall) {
    if (input.error) return undefined;
    const { name, args } = input.toolCall;
    if (name === 'read_file' || name === 'view_file') {
      if (Number(args?.StartLine ?? 1) > 1) return undefined;
      const asked = String(args?.Path ?? args?.AbsolutePath ?? '');
      // Resolve links too: on macOS /var is /private/var, and the root comes back resolved.
      const files = [asked, existsSync(asked) ? realpathSync(asked) : asked].map((f) =>
        f.replaceAll('\\', '/'),
      );
      for (const file of files) {
        const own = roots
          .map((root) => `${root.replaceAll('\\', '/')}/skills/`)
          .find((dir) => file.startsWith(dir));
        if (own) return /^([a-z0-9-]+)\/SKILL\.md$/.exec(file.slice(own.length))?.[1];
      }
      return undefined;
    }
    return name === 'run_command' ? skillRead(String(args?.CommandLine ?? ''), plugin) : undefined;
  }
  return skillRead([input.tool_input?.command ?? ''].flat().join(' '), plugin);
}

// The skill a shell line reads with a file reader, if it is one of this plugin's.
function skillRead(line, plugin) {
  // The command as a string, without a `zsh -lc` style wrapper or quotes around it.
  const command = line
    .replace(/^\S*\b(?:ba|z)?sh -l?c\s+/, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
  const path = skillPath(plugin);
  // A command in the chain that starts with a file reader and reads the skill's own file.
  for (const part of commandsOf(command)) {
    if (READERS.test(part)) {
      const skill = path.exec(part)?.[1];
      if (skill) return skill;
    }
  }
  return undefined;
}

// Splits a shell line at newlines, `;`, `|`, `&&` and `||` outside quotes, so
// `grep x SKILL.md | head` stays one grep and `sed -n '1p;5p' SKILL.md` stays one sed. A backslash
// outside single quotes keeps the next character as it is, as the shell does.
function commandsOf(line) {
  const parts = [''];
  let quote = '';
  let escaped = false;
  for (const char of line) {
    if (escaped) {
      escaped = false;
    } else if (char === '\\' && quote !== "'") {
      escaped = true;
    } else if (quote) {
      if (char === quote) quote = '';
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === ';' || char === '|' || char === '&' || char === '\n') {
      parts.push('');
      continue;
    }
    parts[parts.length - 1] += char;
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}

function record() {
  if (!isOn(process.env)) return;
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = join(root, '.claude-plugin', 'plugin.json');
  const plugin = JSON.parse(readFileSync(manifest, 'utf8')).name;
  const skill = skillOf(input, plugin, [root, realpathSync(root)]);
  if (!SKILL_NAME.test(skill ?? '')) return;
  if (!existsSync(join(root, 'skills', skill, 'SKILL.md'))) return;
  // Antigravity sends the call as toolCall; Codex sends a turn id with every hook; Claude Code doesn't.
  const host = input.toolCall
    ? 'antigravity'
    : input.turn_id === undefined
      ? 'claude-code'
      : 'codex';
  const file = join(homedir(), '.sidecut', 'skill-log.jsonl');
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(
    file,
    `${JSON.stringify({ time: new Date().toISOString(), plugin, skill, host })}\n`,
  );
}

try {
  record();
} catch {
  // The log must never get in the way of the session.
}
process.exit(0);
