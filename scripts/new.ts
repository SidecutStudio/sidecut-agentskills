import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { scaffoldPlugin } from '../plugins/sidecut-agentskills/server/src/scaffold.ts';

const usage = `Usage: bun run new plugin <id> --description <text> --long-description <text> --keywords <a,b,c> [--checker <package spec>] [--out <dir>]

Creates a new plugin repo with Claude Code and Codex manifests, one skill and a bundled MCP server.`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    description: { type: 'string' },
    'long-description': { type: 'string' },
    keywords: { type: 'string' },
    checker: { type: 'string' },
    out: { type: 'string' },
    help: { type: 'boolean' },
  },
});

const [kind, id] = positionals;
if (
  values.help ||
  kind !== 'plugin' ||
  !id ||
  !values.description ||
  !values['long-description'] ||
  !values.keywords
) {
  console.log(usage);
  process.exit(values.help ? 0 : 1);
}

const out = resolve(values.out ?? id);
try {
  const files = scaffoldPlugin(
    {
      id,
      description: values.description,
      longDescription: values['long-description'],
      keywords: values.keywords.split(',').map((k) => k.trim()),
      checkerSource: values.checker,
    },
    out,
  );
  console.log(`Wrote ${files.length} files to ${out}`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

for (const args of [['install'], ['run', 'fix'], ['run', 'build']]) {
  const result = spawnSync('bun', args, { cwd: out, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`bun ${args.join(' ')} failed in ${out}`);
    process.exit(1);
  }
}
console.log(`Done. Load it for one session with: claude --plugin-dir ${out}/plugins/${id}`);
