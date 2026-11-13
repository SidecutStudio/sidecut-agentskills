import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { displayNameOf, renderFile } from '../scaffold.ts';

/** Files sidecut-agentskills owns whole in every plugin repo. */
export const OWNED_FILES = ['CLAUDE.md', 'scripts/build-server.ts', 'scripts/release.ts'];
/** Files where sidecut-agentskills owns only the marked blocks; the rest belongs to the repo. */
export const BLOCK_FILES = ['.gitignore', 'AGENTS.md', 'SECURITY.md'];
/** devDependencies sync raises to the template's version, never lowers. */
const SHARED_TOOLS = ['@biomejs/biome', '@types/bun', 'lefthook', 'typescript'];
const CHECKER = 'github:SidecutStudio/sidecut-agentskills#v';

/**
 * One change sync would make. `next` is the file's new content, or null when sync can't make the
 * change safely and someone has to fix the file by hand first.
 */
export type Change = { file: string; what: string; next: string | null };

export type SyncVars = { id: string; repo: string; version: string };

const MARK = /^(?:<!--|#) sidecut:(start|end) ([\w-]+)(?: -->)?$/;

type Block = { name: string; start: number; end: number };

/** The marked blocks in `lines`, or a sentence saying why the markers can't be trusted. */
function blocksOf(lines: string[]): Block[] | string {
  const blocks: Block[] = [];
  let open: { name: string; start: number } | null = null;
  for (const [i, line] of lines.entries()) {
    const m = MARK.exec(line);
    if (!m) continue;
    const name = m[2] ?? '';
    if (m[1] === 'start') {
      if (open) return `line ${i + 1} starts block "${name}" inside block "${open.name}"`;
      if (blocks.some((b) => b.name === name)) return `block "${name}" appears twice`;
      open = { name, start: i };
    } else if (!open || open.name !== name)
      return `line ${i + 1} ends block "${name}", which isn't open`;
    else {
      blocks.push({ ...open, end: i });
      open = null;
    }
  }
  return open ? `block "${open.name}" is never ended` : blocks;
}

/** Lines inside ``` fences, which adoption never touches. */
function fenced(lines: string[]): boolean[] {
  let inside = false;
  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inside = !inside;
      return true;
    }
    return inside;
  });
}

/**
 * Puts the template's marked blocks into `current`, leaving everything outside them alone, or
 * returns why it can't. A block the file doesn't have yet goes after the line that comes before it
 * in the template; failing that, after a Markdown file's title, or at the top.
 */
export function mergeBlocks(
  current: string,
  template: string,
  file: string,
): { text: string } | { error: string } {
  const crlf = current.includes('\r\n');
  const want = template.split('\n');
  let have = current.replaceAll('\r\n', '\n').split('\n');
  const templateBlocks = blocksOf(want);
  if (typeof templateBlocks === 'string') throw new Error(`Template ${file}: ${templateBlocks}`);
  for (const block of templateBlocks) {
    const found = blocksOf(have);
    if (typeof found === 'string')
      return { error: `The sidecut markers in ${file} are broken: ${found}.` };
    const body = want.slice(block.start, block.end + 1);
    const same = found.find((b) => b.name === block.name);
    if (same) {
      have = [...have.slice(0, same.start), ...body, ...have.slice(same.end + 1)];
      continue;
    }
    const anchor = want
      .slice(0, block.start)
      .reverse()
      .find((line) => line.trim() !== '' && !MARK.test(line));
    let at = anchor === undefined ? -1 : have.indexOf(anchor);
    if (at < 0 && file.endsWith('.md')) at = have.findIndex((line) => line.startsWith('# '));
    const head = have.slice(0, at + 1);
    let rest = have.slice(at + 1);
    // Adopting a block replaces the lines it now covers, so the file doesn't say them twice. Fenced
    // examples stay, and so does a .gitignore with negations, where line order changes meaning.
    const covered = new Set(body.filter((line) => line.trim() !== ''));
    const keepAll = file === '.gitignore' && have.some((line) => line.startsWith('!'));
    if (!keepAll) {
      const code = fenced(rest);
      rest = rest.filter((line, i) => code[i] || !covered.has(line));
    }
    const spaced = file === '.gitignore' ? body : ['', ...body, ''];
    have = collapse([...head, ...spaced, ...rest]);
  }
  const text = have.join('\n');
  return { text: crlf ? text.replaceAll('\n', '\r\n') : text };
}

