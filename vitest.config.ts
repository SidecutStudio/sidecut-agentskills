import { defineConfig } from 'vitest/config';

// Only this repo's tests: worktrees under .claude/worktrees hold other checkouts' copies.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '.claude/**'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
