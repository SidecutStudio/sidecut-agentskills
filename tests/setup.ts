// Loaded before every test file (vitest.config.ts). Keeps tests from writing the usage log, reading
// the user's settings, reaching the network or racing Git's background maintenance.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { quietGitEnv } from './git-env.ts';

quietGitEnv();
process.env.SIDECUT_SKILL_LOG = '0';
// Never read or write the user's own Agentskills settings.
process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'agentskills-config-'));
globalThis.fetch = (() => {
  throw new Error('Tests must not use the network.');
}) as unknown as typeof fetch;
