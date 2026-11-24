import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  ANTIGRAVITY_HOOKS,
  ANTIGRAVITY_MANIFEST,
  ANTIGRAVITY_MCP,
  antigravityFiles,
  SKILL_LOG_HOOK,
} from '../antigravity.ts';
import {
  displayNameOf,
  OLD_USER_INPUT_PATH,
  renderFile,
  settingsVars,
  USER_INPUT_PATH,
  userInput,
} from '../scaffold.ts';
import { repoSettings } from '../settings.ts';

/** Files sidecut-agentskills owns whole in every plugin repo. */
export const OWNED_FILES = [
  'CLAUDE.md',
  'VOICE.md',
  'scripts/eval.mjs',
  'scripts/build-server.ts',
  'scripts/release.ts',
];
export function pluginOwnedFile(id: string): string {
  return `plugins/${id}/${USER_INPUT_PATH}`;
}
/** The plugin files sync writes beside the guide: the usage log hook and Antigravity's files. */
export function pluginSyncFiles(id: string): string[] {
  return [`hooks/${SKILL_LOG_HOOK}`, ANTIGRAVITY_MANIFEST, ANTIGRAVITY_MCP, ANTIGRAVITY_HOOKS].map(
    (path) => `plugins/${id}/${path}`,
  );
}

/** Files where sidecut-agentskills owns only the marked blocks; the rest belongs to the repo. */
export const BLOCK_FILES = ['.gitignore', 'AGENTS.md', 'SECURITY.md'];
/** devDependencies sync raises to the template's version, never lowers. */
const SHARED_TOOLS = [
  '@biomejs/biome',
  '@types/node',
  'esbuild',
  'lefthook',
  'smol-toml',
  'typescript',
  'vitest',
];
const CHECKER = 'github:SidecutStudio/sidecut-agentskills#v';

/**
 * One change sync would make. `next` is the file's new content, or null when sync can't make the
 * change safely and someone has to fix the file by hand first.
 */
export type Change = {
  file: string;
  what: string;
  next: string | null;
  remove?: boolean;
  /** The plugin rule that already reports this difference, so the repo check doesn't say it twice. */
  code?: string;
};

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
      // Fences are read over the whole file, so one that opens above the anchor still counts.
      const code = fenced(have).slice(at + 1);
      rest = rest.filter((line, i) => code[i] || !covered.has(line));
    }
    const spaced = file === '.gitignore' ? body : ['', ...body, ''];
    have = collapse([...head, ...spaced, ...rest]);
  }
  const text = have.join('\n');
  return { text: crlf ? text.replaceAll('\n', '\r\n') : text };
}

/** Whether two JSON texts hold the same value, so formatting alone never counts as a change. */
function sameParsed(a: string, b: string): boolean {
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return false;
  }
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
  const npm = (s: unknown) => String(s ?? '').replace(/^npm@/, '');
  if (newer(npm(template.packageManager), npm(pkg.packageManager))) {
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
 * whether sidecut.keep covers a file, or `code` (the plugin rule that reports it), so a kept file is
 * never planned.
 */
export function planSync(
  root: string,
  vars: SyncVars,
  kept: (file: string, code?: string) => boolean = () => false,
): Change[] {
  const changes: Change[] = [];
  const settings = settingsVars(vars.id, repoSettings(root));
  const render = (file: string) =>
    renderFile(`repo/${file}.tmpl`, {
      ...settings,
      id: vars.id,
      repo: vars.repo,
      displayName: displayNameOf(vars.id),
    });
  const guide = pluginOwnedFile(vars.id);
  for (const file of [...OWNED_FILES, guide]) {
    if (kept(file)) continue;
    const want = file === guide ? userInput() : render(file);
    const path = join(root, file);
    const have = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (have !== want)
      changes.push({
        file,
        what: have === null ? `${file} is missing.` : `${file} differs from the template copy.`,
        next: want,
      });
  }
  // The usage log hook is the template's copy, and Antigravity's files follow from the Claude Code
  // and Codex ones (2.6.0), so a plugin made before either gets them here.
  const hook = `plugins/${vars.id}/hooks/${SKILL_LOG_HOOK}`;
  if (!kept(hook, 'HOOK_SKILL_LOG') && existsSync(join(root, hook))) {
    const want = renderFile(`plugin/hooks/${SKILL_LOG_HOOK}.tmpl`, settings);
    if (readFileSync(join(root, hook), 'utf8') !== want)
      changes.push({
        file: hook,
        what: `${hook} differs from the template copy.`,
        next: want,
        code: 'HOOK_SKILL_LOG',
      });
  }
  for (const { path, text } of antigravityFiles(join(root, 'plugins', vars.id)) ?? []) {
    const file = `plugins/${vars.id}/${path}`;
    const have = existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : null;
    if (text === null) {
      if (have !== null && !kept(file, 'ANTIGRAVITY_UNEXPECTED'))
        changes.push({
          file,
          what: `${file} has nothing to describe.`,
          next: '',
          remove: true,
          code: 'ANTIGRAVITY_UNEXPECTED',
        });
    } else if (have === null) {
      if (!kept(file, 'ANTIGRAVITY_MISSING'))
        changes.push({
          file,
          what: `${file} is missing.`,
          next: text,
          code: 'ANTIGRAVITY_MISSING',
        });
    } else if (!sameParsed(have, text) && !kept(file, 'ANTIGRAVITY_SYNC'))
      changes.push({
        file,
        what: `${file} doesn't match the Claude Code and Codex files.`,
        next: text,
        code: 'ANTIGRAVITY_SYNC',
      });
  }
  // 2.3.0 renamed the guide from owner-input.md: drop the old copy and point the plugin's own text
  // at the new one.
  const oldGuide = `plugins/${vars.id}/${OLD_USER_INPUT_PATH}`;
  for (const file of guideMoveFiles(root, vars.id)) {
    if (kept(file)) continue;
    if (file === oldGuide) {
      changes.push({ file, what: `${file} is now ${guide}.`, next: '', remove: true });
      continue;
    }
    const have = readFileSync(join(root, file), 'utf8');
    changes.push({
      file,
      what: `${file} points at ${OLD_USER_INPUT_PATH}, now ${USER_INPUT_PATH}.`,
      next: have.replaceAll(OLD_USER_INPUT_PATH, USER_INPUT_PATH),
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
        what: `The template blocks in ${file} are out of date.`,
        next: merged.text,
      });
  }
  if (!kept('package.json')) {
    const pkg = planPackage(root, vars);
    if (pkg) changes.push(pkg);
  }
  return changes;
}

/**
 * The files moving the guide from its old name touches: the old copy, and every Markdown file in the
 * plugin that points at it. Sync's uncommitted-changes guard covers them too.
 */
export function guideMoveFiles(root: string, id: string): string[] {
  const plugin = `plugins/${id}`;
  const oldGuide = `${plugin}/${OLD_USER_INPUT_PATH}`;
  const pointers = markdownUnder(root, plugin).filter(
    (file) =>
      file !== oldGuide && readFileSync(join(root, file), 'utf8').includes(OLD_USER_INPUT_PATH),
  );
  return [...(existsSync(join(root, oldGuide)) ? [oldGuide] : []), ...pointers];
}

/** The Markdown files under `dir`, relative to `root`, leaving out installed dependencies. */
function markdownUnder(root: string, dir: string): string[] {
  const path = join(root, dir);
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : markdownUnder(root, file);
    return entry.name.endsWith('.md') ? [file] : [];
  });
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
    if (change.remove) {
      rmSync(path, { force: true });
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, change.next);
  }
  return left;
}
