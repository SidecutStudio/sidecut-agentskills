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
/** A git command started from Node or Bun. */
const RUNS_GIT =
  /\b(?:spawn|spawnSync|execFile|execFileSync|exec|execSync|execa|execaSync)\(\s*['"`]git[\s'"`]|\bBun\.spawn(?:Sync)?\(\s*(?:\{\s*cmd:\s*)?\[\s*['"`]git['"`]|\$`git\s/;
/** Code that drops the GIT_* variables. */
const DROPS_GIT_ENV = /startsWith\(\s*['"`]GIT_['"`]\s*\)|\/\^GIT_/;

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
    const hit = ['', '.ts', '.js', '.mjs', '.cjs', '/index.ts', '/index.js'].find((ext) => {
      const p = join(root, base + ext);
      return existsSync(p) && statSync(p).isFile();
    });
    return hit === undefined ? [] : [base + hit];
  });
}

/** The preload files the repo's test runner loads before every test. */
function setupFiles(root: string): string[] {
  const named: string[] = [];
  for (const config of readdirSync(root).filter((n) =>
    /^vite(?:st)?\.config\.[cm]?[jt]s$/.test(n),
  )) {
    const text = readFileSync(join(root, config), 'utf8');
    const list = /setupFiles\s*:\s*(\[[^\]]*\]|['"][^'"]+['"])/.exec(text)?.[1] ?? '';
    named.push(...[...list.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1] ?? ''));
  }
  if (existsSync(join(root, 'bunfig.toml'))) {
    const text = readFileSync(join(root, 'bunfig.toml'), 'utf8');
    const list = /preload\s*=\s*(\[[^\]]*\]|"[^"]+")/.exec(text)?.[1] ?? '';
    named.push(...[...list.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? ''));
  }
  return named
    .map((p) => relative(root, join(root, p)).split(sep).join('/'))
    .filter((p) => existsSync(join(root, p)));
}

/** Reports test code that runs git without dropping the GIT_* variables a hook exports. */
export function checkTestGitEnv(root: string, report: Report): void {
  const texts = new Map<string, string>();
  const read = (file: string) => {
    let text = texts.get(file);
    if (text === undefined) {
      text = readFileSync(join(root, file), 'utf8');
      texts.set(file, text);
    }
    return text;
  };
  // A file drops the variables when it, or a file it imports, does.
  const drops = (file: string, depth = 0): boolean =>
    DROPS_GIT_ENV.test(read(file)) ||
    (depth < 3 && importsOf(root, file, read(file)).some((f) => drops(f, depth + 1)));
  const files = codeFiles(root).filter(isTest);
  const offenders = files.filter((file) => RUNS_GIT.test(read(file)));
  if (offenders.length === 0) return;
  if (setupFiles(root).some((file) => drops(file))) return;
  for (const file of offenders.filter((f) => !drops(f))) {
    const line = read(file)
      .split('\n')
      .findIndex((l) => RUNS_GIT.test(l));
    report.add(
      'TEST_GIT_ENV',
      file,
      line >= 0 ? line + 1 : undefined,
      'This test runs git, and nothing drops the GIT_* variables a git hook exports, so run from a hook its git acts on this checkout instead of its fixture repo.',
      "Drop them in the test preload, as the git-env block in the template's tests/setup.ts does (`npm exec --no -- sidecut-sync` adds it to an existing tests/setup.ts), or in this file before it runs git.",
    );
  }
}
