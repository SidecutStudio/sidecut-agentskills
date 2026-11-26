// A git hook exports GIT_DIR, GIT_INDEX_FILE and friends to everything it runs, tests included. A
// test whose git command inherits them acts on the checkout running the hook instead of its fixture
// repo: one wrote core.bare=true into a real checkout. This finds test code that runs git where
// neither the code, what it imports, nor the test preload drops those variables first.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import type { Report } from './report.ts';

const SKIP = new Set([
  'node_modules',
  '.git',
  '.claude',
  '.codex',
  'dist',
  'build',
  'coverage',
  'eval-results',
  '.next',
]);
const CODE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
/**
 * A git command started from Node or Bun: `git` as the command, or inside a shell command string
 * (`cd x && git init`). A command held in a variable or behind an alias isn't seen.
 */
const RUNS_GIT =
  /\b(?:spawn|spawnSync|execFile|execFileSync|execa|execaSync)\(\s*['"`](?:[^'"`]*\/)?git['"`]|\b(?:exec|execSync)\(\s*['"`](?:[^'"`]*(?:&&|;|\|)\s*)?(?:[^'"`\s]*\/)?git\s|\bBun\.spawn(?:Sync)?\(\s*(?:\{\s*cmd:\s*)?\[\s*['"`](?:[^'"`]*\/)?git['"`]|\$`(?:[^`]*(?:&&|;)\s*)?git\s/;
/**
 * Code that drops the GIT_* variables: deleting the ones that start with GIT_ (in the same statement
 * or the loop body that follows), or building an env that leaves them out. Reading them, as a filter
 * that keeps them does, doesn't count.
 */
const DROPS_GIT_ENV =
  /startsWith\(\s*['"`]GIT_['"`]\s*\)[^;]{0,120}?\bdelete\b|\/\^GIT_\/\.test\([^;]{0,120}?\bdelete\b|!\s*[\w.[\]]+\.startsWith\(\s*['"`]GIT_['"`]\s*\)|!\s*\/\^GIT_\/\.test\(/;
/** Deleting by name counts only when it covers both variables a hook always exports. */
const DELETES_BY_NAME = ['GIT_DIR', 'GIT_INDEX_FILE'].map(
  (name) =>
    new RegExp(`\\bdelete\\s+process\\.env(?:\\.${name}\\b|\\[\\s*['"\`]${name}['"\`]\\s*\\])`),
);
function dropsGitEnv(text: string): boolean {
  return DROPS_GIT_ENV.test(text) || DELETES_BY_NAME.every((re) => re.test(text));
}

/**
 * Walks `text` from `from` and returns the index after the parenthesis that closes the one at
 * `from`, skipping strings, so a call's arguments end where the call does.
 */
function callEnd(text: string, from: number): number {
  let depth = 0;
  let quote = '';
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i + 1;
  }
  return text.length;
}

/**
 * Whether the git call matched at `at` passes an env object literal with no spread, so the git it
 * runs can't inherit the variables. Only that call's own arguments are read.
 */
function ownEnv(text: string, at: number): boolean {
  const open = text.indexOf('(', at);
  const call = text.slice(open, callEnd(text, open));
  const env = /\benv\s*:\s*\{([^}]*)\}/.exec(call);
  return env !== null && !/\.\.\./.test(env[1] ?? '');
}

/**
 * The code with its comments blanked out, newlines kept so line numbers hold. Strings are skipped,
 * so a glob such as 'src/**' + '/*.ts' isn't taken for a comment.
 */
function stripComments(text: string): string {
  let out = '';
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? '';
    if (quote) {
      out += c;
      if (c === '\\') out += text[++i] ?? '';
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      out += c;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, '');
      i = stop - 1;
    } else out += c;
  }
  return out;
}

function isTest(path: string): boolean {
  const parts = path.split('/');
  return (
    parts.slice(0, -1).some((p) => p === 'test' || p === 'tests' || p === '__tests__') ||
    /\.(?:test|spec)\.[^/]+$/.test(path)
  );
}

function codeFiles(root: string, dir = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...codeFiles(root, path));
    else if (entry.isFile() && CODE.test(entry.name)) out.push(path);
  }
  return out;
}

