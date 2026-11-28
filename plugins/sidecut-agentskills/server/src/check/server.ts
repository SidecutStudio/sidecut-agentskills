import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { buildSync } from 'esbuild';
import { listFiles, templatesRoot } from '../scaffold.ts';
import { current, namespaceOf } from '../settings.ts';
import { type Report, sentences } from './report.ts';

/**
 * The name the repo's own build script gives `createRequire` in the bundle's banner, so the check
 * builds the same bytes: `__agentskillsRequire`, or `__sidecutRequire` in Sidecut and older repos.
 */
function requireName(root: string): string {
  const script = join(root, 'scripts', 'build-server.ts');
  const named = existsSync(script)
    ? /createRequire as (__[A-Za-z]+Require)\b/.exec(readFileSync(script, 'utf8'))?.[1]
    : undefined;
  return named ?? `__${namespaceOf(current())}Require`;
}

type Tool = {
  name: string;
  title?: string;
  description?: string;
  annotations?: Record<string, unknown>;
};
type Listing = { instructions?: string; tools: Tool[] };
/** Each of the server's tools by name, with whether it sets `readOnlyHint: true`. */
export type ServerTools = Map<string, boolean>;

/** The esbuild version the template pins, which the error for a repo without it names. */
const ESBUILD =
  /"esbuild": "([^"]+)"/.exec(
    readFileSync(join(templatesRoot, 'repo', 'package.json.tmpl'), 'utf8'),
  )?.[1] ?? '';
const HINTS = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'];

// The checked server starts with only what node needs to run, so it never sees tokens or other
// secrets from the environment check_plugin runs in.
const PASSED_ENV = ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'SystemRoot', 'USERPROFILE'];

/** The environment the checked server starts with. */
export function serverEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(
    PASSED_ENV.flatMap((key) => (env[key] === undefined ? [] : [[key, env[key]]])),
  );
}

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
    env: serverEnv(),
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
export function checkServer(pluginDir: string, root: string, report: Report): ServerTools | null {
  const source = join(pluginDir, 'server', 'src', 'index.ts');
  const bundle = join(pluginDir, 'server', 'index.mjs');
  const where = relative(root, join(pluginDir, 'server'));
  if (!existsSync(source) || !existsSync(bundle)) {
    report.add(
      'SERVER_FILES',
      where,
      undefined,
      'Local server needs server/src/index.ts and server/index.mjs.',
      'Add the source and run `npm run build`.',
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
    let inputs: string[] | undefined;
    let failure: string | undefined;
    let build: typeof buildSync | undefined;
    try {
      build = createRequire(join(root, 'package.json'))('esbuild').buildSync as typeof buildSync;
    } catch {
      // Bun's bundler writes different bytes, so it can't stand in: the check compares this build
      // with the committed bundle byte for byte.
      report.add(
        'SERVER_BUILD',
        where,
        undefined,
        "The server can't be checked: sidecut-check builds it with esbuild from this repo's devDependencies, and esbuild isn't installed. Bun's bundler can't stand in, because the check compares the bytes of the two builds.",
        `Add esbuild ${ESBUILD} to devDependencies, install, and build server/index.mjs with it using the options in the template's scripts/build-server.ts.`,
      );
      return null;
    }
    try {
      const result = build({
        absWorkingDir: root,
        entryPoints: [relative(root, source)],
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node24',
        preserveSymlinks: true,
        outfile: built,
        metafile: true,
        logLevel: 'silent',
        banner: {
          js: `import { createRequire as ${requireName(root)} } from 'node:module'; const require = ${requireName(root)}(import.meta.url);`,
        },
      });
      inputs = Object.keys(result.metafile.inputs);
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (failure !== undefined) {
      report.add(
        'SERVER_BUILD',
        where,
        undefined,
        `The server doesn't build: ${failure.split('\n')[0]}`,
        'Run `npm install`, then fix the build error.',
      );
    } else if (!readFileSync(built).equals(readFileSync(bundle))) {
      report.add(
        'SERVER_BUNDLE_STALE',
        relative(root, bundle),
        undefined,
        "The committed bundle doesn't match the source.",
        'Run `npm run build` and commit server/index.mjs.',
      );
    }
    if (inputs) {
      // Every package the bundle inlines ships its licence notice next to the bundle.
      const packages = [
        ...new Set(
          // The last node_modules folder in a path, so nested and isolated-store copies count as themselves.
          inputs.flatMap(
            (p) => [...p.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g)].at(-1)?.[1] ?? [],
          ),
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
          'Run `npm run build`, which writes server/THIRD_PARTY_LICENSES.txt.',
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
  return new Map(listing.tools.map((t) => [t.name, t.annotations?.readOnlyHint === true]));
}
