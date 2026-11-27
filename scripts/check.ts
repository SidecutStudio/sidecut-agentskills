#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { checkExternalLinks } from '../plugins/sidecut-agentskills/server/src/check/docs.ts';
import { checkRepo } from '../plugins/sidecut-agentskills/server/src/check/repo.ts';
import { type Problem, Report } from '../plugins/sidecut-agentskills/server/src/check/report.ts';

const usage = `Usage: sidecut-check [<repo>] [--json] [--fast] [--links] [--annotate] [--base <ref>]

Checks a repo of any kind against the Sidecut house style. Exits 1 when it finds a problem.

  --fast      only the quick rules over text and shape, for a pre-push hook
  --links     also check external links (uses the network; run it on a schedule)
  --annotate  print GitHub annotations: problems everywhere, advisories on lines changed since
              the base. On by default in GitHub Actions.
  --base      the ref to compare with (default: the pull request's base, or the previous commit)`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: 'boolean' },
    fast: { type: 'boolean' },
    links: { type: 'boolean' },
    annotate: { type: 'boolean' },
    base: { type: 'string' },
    help: { type: 'boolean' },
  },
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}

const root = resolve(positionals[0] ?? '.');
const report = new Report();
checkRepo(root, report, { fast: values.fast });
if (values.links) await checkExternalLinks(root, report);

/** The lines changed since `base`, by file, from git's zero-context diff. */
function changedLines(base: string): Map<string, Set<number>> | null {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  const diff = spawnSync(
    'git',
    ['diff', '--unified=0', '--no-color', '--src-prefix=a/', '--dst-prefix=b/', `${base}...HEAD`],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (diff.status !== 0) return null;
  const changed = new Map<string, Set<number>>();
  let file = '';
  for (const line of diff.stdout.split('\n')) {
    const to = /^\+\+\+ b\/(.+)$/.exec(line);
    if (to) file = to[1] ?? '';
    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk && file) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      const lines = changed.get(file) ?? new Set<number>();
      for (let n = start; n < start + count; n++) lines.add(n);
      changed.set(file, lines);
    }
  }
  return changed;
}

const escapeData = (text: string) =>
  text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const where = (p: Problem) =>
  `file=${escapeData(p.file).replaceAll(',', '%2C').replaceAll(':', '%3A')}${p.line ? `,line=${p.line}` : ''}`;

/** Annotations: every problem, advisories on changed lines only, and one summary per advisory kind. */
function annotate(base: string): void {
  for (const p of report.problems)
    console.log(`::error ${where(p)},title=${p.code}::${escapeData(`${p.message} Fix: ${p.fix}`)}`);
  const changed = changedLines(base);
  if (!changed && report.advisories.length)
    console.log(
      `::notice title=Advisories::${escapeData(`Couldn't compare with ${base}, so no advisory is shown on its line; fetch the base branch with enough history.`)}`,
    );
  const kinds = new Map<string, { all: number; shown: number; sample: Problem }>();
  for (const p of report.advisories) {
    const kind = kinds.get(p.code) ?? { all: 0, shown: 0, sample: p };
    kind.all++;
    // A finding about a whole file shows when the file changed at all.
    const lines = changed?.get(p.file);
    if (lines && (p.line === undefined || lines.has(p.line))) {
      kind.shown++;
      console.log(
        `::warning ${where(p)},title=${p.code}::${escapeData(`${p.message} Fix: ${p.fix}`)}`,
      );
    }
    kinds.set(p.code, kind);
  }
  for (const [code, kind] of kinds)
    console.log(
      `::notice title=${code}::${escapeData(`${kind.all} in the repo, ${kind.shown} on changed lines. ${kind.sample.fix}`)}`,
    );
}

if (values.json)
  console.log(
    JSON.stringify(
      {
        scope: report.scope,
        notes: report.notes,
        problems: report.problems,
        advisories: report.advisories,
        kept: report.kept,
      },
      null,
      2,
    ),
  );
else {
  const defaultBase = () =>
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD~1';
  const base =
    values.annotate || values.base || process.env.GITHUB_ACTIONS === 'true'
      ? (values.base ?? defaultBase())
      : undefined;
  console.log(report.scope);
  for (const note of report.notes) console.log(`Not checked: ${note}`);
  if (base !== undefined) annotate(base);
  else {
    // One line per advisory kind and where it shows up: advice, not failures.
    const kinds = new Map<string, Problem[]>();
    for (const p of report.advisories) kinds.set(p.code, [...(kinds.get(p.code) ?? []), p]);
    for (const [code, found] of kinds) {
      const first = found[0];
      if (!first) continue;
      const files = [...new Set(found.map((p) => p.file))];
      const more = files.length > 5 ? `, and ${files.length - 5} more` : '';
      console.log(
        `Advisory ${code} (${found.length}): ${first.message} ${files.slice(0, 5).join(', ')}${more}.`,
      );
    }
  }
  const kept = new Set(
    report.kept.map((p) => `Kept on purpose: ${p.code} ${p.file} (${p.reason})`),
  );
  for (const line of kept) console.log(line);
  console.log(
    report.problems.length === 0
      ? 'House style: no problems.'
      : `${report.format()}\n\n${report.problems.length} problems.`,
  );
}
process.exit(report.problems.length === 0 ? 0 : 1);
