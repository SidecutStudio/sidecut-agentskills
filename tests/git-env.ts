// Every test that runs git goes through this environment. Git exports GIT_DIR and friends to
// hooks, so a test run from a hook must not point fixture repos at this one. Git also tidies a
// repo in the background after a commit; on a busy machine that process can write into a fixture
// repo while a test is reading it, so it stays off.
export function quietGitEnv(): void {
  for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key];
  const config = { 'maintenance.auto': 'false', 'gc.auto': '0' };
  Object.entries(config).forEach(([key, value], i) => {
    process.env[`GIT_CONFIG_KEY_${i}`] = key;
    process.env[`GIT_CONFIG_VALUE_${i}`] = value;
  });
  process.env.GIT_CONFIG_COUNT = String(Object.keys(config).length);
}
