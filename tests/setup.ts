// Loaded before every test file (vitest.config.ts). Keeps tests from writing the usage log, reading
// the user's settings, reaching the network or racing Git's background maintenance.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.SIDECUT_SKILL_LOG = '0';
// Never read or write the user's own Agentskills settings.
process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'agentskills-config-'));
globalThis.fetch = (() => {
  throw new Error('Tests must not use the network.');
}) as unknown as typeof fetch;

// sidecut:start git-env
// A git hook exports GIT_DIR and friends, so a test's git run from one would act on this checkout
// instead of its fixture repo. Dropping them here covers every test and the processes it starts.
for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key];
// sidecut:end git-env

// Git also tidies a repo in the background after a commit; on a busy machine that process can write
// into a fixture repo while a test is reading it, so it stays off.
const quiet = { 'maintenance.auto': 'false', 'gc.auto': '0' };
Object.entries(quiet).forEach(([key, value], i) => {
  process.env[`GIT_CONFIG_KEY_${i}`] = key;
  process.env[`GIT_CONFIG_VALUE_${i}`] = value;
});
process.env.GIT_CONFIG_COUNT = String(Object.keys(quiet).length);
