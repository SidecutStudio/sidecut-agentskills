import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  SettingsNeeded,
  scaffoldPlugin,
} from '../plugins/sidecut-agentskills/server/src/scaffold.ts';
import type { SettingsInput } from '../plugins/sidecut-agentskills/server/src/settings.ts';

const usage = `Usage: npm run new plugin <id> --description <text> --long-description <text> --keywords <a,b,c> [--checker <package spec>] [--out <dir>]
  [--profile <name>] [--org <owner>] [--author <name>] [--author-url <url>] [--homepage <url>]
  [--prefix <prefix->] [--marketplace <owner/repo>] [--ci hosted|sidecut] [--save]

Creates a new plugin repo with Claude Code and Codex manifests, one skill and a bundled MCP server.
Settings come from ~/.config/agentskills/settings.json, then these flags; --save keeps them there.
With neither, it lists what to answer and writes nothing.`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    description: { type: 'string' },
    'long-description': { type: 'string' },
    keywords: { type: 'string' },
    checker: { type: 'string' },
    out: { type: 'string' },
    profile: { type: 'string' },
    org: { type: 'string' },
    author: { type: 'string' },
    'author-url': { type: 'string' },
    homepage: { type: 'string' },
    prefix: { type: 'string' },
    marketplace: { type: 'string' },
    ci: { type: 'string' },
    save: { type: 'boolean' },
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
const given: Record<string, string | undefined> = {
  profile: values.profile,
  org: values.org,
  authorName: values.author,
  authorUrl: values['author-url'],
  homepage: values.homepage,
  prefix: values.prefix,
  marketplace: values.marketplace,
  ci: values.ci,
};
const settings = Object.fromEntries(
  Object.entries(given).filter(([, v]) => v !== undefined),
) as SettingsInput;
try {
  const files = scaffoldPlugin(
    {
      id,
      description: values.description,
      longDescription: values['long-description'],
      keywords: values.keywords.split(',').map((k) => k.trim()),
      checkerSource: values.checker,
      settings,
      save: values.save,
    },
    out,
  );
  console.log(`Wrote ${files.length} files to ${out}`);
} catch (error) {
  if (error instanceof SettingsNeeded) {
    console.error('Answer these once, as flags, and add --save to keep them:');
    for (const q of error.questions) console.error(`  ${q.key}: ${q.ask}`);
  } else console.error((error as Error).message);
  process.exit(1);
}

for (const args of [['install'], ['run', 'fix'], ['run', 'build']]) {
  const result = spawnSync('npm', args, { cwd: out, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`npm ${args.join(' ')} failed in ${out}`);
    process.exit(1);
  }
}
console.log(`Done. Load it for one session with: claude --plugin-dir ${out}/plugins/${id}`);
