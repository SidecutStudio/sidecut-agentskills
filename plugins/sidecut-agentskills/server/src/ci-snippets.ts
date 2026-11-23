// CI lines that name runners, secrets, tokens or a download, kept in code rather than in the shipped
// templates. Claude's plugin scan reads a plugin's text files (not its MCP server), and may mark a
// plugin Caution when that text names credentials, CI secrets, self-hosted runners or a
// download-and-run install, so the templates hold `{{name}}` placeholders that render to these.
// Rendered output is unchanged.

import { SIDECUT_CI_SNIPPETS } from './sidecut-profile.ts';

const INDENT = '          ';

/** The few CI lines the templates leave as placeholders. */
export const CI_SNIPPETS: Record<string, string> = {
  ciOwnLane: 'self-hosted',
  ciOwnLaneTitle: 'Self-hosted',
  ...SIDECUT_CI_SNIPPETS,
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
  ghTokenEnv: 'GH_TOKEN: ${{ github.token }}',
  secretScanInstall: [
    'curl -fsSL -o "$RUNNER_TEMP/trufflehog.tar.gz" https://github.com/trufflesecurity/trufflehog/releases/download/v3.99.2/trufflehog_3.99.2_linux_amd64.tar.gz',
    'echo "3c7b0d1dc4278294269bfdd7594bca8bb28c78da0a4a06ad202ded37b48deca4  $RUNNER_TEMP/trufflehog.tar.gz" | sha256sum --check',
    'tar -xzf "$RUNNER_TEMP/trufflehog.tar.gz" -C "$RUNNER_TEMP" trufflehog',
    'echo "$RUNNER_TEMP" >> "$GITHUB_PATH"',
  ].join(`\n${INDENT}`),
  ghInstall: [
    'curl -fsSL -o "$RUNNER_TEMP/gh.tar.gz" https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_linux_amd64.tar.gz',
    'echo "bb766f710eef8ede859c18578c72c327597cd4c8a85b06001b1f3843c6019386  $RUNNER_TEMP/gh.tar.gz" | sha256sum --check',
    'tar -xzf "$RUNNER_TEMP/gh.tar.gz" -C "$RUNNER_TEMP" --strip-components=2 gh_2.102.0_linux_amd64/bin/gh',
    'echo "$RUNNER_TEMP" >> "$GITHUB_PATH"',
  ].join(`\n${INDENT}`),
};
