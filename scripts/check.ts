#!/usr/bin/env bun
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { checkRepo } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import { Report } from '../plugins/sidecut-agentskills/server/src/check/report.ts';

const usage = `Usage: sidecut-check [<repo>] [--json]

Checks a plugin repo against the Sidecut house style. Exits 1 when it finds a problem.`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { json: { type: 'boolean' }, help: { type: 'boolean' } },
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}

const report = new Report();
checkRepo(resolve(positionals[0] ?? '.'), report);
if (values.json)
  console.log(
    JSON.stringify({ scope: report.scope, problems: report.problems, kept: report.kept }, null, 2),
  );
else {
  console.log(report.scope);
  for (const p of report.kept) console.log(`Kept on purpose: ${p.code} ${p.file} (${p.reason})`);
  console.log(
    report.problems.length === 0
      ? 'House style: no problems.'
      : `${report.format()}\n\n${report.problems.length} problems.`,
  );
}
process.exit(report.problems.length === 0 ? 0 : 1);
