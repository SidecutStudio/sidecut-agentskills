// Sidecut usage log. When SIDECUT_SKILL_LOG=1, records one line per run of this plugin's own skills
// to ~/.sidecut/skill-log.jsonl. DO_NOT_TRACK=1 or a CI environment turns it off. Sends nothing.
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

function isOn(env) {
  if (env.DO_NOT_TRACK === '1' || CI_VARIABLES.some((name) => env[name])) return false;
  return env.SIDECUT_SKILL_LOG === '1';
}

function record() {
  if (!isOn(process.env)) return;
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const plugin = JSON.parse(readFileSync(join(root, 'plugin.json'), 'utf8')).name;
  const [namespace, skill] = String(input.tool_input?.skill ?? '').split(':');
  if (namespace !== plugin || !SKILL_NAME.test(skill ?? '')) return;
  if (!existsSync(join(root, 'skills', skill, 'SKILL.md'))) return;
  const host = process.env.CLAUDE_PLUGIN_ROOT ? 'claude-code' : 'codex';
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
