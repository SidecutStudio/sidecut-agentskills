#!/usr/bin/env node
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  STAMP_FILE,
  stampProblems,
} from '../plugins/sidecut-agentskills/server/src/check/evals-stamp.ts';

const usage = `Usage: sidecut-evals-stamp [<repo>]

Checks that every folder ${STAMP_FILE} lists still matches the hash sidecut-evals stamped on it.
sidecut-check runs the same check; this is for repos that don't run sidecut-check. Passes when the
repo has no ${STAMP_FILE}. Exits 1 when a copy was edited here instead of at its source.`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean' } },
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
const problems = stampProblems(resolve(positionals[0] ?? '.'));
if (problems.length === 0) {
  console.log('Every copied evals folder matches its stamp.');
  process.exit(0);
}
for (const problem of problems) console.error(problem.message);
console.error(
  '\nEdit the evals at their source and sync again, or delete evals-source.json to own them here.',
);
process.exit(1);
