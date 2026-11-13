// Sidecut usage log. When SIDECUT_SKILL_LOG=1, records one line per run of this plugin's own skills
// to ~/.sidecut/skill-log.jsonl. DO_NOT_TRACK=1 or a CI environment turns it off. Sends nothing.
// Claude Code runs a skill through its Skill tool. Codex has no skill tool: it reads the skill's
// SKILL.md with a shell command, so a Bash call that reads one of this plugin's SKILL.md files counts.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
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

function isOn(env) {
  if (env.DO_NOT_TRACK === '1' || CI_VARIABLES.some((name) => env[name])) return false;
  return env.SIDECUT_SKILL_LOG === '1';
}

// The skill a tool call ran, or nothing when the call wasn't one of this plugin's skills.
function skillOf(input, plugin) {
  if (input.tool_name === 'Skill') {
    const [namespace, skill] = String(input.tool_input?.skill ?? '').split(':');
    return namespace === plugin ? skill : undefined;
  }
  // The command as a string, without a `zsh -lc` style wrapper or quotes around it.
  const command = [input.tool_input?.command ?? '']
    .flat()
    .join(' ')
    .replace(/^\S*\b(?:ba|z)?sh -l?c\s+/, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
  // The plugin's folder, then an optional version folder, then skills/<skill>/SKILL.md.
  const path = new RegExp(`/${plugin}/(?:[^/\\s'"]+/)?skills/([a-z0-9-]+)/SKILL\\.md`);
  // A command in the chain that starts with a file reader and reads the skill's own file.
  for (const part of commandsOf(command)) {
    if (READERS.test(part)) {
      const skill = path.exec(part)?.[1];
      if (skill) return skill;
    }
  }
  return undefined;
}

// Splits a shell line at `;`, `|`, `&&` and `||` outside quotes, so `grep x SKILL.md | head` stays
// one grep and `sed -n '1p;5p' SKILL.md` stays one sed.
function commandsOf(line) {
  const parts = [''];
  let quote = '';
  for (const char of line) {
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === ';' || char === '|' || char === '&') {
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
  const skill = skillOf(input, plugin);
  if (!SKILL_NAME.test(skill ?? '')) return;
  if (!existsSync(join(root, 'skills', skill, 'SKILL.md'))) return;
  // Codex sends a turn id with every hook; Claude Code doesn't.
  const host = input.turn_id === undefined ? 'claude-code' : 'codex';
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
