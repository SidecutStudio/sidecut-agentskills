import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { listFiles } from '../scaffold.ts';
import { type Report, sentences } from './report.ts';

type Tool = {
  name: string;
  title?: string;
  description?: string;
  annotations?: Record<string, unknown>;
};
type Listing = { instructions?: string; tools: Tool[] };

const HINTS = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'];

/** Starts the bundled server over stdio and reads its instructions and tools. */
export function listTools(bundle: string): Listing | null {
  const messages = [
    {
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'sidecut-check', version: '1' },
      },
    },
    { method: 'notifications/initialized' },
    { id: 2, method: 'tools/list' },
  ];
  const result = spawnSync('node', [bundle], {
    input: `${messages.map((m) => JSON.stringify({ jsonrpc: '2.0', ...m })).join('\n')}\n`,
    encoding: 'utf8',
    timeout: 10_000,
    cwd: tmpdir(),
  });
  const replies = result.stdout
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as { id?: number; result?: Record<string, unknown> }];
      } catch {
        return [];
      }
    });
  const init = replies.find((r) => r.id === 1)?.result;
  const list = replies.find((r) => r.id === 2)?.result;
  if (!init || !list) return null;
  return {
    instructions: init.instructions as string | undefined,
    tools: (list.tools as Tool[]) ?? [],
  };
}

/** Checks the local MCP server: source, bundle drift and tool metadata. Returns the tool names, or null. */
export function checkServer(pluginDir: string, root: string, report: Report): Set<string> | null {
  const source = join(pluginDir, 'server', 'src', 'index.ts');
  const bundle = join(pluginDir, 'server', 'index.mjs');
  const where = relative(root, join(pluginDir, 'server'));
  if (!existsSync(source) || !existsSync(bundle)) {
    report.add(
      'SERVER_FILES',
      where,
      undefined,
      'Local server needs server/src/index.ts and server/index.mjs.',
      'Add the source and run `bun run build`.',
    );
    return null;
  }
  for (const file of listFiles(join(pluginDir, 'server', 'src'))) {
    if (/process\.cwd\(\)/.test(readFileSync(file, 'utf8'))) {
      report.add(
        'SERVER_CWD',
        relative(root, file),
        undefined,
        'Server code uses the working directory.',
        'Resolve paths from `import.meta.url`; in Claude Code the working directory is the user project.',
      );
    }
  }
  const out = mkdtempSync(join(tmpdir(), 'sidecut-check-'));
  try {
    const built = join(out, 'index.mjs');
    const result = spawnSync(
      'bun',
      [
        'build',
        source,
        '--target=node',
        '--format=esm',
        `--outfile=${built}`,
        `--metafile=${join(out, 'meta.json')}`,
      ],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    if (result.status !== 0) {
      report.add(
        'SERVER_BUILD',
        where,
        undefined,
        `The server doesn't build: ${result.stderr.trim().split('\n')[0]}`,
        'Run `bun install`, then fix the build error.',
      );
    } else if (!readFileSync(built).equals(readFileSync(bundle))) {
      report.add(
        'SERVER_BUNDLE_STALE',
        relative(root, bundle),
        undefined,
        "The committed bundle doesn't match the source.",
        'Run `bun run build` and commit server/index.mjs.',
      );
    }
    if (result.status === 0) {
      // Every package the bundle inlines ships its licence notice next to the bundle.
      const inputs = Object.keys(
        JSON.parse(readFileSync(join(out, 'meta.json'), 'utf8')).inputs as object,
      );
      const packages = [
        ...new Set(
          inputs.flatMap((p) => /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(p)?.[1] ?? []),
        ),
      ];
      const notices = join(pluginDir, 'server', 'THIRD_PARTY_LICENSES.txt');
      const text = existsSync(notices) ? readFileSync(notices, 'utf8') : '';
      const missing = packages.filter((pkg) => !text.split('\n').includes(pkg));
      if (missing.length > 0) {
        report.add(
          'SERVER_LICENSES',
          relative(root, notices),
          undefined,
          `The bundle inlines ${missing.join(', ')} without its licence notice.`,
          'Run `bun run build`, which writes server/THIRD_PARTY_LICENSES.txt.',
        );
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  const listing = listTools(bundle);
  if (!listing) {
    report.add(
      'SERVER_START',
      relative(root, bundle),
      undefined,
      "The server didn't answer initialize and tools/list.",
      'Run `node server/index.mjs` and fix the startup error.',
    );
    return null;
  }
  const count = sentences(listing.instructions ?? '').length;
  if (count < 3 || count > 6) {
    report.add(
      'SERVER_INSTRUCTIONS',
      where,
      undefined,
      `Server instructions have ${count} sentences.`,
      'Write 3 to 6 sentences: what it covers, where to start, what tool output is.',
    );
  }
  for (const tool of listing.tools) {
    const label = `${where} tool ${tool.name}`;
    if (!/^[a-z]+(_[a-z]+)+$/.test(tool.name)) {
      report.add(
        'NAME_TOOL',
        label,
        undefined,
        `Tool name "${tool.name}" is not verb_object snake_case.`,
        'Rename it, for example `get_status`.',
      );
    }
    if (!tool.title)
      report.add('TOOL_TITLE', label, undefined, 'Tool has no title.', 'Add a `title`.');
    const missing = HINTS.filter((h) => typeof tool.annotations?.[h] !== 'boolean');
    if (missing.length > 0) {
      report.add(
        'TOOL_ANNOTATIONS',
        label,
        undefined,
        `Tool doesn't set ${missing.join(', ')}.`,
        'Set all four hints explicitly.',
      );
    }
    const description = tool.description ?? '';
    if (
      sentences(description).length > 2 ||
      /^Use this tool/i.test(description) ||
      description === ''
    ) {
      report.add(
        'TOOL_DESCRIPTION',
        label,
        undefined,
        'Tool description is not 1 or 2 sentences of what it returns and when to use it.',
        'Rewrite it: what it returns, then when to use it.',
      );
    }
  }
  return new Set(listing.tools.map((t) => t.name));
}
