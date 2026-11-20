import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { listTools, serverEnv } from '../plugins/sidecut-agentskills/server/src/check/server.ts';

// A stand-in server that reports, as its instructions, whether it can see GITHUB_TOKEN.
const FAKE = `
import { createInterface } from 'node:readline';
const seen = process.env.GITHUB_TOKEN === undefined ? 'no token' : 'token';
for await (const line of createInterface({ input: process.stdin })) {
  const m = JSON.parse(line);
  if (m.id === 1) console.log(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { instructions: seen } }));
  if (m.id === 2) console.log(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [] } }));
}
`;

const dirs: string[] = [];
afterEach(() => {
  delete process.env.GITHUB_TOKEN;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test('the checked server starts without the tokens check_plugin runs with', () => {
  const dir = mkdtempSync(join(tmpdir(), 'server-env-'));
  dirs.push(dir);
  const bundle = join(dir, 'index.mjs');
  writeFileSync(bundle, FAKE);
  process.env.GITHUB_TOKEN = 'ghp_example';
  expect(listTools(bundle)?.instructions).toBe('no token');
});

test('serverEnv passes only what node needs', () => {
  const env = serverEnv({ PATH: '/bin', HOME: '/h', GH_TOKEN: 'x', NPM_TOKEN: 'y', LANG: 'en' });
  expect(env).toEqual({ PATH: '/bin', HOME: '/h', LANG: 'en' });
});
