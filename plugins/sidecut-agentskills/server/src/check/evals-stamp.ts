// The one implementation of the evals stamp: the tree hash sidecut-evals writes into a repo's
// evals-source.json, and the check that every copy it lists still matches. sidecut-evals imports
// treeHash from bin/evals-hash.mjs, sidecut-check runs stampProblems, and repos not built from the
// template run it as sidecut-evals-stamp.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

export const STAMP_FILE = 'evals-source.json';

/** Every file under dir except .DS_Store, as sorted paths relative to it with `/` separators. */
export function treeFiles(dir: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (d: string) => {
    // A symlink back up the tree would otherwise walk forever.
    const real = realpathSync(d);
    if (seen.has(real)) throw new Error(`${relative(dir, d) || '.'} links back into the copy.`);
    seen.add(real);
    for (const name of readdirSync(d)) {
      if (name === '.DS_Store') continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join('/'));
    }
    seen.delete(real);
  };
  walk(dir);
  return out.sort();
}

/** sha256 over "<path>\n<sha256 of the file>\n" for each file in path order, as `sha256-<hex>`. */
export function treeHash(dir: string, files: string[] = treeFiles(dir)): string {
  const h = createHash('sha256');
  for (const f of files) {
    const body = createHash('sha256')
      .update(readFileSync(join(dir, f)))
      .digest('hex');
    h.update(`${f}\n${body}\n`);
  }
  return `sha256-${h.digest('hex')}`;
}

/** Where a repo's stamp is broken, each with the file to name. Empty when it has no stamp. */
export function stampProblems(root: string): { file: string; message: string }[] {
  const file = join(root, STAMP_FILE);
  if (!existsSync(file)) return [];
  let copies: unknown;
  try {
    copies = JSON.parse(readFileSync(file, 'utf8')).copies;
  } catch {
    copies = undefined;
  }
  if (!Array.isArray(copies) || copies.length === 0)
    return [{ file: STAMP_FILE, message: `${STAMP_FILE} has no copies list.` }];
  const problems: { file: string; message: string }[] = [];
  for (const copy of copies as { path?: unknown; hash?: unknown }[]) {
    const path = String(copy?.path ?? '');
    const dir = join(root, path);
    const inside = path !== '' && !isAbsolute(path) && !relative(root, dir).startsWith('..');
    let hash: string | null = null;
    try {
      if (inside && existsSync(dir) && statSync(dir).isDirectory()) hash = treeHash(dir);
    } catch {
      hash = null;
    }
    if (hash === null || hash !== copy.hash)
      problems.push({
        file: path || STAMP_FILE,
        message: `${path || 'A copy'} doesn't match the hash in ${STAMP_FILE}.`,
      });
  }
  return problems;
}
