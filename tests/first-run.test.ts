// A stranger's first use: with nothing saved, the bundled server asks who the plugins belong to,
// writes nothing, never suggests the Sidecut profile, and saves the answers it's given.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, test } from 'vitest';

const server = join(import.meta.dirname, '..', 'plugins/sidecut-agentskills/server/index.mjs');
const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

type Call = [string, Record<string, unknown>];

/** Starts the server with `home` as HOME, makes each call in turn and returns each reply's text. */
async function callTools(home: string, calls: Call[]): Promise<string[]> {
  const child = spawn(process.execPath, [server], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { PATH: process.env.PATH ?? '', HOME: home },
  });
  const waiting = new Map<number, (msg: { result?: { content?: { text: string }[] } }) => void>();
  let buffer = '';
  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      waiting.get(msg.id)?.(msg);
    }
  });
  let id = 0;
  const send = (method: string, params: unknown) =>
    new Promise<{ result?: { content?: { text: string }[] } }>((resolve) => {
      id += 1;
      waiting.set(id, resolve);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  try {
    await send('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'first-run-test', version: '0' },
    });
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    );
    const out: string[] = [];
    for (const [name, args] of calls) {
      const reply = await send('tools/call', { name, arguments: args });
      out.push(reply.result?.content?.map((c) => c.text).join('\n') ?? '');
    }
    return out;
  } finally {
    child.kill();
  }
}

test('a cold start asks for setup before writing anything, and never offers Sidecut', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agentskills-first-run-'));
  scratch.push(home);
  const out = join(home, 'reading-list');
  const [settings, scaffold] = await callTools(home, [
    ['get_settings', {}],
    [
      'scaffold_plugin',
      {
        out,
        id: 'reading-list',
        description: 'Tracks the books on your reading list.',
        longDescription: 'Keeps your reading list. Tells you what to read next.',
        keywords: ['books', 'reading', 'list'],
      },
    ],
  ]);
  for (const reply of [settings, scaffold]) {
    const parsed = JSON.parse(reply ?? '{}');
    expect(parsed.needs).toBe('settings');
    expect(parsed.next).toMatch(/never answer them yourself/);
    const keys = parsed.questions.map((q: { key: string }) => q.key);
    expect(keys).not.toContain('profile');
    expect(JSON.stringify(parsed.questions)).not.toMatch(/sidecut/i);
  }
  expect(existsSync(out)).toBe(false);
  expect(existsSync(join(home, '.config'))).toBe(false);
});

test('the answers are saved where it says, and later calls apply them', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agentskills-first-run-'));
  scratch.push(home);
  const [saved, read] = await callTools(home, [
    [
      'save_settings',
      { settings: { org: 'jane-doe', authorName: 'Jane Doe', voice: 'docs/voice.md' } },
    ],
    ['get_settings', {}],
  ]);
  const file = join(home, '.config', 'agentskills', 'settings.json');
  expect(JSON.parse(saved ?? '{}').settingsFile).toBe(file);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
    org: 'jane-doe',
    authorName: 'Jane Doe',
    voice: 'docs/voice.md',
  });
  const now = JSON.parse(read ?? '{}');
  expect(now.saved).toBe(true);
  expect(now.settings.org).toBe('jane-doe');
  expect(now.settings.profile).toBe('');
  expect(now.apply).toMatch(/no prefix/);
  expect(now.apply).toMatch(/docs\/voice\.md/);
});

test('a licence the template lacks is refused, and an empty profile leaves a saved one', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agentskills-first-run-'));
  scratch.push(home);
  const file = join(home, '.config', 'agentskills', 'settings.json');
  const [refused] = await callTools(home, [
    [
      'save_settings',
      { settings: { org: 'jane-doe', authorName: 'Jane Doe', license: 'Apache-2.0' } },
    ],
  ]);
  expect(refused).toMatch(/Only the MIT licence template ships/);
  expect(existsSync(file)).toBe(false);
  await callTools(home, [
    ['save_settings', { settings: { profile: 'sidecut' } }],
    ['save_settings', { settings: { profile: '', org: 'jane-doe', authorName: 'Jane Doe' } }],
  ]);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({
    org: 'jane-doe',
    authorName: 'Jane Doe',
  });
});
