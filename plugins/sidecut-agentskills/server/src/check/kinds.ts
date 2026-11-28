// Repo kinds: a plugin repo, an app, a marketplace, an ops repo, a site or a data repo. Each kind has
// a template in templates/kinds/ whose sections its AGENTS.md keeps, in the same order.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderFile } from '../scaffold.ts';
import { current, packageConfig } from '../settings.ts';
import { SOLO_BLOCK, SOLO_END, SOLO_FILE, SOLO_HEADINGS, SOLO_START } from '../sidecut-profile.ts';
import type { Fleet } from './fleet.ts';
import { repoName } from './fleet.ts';
import { parseMarkdown, sections } from './markdown.ts';
import type { Report } from './report.ts';

export const KINDS = ['plugin', 'app', 'marketplace', 'ops', 'site', 'data'] as const;
export type Kind = (typeof KINDS)[number];

export type KindFound = { kind: Kind; how: 'declared' | 'listed' | 'inferred' };

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const SITE_TOOLS = ['astro', 'next', '@docusaurus/core', 'vitepress', '@11ty/eleventy'];

/**
 * The repo's kind: what `package.json` `sidecut.kind` declares, else the fleet's repo index, else a
 * guess from its files. `ships` says the repo exists to ship one plugin.
 */
export function repoKind(
  root: string,
  fleet: Fleet | null,
  ships: boolean,
  report: Report,
): KindFound {
  const pkg = readJson(join(root, 'package.json'));
  const declared = packageConfig(pkg).kind;
  if (declared !== undefined) {
    if (KINDS.includes(declared as Kind)) return { kind: declared as Kind, how: 'declared' };
    report.add(
      'REPO_KIND',
      'package.json',
      undefined,
      `The kind in package.json is "${String(declared)}", which isn't a repo kind.`,
      `Use one of ${KINDS.join(', ')}.`,
    );
  }
  const listed = fleet?.kinds.get(repoName(root));
  if (listed && KINDS.includes(listed as Kind)) return { kind: listed as Kind, how: 'listed' };
  if (ships) return { kind: 'plugin', how: 'inferred' };
  const market = readJson(join(root, '.claude-plugin', 'marketplace.json'));
  if (existsSync(join(root, 'bundled')) || ((market?.plugins as unknown[]) ?? []).length > 1)
    return { kind: 'marketplace', how: 'inferred' };
  if (existsSync(join(root, '.github', 'actions'))) return { kind: 'ops', how: 'inferred' };
  if (!pkg) return { kind: 'data', how: 'inferred' };
  const deps = { ...(pkg.dependencies as object), ...(pkg.devDependencies as object) };
  if (SITE_TOOLS.some((tool) => tool in deps)) return { kind: 'site', how: 'inferred' };
  return { kind: 'app', how: 'inferred' };
}

/** The kind's AGENTS.md template, with the workflow's block when the profile has one. */
export function kindTemplate(kind: Exclude<Kind, 'plugin'>): string {
  const solo = current().workflow === 'solo';
  return renderFile(`kinds/${kind}.md.tmpl`, { workflowBlock: solo ? `\n\n${SOLO_BLOCK}` : '' });
}

/** The H2 headings a kind's AGENTS.md keeps, in order, leaving out the workflow's own. */
export function kindSections(kind: Exclude<Kind, 'plugin'>): string[] {
  const doc = parseMarkdown('AGENTS.md', kindTemplate(kind));
  return sections(doc).map((h) => h.text);
}

/** Whether `want` appears in `have` in the same order, with anything else allowed between. */
function inOrder(have: string[], want: string[]): boolean {
  let at = 0;
  for (const name of have) if (name === want[at]) at++;
  return at === want.length;
}

/** AGENTS.md with Solo's block written in, replacing the old one or added at the end. */
export function withSoloBlock(text: string): string {
  const start = text.indexOf(SOLO_START);
  const end = text.indexOf(SOLO_END);
  if (start >= 0 && end > start)
    return text.slice(0, start) + SOLO_BLOCK + text.slice(end + SOLO_END.length);
  return `${text.replace(/\s*$/, '')}\n\n${SOLO_BLOCK}\n`;
}

/** The checks every repo that isn't a plugin repo gets for its shape. */
export function checkShape(root: string, kind: Exclude<Kind, 'plugin'>, report: Report): void {
  const agents = join(root, 'AGENTS.md');
  if (kind === 'data' && !existsSync(join(root, 'README.md')))
    report.add(
      'SHAPE_AGENTS',
      'README.md',
      undefined,
      'A data repo has no README.md saying what the data is.',
      'Add one: what the data is, where it comes from and who reads it.',
    );
  if (!existsSync(agents)) {
    if (kind !== 'data')
      report.add(
        'SHAPE_AGENTS',
        'AGENTS.md',
        undefined,
        `There is no AGENTS.md, which every ${kind} repo keeps.`,
        `Start it from templates/kinds/${kind}.md.tmpl in sidecut-agentskills.`,
      );
    return;
  }
  const text = readFileSync(agents, 'utf8');
  const found = sections(parseMarkdown(agents, text)).map((h) => h.text);
  const want = kindSections(kind);
  if (!inOrder(found, want)) {
    const missing = want.filter((name) => !found.includes(name));
    report.add(
      'SHAPE_SECTIONS',
      'AGENTS.md',
      undefined,
      missing.length > 0
        ? `AGENTS.md has no ${missing.map((m) => `"${m}"`).join(', ')} section.`
        : `AGENTS.md has the ${kind} sections out of order.`,
      `Keep ${want.map((w) => `"${w}"`).join(', ')} in that order; the repo's own sections can go between them.`,
    );
  }
  if (
    current().workflow === 'solo' &&
    existsSync(join(root, SOLO_FILE)) &&
    !text.includes(SOLO_BLOCK)
  )
    report.add(
      'SHAPE_SOLO',
      'AGENTS.md',
      undefined,
      text.includes(SOLO_START)
        ? `The ${SOLO_HEADINGS[0]} block isn't the current wording.`
        : `AGENTS.md has no ${SOLO_HEADINGS[0]} block.`,
      'Run `sidecut-sync --fix`, which writes the current block.',
      { what: `Wrote the current ${SOLO_HEADINGS[0]} block.`, apply: withSoloBlock },
    );
  checkClaude(root, report);
}

/** CLAUDE.md is a pointer to AGENTS.md, so the two never drift. */
export function checkClaude(root: string, report: Report): void {
  const path = join(root, 'CLAUDE.md');
  const text = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (text?.split('\n').some((line) => line.trim() === '@AGENTS.md')) return;
  report.add(
    'SHAPE_CLAUDE',
    'CLAUDE.md',
    1,
    text === null
      ? 'There is no CLAUDE.md, so Claude Code never reads AGENTS.md.'
      : "CLAUDE.md doesn't import AGENTS.md, so the two can drift.",
    'Put an `@AGENTS.md` line at the top; `sidecut-sync --fix` adds it.',
    {
      what: 'Imported AGENTS.md at the top of CLAUDE.md.',
      apply: (have) => (have.trim() === '' ? '@AGENTS.md\n' : `@AGENTS.md\n\n${have}`),
    },
  );
}
