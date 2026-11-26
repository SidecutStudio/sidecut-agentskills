import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

// The hook that keeps this plugin's subagents out of the user's own Codex and Claude Code config.
const HOOK = join(
  import.meta.dirname,
  '../plugins/sidecut-agentskills/hooks/pre-tool-use-host-home.mjs',
);
const REVIEWER = 'sidecut-agentskills:reviewer';

function decide(input: Record<string, unknown>): string | undefined {
  const env = { ...process.env };
  delete env.CODEX_HOME;
  delete env.CLAUDE_CONFIG_DIR;
  const run = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    env,
    encoding: 'utf8',
  });
  expect(run.status).toBe(0);
  if (run.stdout.trim() === '') return undefined;
  const out = JSON.parse(run.stdout).hookSpecificOutput;
  expect(out.hookEventName).toBe('PreToolUse');
  expect(out.permissionDecisionReason).toMatch(/throwaway/);
  return out.permissionDecision;
}

const bash = (command: string, agent_type: string | undefined = REVIEWER) => ({
  agent_type,
  tool_name: 'Bash',
  tool_input: { command },
});

test.each([
  ['codex mcp list'],
  ['codex mcp get builder'],
  ['claude mcp list'],
  ['npm run check && npx -y @openai/codex mcp list'],
  ['CODEX_HOME=~/.codex codex mcp list'],
  ['CODEX_HOME=$HOME/.codex codex plugin add x@y'],
  ['CODEX_HOME= codex mcp list'],
  ['cat ~/.codex/config.toml'],
  [`cat ${homedir()}/.claude.json`],
  ['cd ~/.codex && ls'],
])('refuses %s from the reviewer', (command) => {
  expect(decide(bash(command))).toBe('deny');
});

test.each([
  ['CODEX_HOME=$(mktemp -d) codex mcp list'],
  ['export CODEX_HOME=/tmp/codex-test && codex plugin marketplace add /tmp/market'],
  ['env CLAUDE_CONFIG_DIR="$tmp" claude mcp list'],
  ['codex --version'],
  ['npm run check'],
  ['git log | grep codex'],
  ['grep -rn "~/.codex" plugins'],
])('lets %s through', (command) => {
  expect(decide(bash(command))).toBeUndefined();
});

test('applies to the Codex profile and leaves other agents and the main session alone', () => {
  expect(decide(bash('codex mcp list', 'agentskills_reviewer'))).toBe('deny');
  expect(decide(bash('codex mcp list', 'Explore'))).toBeUndefined();
  expect(decide({ tool_name: 'Bash', tool_input: { command: 'codex mcp list' } })).toBeUndefined();
});

test('refuses file tools pointed at a host config', () => {
  const read = (file_path: string) => ({
    agent_type: REVIEWER,
    tool_name: 'Read',
    tool_input: { file_path },
  });
  expect(decide(read('~/.codex/config.toml'))).toBe('deny');
  expect(
    decide({
      agent_type: REVIEWER,
      tool_name: 'Grep',
      tool_input: { pattern: 'token', path: join(homedir(), '.claude') },
    }),
  ).toBe('deny');
  expect(decide(read('/tmp/plugin/README.md'))).toBeUndefined();
});

test('lets a call through when its input is not JSON', () => {
  const run = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
  expect(run.status).toBe(0);
  expect(run.stdout).toBe('');
});