function parseVersion(spec: string): number[] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(spec);
  return m ? m.slice(1).map(Number) : null;
}

/** Drops blank lines at the start and repeated blank lines, keeping one final newline. */
function collapse(lines: string[]): string[] {
  const out = lines.filter((line, i) => line !== '' || (i > 0 && lines[i - 1] !== ''));
  while (out.length > 1 && out.at(-1) === '' && out.at(-2) === '') out.pop();
  return out;
}

/** Whether version `a` is newer than `b`; false when either isn't x.y.z. */
export function newer(a: string, b: string): boolean {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}

function planPackage(root: string, vars: SyncVars): Change | null {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  const pkg = JSON.parse(text) as Record<string, unknown>;
  const indent = /^\{\r?\n([ \t]+)"/.exec(text)?.[1] ?? '  ';
  const template = JSON.parse(
    renderFile('repo/package.json.tmpl', {
      id: vars.id,
      version: '0.0.0',
      checkerSource: `${CHECKER}${vars.version}`,
    }),
  ) as { packageManager: string; devDependencies: Record<string, string> };
  const raised: string[] = [];
  const bun = (s: unknown) => String(s ?? '').replace(/^bun@/, '');
  if (newer(bun(template.packageManager), bun(pkg.packageManager))) {
    pkg.packageManager = template.packageManager;
    raised.push(template.packageManager);
  }
  const dev = (pkg.devDependencies ?? {}) as Record<string, string>;
  for (const name of SHARED_TOOLS) {
    const want = template.devDependencies[name];
    if (want && dev[name] && newer(want, dev[name])) {
      dev[name] = want;
      raised.push(`${name} ${want}`);
    }
  }
  const pinned = dev['sidecut-agentskills'];
  if (pinned?.startsWith(CHECKER) && newer(vars.version, pinned.slice(CHECKER.length))) {
    dev['sidecut-agentskills'] = `${CHECKER}${vars.version}`;
    raised.push(`sidecut-agentskills v${vars.version}`);
  }
  if (raised.length === 0) return null;
  return {
    file: 'package.json',
    what: `Behind the template: ${raised.join(', ')}.`,
    next: `${JSON.stringify(pkg, null, indent)}\n`,
  };
}

/**
 * Everything that differs from what sidecut-agentskills owns in the repo at `root`. `kept` says
 * whether sidecut.keep covers a file, so a kept file is never planned.
 */
export function planSync(
  root: string,
  vars: SyncVars,
  kept: (file: string) => boolean = () => false,
): Change[] {
  const changes: Change[] = [];
  const render = (file: string) =>
    renderFile(`repo/${file}.tmpl`, {
      id: vars.id,
      repo: vars.repo,
      displayName: displayNameOf(vars.id),
    });
  for (const file of OWNED_FILES) {
    if (kept(file)) continue;
    const want = render(file);
    const path = join(root, file);
    const have = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (have !== want)
      changes.push({
        file,
        what: have === null ? `${file} is missing.` : `${file} differs from the Sidecut copy.`,
        next: want,
      });
  }
  for (const file of BLOCK_FILES) {
    if (kept(file)) continue;
    const path = join(root, file);
    const template = render(file);
    if (!existsSync(path)) {
      changes.push({ file, what: `${file} is missing.`, next: template });
      continue;
    }
    const have = readFileSync(path, 'utf8');
    const merged = mergeBlocks(have, template, file);
    if ('error' in merged)
      changes.push({ file, what: `${merged.error} Fix them by hand.`, next: null });
    else if (merged.text !== have)
      changes.push({
        file,
        what: `The Sidecut blocks in ${file} are out of date.`,
        next: merged.text,
      });
  }
  if (!kept('package.json')) {
    const pkg = planPackage(root, vars);
    if (pkg) changes.push(pkg);
  }
  return changes;
}

/** Writes every change sync can make safely; returns the ones it left for a person. */
export function applySync(root: string, changes: Change[]): Change[] {
  const left: Change[] = [];
  for (const change of changes) {
    if (change.next === null) {
      left.push(change);
      continue;
    }
    const path = join(root, change.file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, change.next);
  }
  return left;
}
