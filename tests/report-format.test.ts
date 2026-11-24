import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const plugin = join(import.meta.dirname, '../plugins/sidecut-agentskills');
const skills = join(plugin, 'skills');
const read = (path: string) => readFileSync(join(plugin, path), 'utf8');

// Skills whose result is a review, rebuild comparison or measured summary.
const reportSkills = [
  'agentskills-review-plugin',
  'agentskills-rebuild-plugin',
  'agentskills-show-usage',
];

test('report skills choose their format in a numbered step', () => {
  for (const skill of reportSkills) {
    const lines = read(`skills/${skill}/SKILL.md`).split('\n');
    const pointers = lines.filter((line) => line.includes('visual-reports.md'));
    expect(pointers.length, skill).toBeGreaterThan(0);
    for (const line of pointers) expect(line, skill).toMatch(/^\d+\. /);
  }
});

test('no skill ends a review in chat without offering the follow-ups', () => {
  for (const skill of readdirSync(skills)) {
    expect(read(`skills/${skill}/SKILL.md`), skill).not.toMatch(/ends with the report/i);
  }
  expect(read('skills/agentskills-review-plugin/SKILL.md')).toContain('Offer follow-ups');
});

test('the guides carry the format test and the follow-up rule', () => {
  const visual = read('server/data/visual-reports.md');
  expect(visual).toContain('5 or more findings');
  expect(visual).not.toContain('ordinary tool development');
  expect(read('server/data/user-input.md')).toContain('## Offer follow-ups');
});
