// Loaded before every test file (vitest.config.ts). Keeps tests from writing the usage log, reaching
// the network or racing Git's background maintenance.
import { quietGitEnv } from './git-env.ts';

quietGitEnv();
process.env.SIDECUT_SKILL_LOG = '0';
globalThis.fetch = (() => {
  throw new Error('Tests must not use the network.');
}) as unknown as typeof fetch;
