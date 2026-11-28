// What only the `sidecut` profile uses: Sidecut Studio's delivery workflow (Sidecut Solo) and its
// private CI repo. Nothing here applies to a repo scaffolded with the defaults, and the portability
// test keeps these names out of every other shipped file. The profile's values live in settings.ts.

/** The settings file Sidecut Solo reads at the repo root; its `required_checks` is the merge gate. */
export const SOLO_FILE = 'solo-workflow.toml';
/** Solo's personal overrides beside it, which a repo never commits. */
export const SOLO_LOCAL_FILE = 'solo-workflow.local.toml';
/** The markers Sidecut Solo writes its AGENTS.md section between. */
export const SOLO_START = '<!-- solo-workflow:start -->';
export const SOLO_END = '<!-- solo-workflow:end -->';
/** The headings Solo has used for that section. */
export const SOLO_HEADINGS = ['Sidecut Solo', 'Solo Workflow'];
/**
 * The section Solo's project setup writes between the markers, word for word. Solo's own
 * agents-section reference carries the same text; change both together.
 */
export const SOLO_BLOCK = `${SOLO_START}
## Sidecut Solo

Follow \`solo-workflow.toml\`. Use the relevant Solo skill, or \`solo\` to route the request.
${SOLO_END}`;
/** The Solo skill that fills the section. */
export const SOLO_SETUP = 'Run solo-configure-project.';
/** Actions from Sidecut Studio's private CI repo, which a public repo can't load. */
export const PRIVATE_ACTIONS = /SidecutStudio\/sidecut-ops\/\.github\/actions\//;
/** How a generated AGENTS.md describes the profile's CI. */
export const CI_LAYOUT = "CI, using sidecut-ops' runner picker";

/** Sidecut Studio's own settings, the `sidecut` profile. */
export const SIDECUT_SETTINGS = {
  org: 'SidecutStudio',
  authorName: 'Sidecut Studio',
  authorUrl: 'https://sidecut.dev',
  homepage: 'https://sidecut.dev',
  prefix: 'sidecut-',
  marketplace: 'SidecutStudio/sidecut-plugins',
  ci: 'sidecut' as const,
  license: 'MIT',
  brandColor: '#FF6B00',
  brand: 'Sidecut',
  workflow: 'solo',
  houseStyle: '',
  voice: '',
  namespace: '',
};

/** The GitHub owner whose repos, with no answers file, are checked with this profile. */
export const SIDECUT_OWNER = SIDECUT_SETTINGS.org;

/** The profile's runner labels and CI app key, which only its own CI templates render. */
export const SIDECUT_CI_SNIPPETS: Record<string, string> = {
  ciLightRunner:
    '\'{"group":"sidecut-linux-x64","labels":["self-hosted","Linux","X64","sidecut-light"]}\'',
  ciReleaseLabels: '[self-hosted, Linux, X64, sidecut-ci]',
  // biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, not JS.
  ciAppKey: '${{ secrets.SIDECUT_CI_APP_KEY }}',
};

/**
 * Where the profile's fleet data lives: the checkout of this repo, beside the checked one, holds the
 * repo index and the map of which repo owns each shared fact.
 */
export const SIDECUT_FLEET = {
  home: 'sidecut-home',
  data: 'plugins/sidecut-home/server/data',
  repos: 'repos.toml',
  owners: 'owners.toml',
};

/**
 * Names the profile has retired, with what replaces each. History (CHANGELOG.md) and tests may keep
 * them; runtime identifiers aren't prose, so only text people read is checked.
 */
export const SIDECUT_RETIRED: { re: RegExp; name: string; use: string; autofix?: boolean }[] = [
  // Only the written name: a URL, path or package name that still carries it is an identifier.
  {
    re: /(?<![\w/.@-])Veyla Labs(?![\w/-])/g,
    name: 'Veyla Labs',
    use: 'Sidecut Studio',
    autofix: true,
  },
  {
    re: /(?<![\w/.@-])Sidecut Workflows(?![\w/-])/g,
    name: 'Sidecut Workflows',
    use: 'Sidecut Solo',
  },
  { re: /(?<![\w/.@-])Ship Properly(?![\w/-])/g, name: 'Ship Properly', use: 'Sidecut Solo' },
];

/** Sidecut Studio repositories that are intentionally public. */
export const PUBLIC_SIDECUT_REPOS = new Set(['sidecut-agentskills', 'sidecut-solo']);

/** Runner hostnames belonging to Sidecut Studio's private CI pool. */
export const SIDECUT_RUNNER_HOST_PATTERNS = [
  /\bsidecut-linux-x64-\d+\b/g,
  /\bafter[-]nine-mac-ci\b/g,
];

/** Links to private Sidecut GitHub repositories or internal Sidecut workspaces. */
export const SIDECUT_PRIVATE_GITHUB_LINK =
  /(?:https?:\/\/(?:raw\.githubusercontent\.com|github\.com)\/|git@github\.com:)(SidecutStudio|SidecutDev)\/([A-Za-z0-9._-]+)/gi;
export const SIDECUT_PRIVATE_SITE_PATTERNS = [
  /https?:\/\/linear\.app\/sidecutstudio(?:\/[^\s"'`),;]*)?/gi,
];
