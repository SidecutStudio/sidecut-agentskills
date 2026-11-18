import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('installed house style exposes visual reports without a source checkout', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'agentskills-visual-'));
  try {
    const plugin = join(scratch, 'plugin');
    cpSync(join(import.meta.dirname, '../plugins/sidecut-agentskills'), plugin, {
      recursive: true,
    });
    const messages = [
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
      {
        id: 2,
        method: 'tools/call',
        params: { name: 'get_house_style', arguments: { section: 'Visual reports' } },
      },
    ];
    const result = spawnSync('node', [join(plugin, 'server/index.mjs')], {
      cwd: scratch,
      input: `${messages.map((message) => JSON.stringify({ jsonrpc: '2.0', ...message })).join('\n')}\n`,
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    const replies = result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const reply = replies.find((message) => message.id === 2);
    expect(reply.result.isError).not.toBe(true);
    expect(reply.result.content[0].text.startsWith('## Visual reports')).toBe(true);
    expect(reply.result.content[0].text).toContain('[visual-reports.md](visual-reports.md)');
    const data = join(plugin, 'server/data');
    const html = readFileSync(join(data, 'visual-report.html'), 'utf8');
    const css = readFileSync(join(data, 'visual-report.css'), 'utf8');
    expect(html).toContain('Sidecut Agentskills');
    for (const [, filename] of css.matchAll(/url\("([^"\n]+)"\)/g)) {
      expect(readFileSync(join(data, filename ?? '')).length).toBeGreaterThan(0);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
