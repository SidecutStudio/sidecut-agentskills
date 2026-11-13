import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dir, '..', 'plugins', 'sidecut-demo');
const manifest = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'));

function callServer(messages: object[]): Record<string, unknown>[] {
  const input = `${messages.map((m) => JSON.stringify({ jsonrpc: '2.0', ...m })).join('\n')}\n`;
  const result = spawnSync('node', [join(root, 'server', 'index.mjs')], {
    input,
    timeout: 10_000,
    encoding: 'utf8',
  });
  return result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('get_status returns the plugin name and version', () => {
  const replies = callServer([
    {
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      },
    },
    { method: 'notifications/initialized' },
    { id: 2, method: 'tools/call', params: { name: 'get_status', arguments: {} } },
  ]);
  const call = replies.find((r) => r.id === 2) as {
    result: { structuredContent: Record<string, string> };
  };
  expect(call.result.structuredContent.plugin).toBe(manifest.name);
  expect(call.result.structuredContent.version).toBe(manifest.version);
});

// Runs the usage log hook on one tool call and returns what it wrote.
function runSkillLog(env: Record<string, string>, call: object): string {
  const home = mkdtempSync(join(tmpdir(), 'skill-log-'));
  try {
    spawnSync('node', [join(root, 'hooks', 'post-tool-use-skill-log.mjs')], {
      input: JSON.stringify(call),
      env: { PATH: process.env.PATH ?? '', HOME: home, ...env },
      timeout: 5_000,
    });
    try {
      return readFileSync(join(home, '.sidecut', 'skill-log.jsonl'), 'utf8');
    } catch {
      return '';
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

const skill = 'demo-check-status';
const on = { SIDECUT_SKILL_LOG: '1' };
// Claude Code runs a skill through its Skill tool; Codex reads the SKILL.md with a shell command.
const claude = (name: string) => ({ tool_name: 'Skill', tool_input: { skill: name } });
const codex = (command: string) => ({
  tool_name: 'Bash',
  turn_id: 'turn',
  tool_input: { command },
});
const skillFile = join(root, 'skills', skill, 'SKILL.md');

test('the usage log stays off unless SIDECUT_SKILL_LOG=1', () => {
  expect(runSkillLog({}, claude(`${manifest.name}:${skill}`))).toBe('');
});

test("the usage log records this plugin's skill in Claude Code", () => {
  const lines = runSkillLog(on, claude(`${manifest.name}:${skill}`))
    .trim()
    .split('\n');
  expect(lines).toHaveLength(1);
  const entry = JSON.parse(lines[0] ?? '{}');
  expect(Object.keys(entry)).toEqual(['time', 'plugin', 'skill', 'host']);
  expect(entry.host).toBe('claude-code');
});

test("the usage log records this plugin's skill when Codex reads its SKILL.md", () => {
  const entry = JSON.parse(runSkillLog(on, codex(`sed -n 1,200p '${skillFile}'`)) || '{}');
  expect([entry.skill, entry.host]).toEqual([skill, 'codex']);
  expect(runSkillLog(on, codex(`sed -n '1,80p;120,140p' '${skillFile}'`))).not.toBe('');
  expect(runSkillLog(on, codex(`echo don\\'t; cat '${skillFile}'`))).not.toBe('');
  expect(runSkillLog(on, codex(`cd /tmp\ncat '${skillFile}'`))).not.toBe('');
});

test('DO_NOT_TRACK and CI turn the usage log off', () => {
  expect(runSkillLog({ ...on, DO_NOT_TRACK: '1' }, claude(`${manifest.name}:${skill}`))).toBe('');
  expect(runSkillLog({ ...on, CI: 'true' }, claude(`${manifest.name}:${skill}`))).toBe('');
});

test('the usage log ignores other plugins, unknown skills and commands that only mention a skill', () => {
  expect(runSkillLog(on, claude(`other-plugin:${skill}`))).toBe('');
  expect(runSkillLog(on, claude(`${manifest.name}:no-such-skill`))).toBe('');
  expect(runSkillLog(on, codex(`grep name '${skillFile}'`))).toBe('');
  expect(runSkillLog(on, codex(`grep name '${skillFile}' | head`))).toBe('');
});
