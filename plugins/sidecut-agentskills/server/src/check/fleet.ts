// What a repo can learn about the other repos it lives beside: their checkouts in the same folder,
// the fleet's repo index and the map of which repo owns each shared fact. All of it is read from
// disk, so a check that needs it says so when the checkout isn't there, as in CI.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { current } from '../settings.ts';
import { SIDECUT_FLEET } from '../sidecut-profile.ts';

/** Runs git in `root` without a hook's GIT_* overrides; undefined when it fails. */
export function git(root: string, ...args: string[]): string | undefined {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  const result = spawnSync('git', args, { cwd: root, env, encoding: 'utf8' });
  return result.status === 0 ? result.stdout : undefined;
}

/** The tracked files of the repo at `root`, or null when it isn't a git checkout. */
export function trackedFiles(root: string): string[] | null {
  const out = git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard');
  if (out === undefined) return null;
  return out
    .split('\0')
    .filter(Boolean)
    .filter((file) => existsSync(join(root, file)));
}

/** The repo's name on its host: origin's last path part, else the folder's name. */
export function repoName(root: string): string {
  const url = git(root, 'remote', 'get-url', 'origin')?.trim() ?? '';
  const fromUrl = /[/:]([\w.-]+?)(?:\.git)?$/.exec(url)?.[1];
  return fromUrl ?? basename(root);
}

/** The owner on its host from origin's URL, or '' with no remote. */
export function repoOwner(root: string): string {
  const url = git(root, 'remote', 'get-url', 'origin')?.trim() ?? '';
  return /github\.com[/:]([\w.-]+)\//.exec(url)?.[1] ?? '';
}

/**
 * The folders that may hold the other repos' checkouts: SIDECUT_REPOS when set, the checked repo's
 * parent, and for a git worktree, the parent of its main checkout.
 */
export function repoFolders(root: string): string[] {
  const found = new Set<string>();
  if (process.env.SIDECUT_REPOS) found.add(resolve(process.env.SIDECUT_REPOS));
  found.add(dirname(resolve(root)));
  const common = git(root, 'rev-parse', '--git-common-dir')?.trim();
  if (common) {
    const dir = isAbsolute(common) ? common : join(root, common);
    if (existsSync(dir)) found.add(dirname(dirname(realpathSync(dir))));
  }
  return [...found];
}

/** The checkout of `name` beside the checked repo, or null. The checked repo is its own. */
export function siblingCheckout(root: string, name: string): string | null {
  if (repoName(root) === name) return root;
  for (const folder of repoFolders(root)) {
    const path = join(folder, name);
    if (existsSync(join(path, '.git'))) return path;
  }
  return null;
}

/** The line without a `#` comment, leaving a `#` inside a quoted string alone. */
function withoutComment(line: string): string {
  let quote = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '#') return line.slice(0, i);
  }
  return line;
}

export type TomlValue = string | number | boolean | string[];
export type TomlTable = Record<string, Record<string, TomlValue>>;

/**
 * Reads the flat TOML these data files use: `[table]` headers and `key = value` lines whose value is
 * a string, number, boolean or one-line array of strings. Keys before any header go under "".
 */
export function readToml(text: string): TomlTable {
  const tables: TomlTable = { '': {} };
  let at = '';
  const lines = text.split('\n').map((raw) => withoutComment(raw).trim());
  for (let n = 0; n < lines.length; n++) {
    let line = lines[n] ?? '';
    // An array may run over several lines until its closing bracket.
    if (/=\s*\[/.test(line) && !line.includes(']'))
      while (n + 1 < lines.length && !line.includes(']')) line += ` ${lines[++n] ?? ''}`;
    if (!line) continue;
    const header = /^\[\[?([^\]]+)\]\]?$/.exec(line);
    if (header) {
      at = (header[1] ?? '').trim();
      tables[at] ??= {};
      continue;
    }
    const pair = /^([\w.-]+)\s*=\s*(.+)$/.exec(line);
    if (!pair) continue;
    const value = (pair[2] ?? '').trim();
    const table = tables[at] ?? {};
    tables[at] = table;
    if (value.startsWith('['))
      table[pair[1] ?? ''] = [...value.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1] ?? '');
    else if (value.startsWith('"')) table[pair[1] ?? ''] = value.slice(1, value.lastIndexOf('"'));
    else if (value === 'true' || value === 'false') table[pair[1] ?? ''] = value === 'true';
    else if (/^-?\d+(\.\d+)?$/.test(value)) table[pair[1] ?? ''] = Number(value);
  }
  return tables;
}

export type Fleet = {
  /** Repo name → its kind, from the repo index. */
  kinds: Map<string, string>;
  /** Fact id → the repo that owns it ("*" for each repo's own) and its file. */
  owners: Map<string, { repo: string; path: string; says: string }>;
  /** Reads a file from a sibling checkout, or null when that checkout isn't here. */
  read: (repo: string, path: string) => string | null;
};

/**
 * The fleet the checked repo belongs to, or null when the profile has none or its data checkout
 * isn't beside this repo. SIDECUT_HOME points at that checkout when it lives elsewhere.
 */
export function readFleet(root: string): Fleet | null {
  if (current().workflow !== 'solo') return null;
  const home = process.env.SIDECUT_HOME
    ? resolve(process.env.SIDECUT_HOME)
    : siblingCheckout(root, SIDECUT_FLEET.home);
  if (!home) return null;
  const file = (name: string) => {
    const path = join(home, SIDECUT_FLEET.data, name);
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  };
  const repos = file(SIDECUT_FLEET.repos);
  const owners = file(SIDECUT_FLEET.owners);
  if (repos === null || owners === null) return null;
  const kinds = new Map<string, string>();
  for (const [table, values] of Object.entries(readToml(repos))) {
    const name = /^repos\.(.+)$/.exec(table)?.[1];
    if (name && typeof values.kind === 'string') kinds.set(name, values.kind);
  }
  const owned = new Map<string, { repo: string; path: string; says: string }>();
  for (const [table, values] of Object.entries(readToml(owners))) {
    const id = /^facts\.(.+)$/.exec(table)?.[1];
    if (id && typeof values.repo === 'string' && typeof values.path === 'string')
      owned.set(id, { repo: values.repo, path: values.path, says: String(values.says ?? '') });
  }
  return {
    kinds,
    owners: owned,
    read: (repo, path) => {
      const checkout = siblingCheckout(root, repo);
      const full = checkout && join(checkout, path);
      return full && existsSync(full) ? readFileSync(full, 'utf8') : null;
    },
  };
}
