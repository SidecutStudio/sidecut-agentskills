import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const biome = join(import.meta.dirname, '..', 'node_modules', '@biomejs', 'biome', 'bin', 'biome');

/** Formats a generated repo the way its own `npm run fix` would. Runs Biome through node, so it works where npm is npm.cmd. */
export function formatRepo(dir: string): void {
  const result = spawnSync(process.execPath, [biome, 'check', '--write', '.'], { cwd: dir });
  if (result.error) throw result.error;
}