/** The repo files `file` imports by a relative path. */
function importsOf(root: string, file: string, text: string): string[] {
  const specs = [
    ...text.matchAll(
      /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\(\s*|^\s*import\s+)['"](\.\.?\/[^'"]+)['"]/gm,
    ),
  ].map((m) => m[1] ?? '');
  return specs.flatMap((spec) => {
    const base = join(dirname(file), spec).split(sep).join('/');
    // TypeScript imports name the .js file the .ts one compiles to.
    const stem = base.replace(/\.[cm]?js$/, '');
    const tries = [
      base,
      ...['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '/index.ts', '/index.js'].map(
        (ext) => stem + ext,
      ),
    ];
    const hit = tries.find((p) => existsSync(join(root, p)) && statSync(join(root, p)).isFile());
    return hit === undefined ? [] : [hit];
  });
}

/** The preload files the repo's test runner loads before every test. */
function setupFiles(root: string): string[] {
  const named: string[] = [];
  const quoted = (list: string) => [...list.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
  // Vitest, Vite and Jest configs name them in setupFiles (Jest also in setupFilesAfterEnv).
  for (const config of readdirSync(root).filter((n) =>
    /^(?:vite(?:st)?\.(?:config|workspace)|jest\.config)\.[cm]?[jt]s$/.test(n),
  )) {
    const text = readFileSync(join(root, config), 'utf8');
    for (const m of text.matchAll(/setupFiles(?:AfterEnv)?\s*:\s*(\[[^\]]*\]|['"][^'"]+['"])/g))
      named.push(...quoted(m[1] ?? ''));
  }
  if (existsSync(join(root, 'bunfig.toml'))) {
    const text = readFileSync(join(root, 'bunfig.toml'), 'utf8');
    named.push(...quoted(/preload\s*=\s*(\[[^\]]*\]|"[^"]+")/.exec(text)?.[1] ?? ''));
  }
  // package.json: Jest's own key, and a preload named on a test script's command line.
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    for (const key of ['setupFiles', 'setupFilesAfterEnv'])
      if (Array.isArray(pkg.jest?.[key])) named.push(...pkg.jest[key].map(String));
    for (const script of Object.values(pkg.scripts ?? {}))
      for (const m of String(script).matchAll(/--(?:preload|import|require|setupFiles)[ =](\S+)/g))
        named.push(m[1] ?? '');
  } catch {
    // A missing or broken package.json names no preload.
  }
  return named
    .map((p) =>
      relative(root, join(root, p.replace(/^<rootDir>\//, '')))
        .split(sep)
        .join('/'),
    )
    .filter((p) => existsSync(join(root, p)) && statSync(join(root, p)).isFile());
}

/** Reports test code that runs git without dropping the GIT_* variables a hook exports. */
export function checkTestGitEnv(root: string, report: Report): void {
  const texts = new Map<string, string>();
  const read = (file: string) => {
    let text = texts.get(file);
    if (text === undefined) {
      text = stripComments(readFileSync(join(root, file), 'utf8'));
      texts.set(file, text);
    }
    return text;
  };
  // A file drops the variables when it, or a file it imports, does.
  const drops = (file: string, depth = 0): boolean =>
    dropsGitEnv(read(file)) ||
    (depth < 3 && importsOf(root, file, read(file)).some((f) => drops(f, depth + 1)));
  // The first git call that inherits this process's environment, as an index into the text.
  const inheritedGit = (file: string): number => {
    const text = read(file);
    const runs = new RegExp(RUNS_GIT.source, 'g');
    for (const m of text.matchAll(runs)) if (!ownEnv(text, m.index)) return m.index;
    return -1;
  };
  const files = codeFiles(root).filter(isTest);
  const offenders = files.filter((file) => inheritedGit(file) >= 0);
  if (offenders.length === 0) return;
  if (setupFiles(root).some((file) => drops(file))) return;
  for (const file of offenders.filter((f) => !drops(f))) {
    const line = read(file).slice(0, inheritedGit(file)).split('\n').length - 1;
    report.add(
      'TEST_GIT_ENV',
      file,
      line >= 0 ? line + 1 : undefined,
      'This test runs git, and nothing drops the GIT_* variables a git hook exports, so run from a hook its git acts on this checkout instead of its fixture repo.',
      "Drop them in the test preload, as the git-env block in the template's tests/setup.ts does (`npm exec --no -- sidecut-sync` adds it to an existing tests/setup.ts), or in this file before it runs git.",
    );
  }
}
