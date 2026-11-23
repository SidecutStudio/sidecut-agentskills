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
