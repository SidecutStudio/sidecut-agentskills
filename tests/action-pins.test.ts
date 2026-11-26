// Dependabot moves the action pins in this repo's own workflows, but it can't see the CI templates,
// and every plugin repo's workflows are synced from those. This fails when a template pins an
// action at a different commit than this repo's workflows do, so a Dependabot bump here is only
// green once the templates follow it.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const root = join(import.meta.dirname, '..');
const templates = join(root, 'plugins/sidecut-agentskills/server/data/templates/ci');
const PIN = /uses:\s*([\w.-]+\/[\w./-]+)@([0-9a-f]{40})/g;

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
}

function pins(paths: string[]): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  for (const path of paths) {
    for (const [, action = '', sha = ''] of readFileSync(path, 'utf8').matchAll(PIN)) {
      found.set(action, (found.get(action) ?? new Set<string>()).add(sha));
    }
  }
  return found;
}

test('the CI templates pin each action at the commit this repo’s workflows use', () => {
  const own = pins(files(join(root, '.github/workflows')));
  const shipped = pins(files(templates));
  const drift: string[] = [];
  for (const [action, shas] of shipped) {
    const want = own.get(action);
    if (!want) continue;
    for (const sha of shas) if (!want.has(sha)) drift.push(`${action}@${sha}`);
  }
  expect(drift).toEqual([]);
  for (const shas of own.values()) expect(shas.size).toBe(1);
});
