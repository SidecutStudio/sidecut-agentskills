import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { SIDECUT_OWNER, SIDECUT_SETTINGS } from './sidecut-profile.ts';

/** Where CI runs: GitHub-hosted Linux, or the Sidecut profile's own runners through its runner picker. */
export type CiMode = 'hosted' | 'sidecut';

/** Who publishes a plugin and how its repo is set up: everything the templates don't hard-code. */
export type Settings = {
  /** The named profile these values came from, if any. */
  profile: string;
  /** The GitHub owner of the plugin's repo. */
  org: string;
  authorName: string;
  authorUrl: string;
  homepage: string;
  /** Put in front of every plugin id, such as `acme-`. Skill names leave it out. */
  prefix: string;
  /** `owner/repo` of the marketplace that lists the plugin, or empty for the plugin's own repo. */
  marketplace: string;
  ci: CiMode;
  license: string;
  brandColor: string;
  /** The name the templates put in front of "house style", "voice" and "usage log". */
  brand: string;
  /** An extra delivery workflow the repo follows: empty for none, or `solo` for the Sidecut profile's. */
  workflow: string;
  /** The user's own house style guide, as a path or URL, or empty for Agentskills' own. */
  houseStyle: string;
  /** The user's own voice guide, as a path or URL, or empty for the template's VOICE.md. */
  voice: string;
  /**
   * The namespace of Agentskills' markers, package.json key and usage log: empty to follow the
   * profile, or `sidecut` or `agentskills`. A repo keeps the one it already uses.
   */
  namespace: string;
};

/** What a settings file or a tool call gives: any fields, and optionally a profile to start from. */
export type SettingsInput = Partial<Settings>;

export const DEFAULTS: Settings = {
  profile: '',
  org: '',
  authorName: '',
  authorUrl: '',
  homepage: '',
  prefix: '',
  marketplace: '',
  ci: 'hosted',
  license: 'MIT',
  brandColor: '#3B82F6',
  brand: '',
  workflow: '',
  houseStyle: '',
  voice: '',
  namespace: '',
};

/** Sidecut Studio's own values, kept as one profile. */
export const PROFILES: Record<string, Omit<Settings, 'profile'>> = {
  sidecut: SIDECUT_SETTINGS,
};

/** The answers file a repo keeps at its root, so sync and check reuse what scaffolding was told. */
export const REPO_FILE = '.agentskills.json';

const KEYS = Object.keys(DEFAULTS) as (keyof Settings)[];

/**
 * The user's settings file: `$XDG_CONFIG_HOME/agentskills/settings.json`, or under `~/.config`. A
 * relative XDG_CONFIG_HOME is ignored, as the XDG spec says.
 */
export function userSettingsPath(env: NodeJS.ProcessEnv = process.env): string {
  const xdg = env.XDG_CONFIG_HOME;
  const base = xdg && isAbsolute(xdg) ? xdg : join(homedir(), '.config');
  return join(base, 'agentskills', 'settings.json');
}

/** Only the known fields of `value`, each a string, so a stray key never reaches a template. */
export function cleanSettings(value: unknown): SettingsInput {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === 'string') out[key] = v;
  }
  return out as SettingsInput;
}

function readInput(path: string): SettingsInput | null {
  if (!existsSync(path)) return null;
  try {
    return cleanSettings(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    throw new Error(`${path} isn't valid JSON.`);
  }
}

/**
 * Merges layers from lowest to highest priority over the defaults. A layer's profile applies first,
 * then that layer's own fields, so `{ "profile": "sidecut", "ci": "hosted" }` is Sidecut on hosted CI.
 */
export function mergeSettings(...layers: (SettingsInput | null | undefined)[]): Settings {
  let out: Settings = { ...DEFAULTS };
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.profile) {
      const profile = PROFILES[layer.profile];
      if (!profile)
        throw new Error(
          `Unknown profile "${layer.profile}". Known: ${Object.keys(PROFILES).join(', ')}.`,
        );
      out = { ...out, ...profile, profile: layer.profile };
    }
    for (const key of KEYS) {
      const v = layer[key];
      if (key !== 'profile' && v !== undefined) (out as Record<string, string>)[key] = v;
    }
  }
  if (out.ci !== 'hosted' && out.ci !== 'sidecut')
    throw new Error(`CI mode "${out.ci}" must be hosted or sidecut.`);
  if (!['', 'sidecut', 'agentskills'].includes(out.namespace))
    throw new Error(`Namespace "${out.namespace}" must be empty, sidecut or agentskills.`);
  if (out.workflow !== '' && out.workflow !== 'solo')
    throw new Error(`Workflow "${out.workflow}" must be empty or solo.`);
  if (out.marketplace && !/^[\w.-]+\/[\w.-]+$/.test(out.marketplace))
    throw new Error(
      `Marketplace "${out.marketplace}" must be owner/repo, or empty for the plugin's own repo.`,
    );
  if (out.prefix && !/^[a-z0-9]+(-[a-z0-9]+)*-$/.test(out.prefix))
    throw new Error(
      `Prefix "${out.prefix}" must be lowercase kebab-case ending in a hyphen, such as acme-.`,
    );
  return out;
}

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
// Characters that would need escaping in the JSON and YAML templates, or break a line in Markdown.
/** Whether `text` holds a quote, a backslash or a control character. */
function unsafeText(text: string): boolean {
  return [...text].some(
    (c) => c === '"' || c === '\\' || c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f,
  );
}

/**
 * Throws when a value would break a file it's written into: the templates paste settings into JSON,
 * YAML and Markdown as they are, so only values that need no escaping are accepted.
 */
export function validateSettings(s: Settings): Settings {
  if (s.org && !OWNER.test(s.org))
    throw new Error(
      `Owner "${s.org}" must be a GitHub user or organization name: letters, digits and single hyphens.`,
    );
  for (const key of ['authorName', 'brand', 'houseStyle', 'voice'] as const) {
    if (unsafeText(s[key]))
      throw new Error(
        `${key} can't hold quotes, backslashes, line breaks or other control characters.`,
      );
  }
  for (const key of ['authorUrl', 'homepage'] as const) {
    const value = s[key];
    if (!value) continue;
    let ok = false;
    try {
      const url = new URL(value);
      ok = (url.protocol === 'https:' || url.protocol === 'http:') && !/[\s"\\<>]/.test(value);
    } catch {
      ok = false;
    }
    if (!ok) throw new Error(`${key} "${value}" must be an http or https URL.`);
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(s.brandColor))
    throw new Error(`Brand color "${s.brandColor}" must be #RRGGBB.`);
  return s;
}

/**
 * What to save so the same settings resolve again: the profile, then each value that differs from
 * it (or from the defaults, with no profile). Resolving it on its own gives back `settings`.
 */
export function answersOf(settings: Settings): SettingsInput {
  const base = (settings.profile ? PROFILES[settings.profile] : DEFAULTS) ?? DEFAULTS;
  const out: Record<string, string> = settings.profile ? { profile: settings.profile } : {};
  for (const [key, value] of Object.entries(settings)) {
    if (key !== 'profile' && value !== (base as Record<string, string>)[key]) out[key] = value;
  }
  return out as SettingsInput;
}

export function readUserSettings(env: NodeJS.ProcessEnv = process.env): SettingsInput | null {
  return readInput(userSettingsPath(env));
}

export function readRepoSettings(root: string): SettingsInput | null {
  return readInput(join(root, REPO_FILE));
}

/**
 * The repo's `scanTextAllow`: globs, relative to each plugin folder, of shipped files whose job is
 * text that SCAN_TEXT would otherwise flag, such as a CI plugin's docs. Anything that isn't a list of
 * strings counts as none.
 */
export function readScanTextAllow(root: string): string[] {
  const path = join(root, REPO_FILE);
  if (!existsSync(path)) return [];
  try {
    const value = (JSON.parse(readFileSync(path, 'utf8')) as { scanTextAllow?: unknown })
      .scanTextAllow;
    return Array.isArray(value) ? value.filter((g): g is string => typeof g === 'string') : [];
  } catch {
    return [];
  }
}

/** Saves `input` as the user's settings; returns where. */
export function writeUserSettings(
  input: SettingsInput,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const path = userSettingsPath(env);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cleanSettings(input), null, 2)}\n`);
  return path;
}

/**
 * What a repo with no answers file says about itself: its owner from the plugin manifest's
 * repository URL. A repo of the Sidecut profile's owner gets that profile, so repos made before settings
 * existed keep passing unchanged.
 */
export function inferRepoSettings(root: string): SettingsInput {
  const plugins = join(root, 'plugins');
  const ids = existsSync(plugins) ? readdirSync(plugins).filter((n) => n !== '.DS_Store') : [];
  for (const id of ids) {
    try {
      const manifest = JSON.parse(
        readFileSync(join(plugins, id, '.claude-plugin', 'plugin.json'), 'utf8'),
      ) as { repository?: unknown; author?: { name?: unknown; url?: unknown }; homepage?: unknown };
      const owner = /^https:\/\/github\.com\/([\w.-]+)\//.exec(
        String(manifest.repository ?? ''),
      )?.[1];
      if (!owner) continue;
      if (owner === SIDECUT_OWNER) return { profile: 'sidecut' };
      const check = join(root, '.github', 'workflows', 'check.yml');
      const picker = existsSync(check) && readFileSync(check, 'utf8').includes('/pick-runner@');
      return cleanSettings({
        org: owner,
        authorName: manifest.author?.name,
        authorUrl: manifest.author?.url,
        homepage: manifest.homepage,
        ci: picker ? 'sidecut' : 'hosted',
      });
    } catch {
      // A missing or broken manifest is reported by the checks that read it.
    }
  }
  // A repo with no plugin, such as an app, says who owns it through its git remote.
  const remote = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: root,
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))),
  });
  const owner = /github\.com[/:]([\w.-]+)\//.exec(remote.stdout ?? '')?.[1];
  if (remote.status === 0 && owner === SIDECUT_OWNER) return { profile: 'sidecut' };
  return {};
}

/**
 * Every layer for one call, lowest priority first: the defaults, the user's settings file, the
 * repo's answers file, then the call's own arguments.
 */
export function resolveLayers(
  options: { args?: SettingsInput; root?: string; env?: NodeJS.ProcessEnv } = {},
): SettingsInput[] {
  const layers: SettingsInput[] = [];
  const user = readUserSettings(options.env ?? process.env);
  if (user) layers.push(user);
  const repo = options.root ? readRepoSettings(options.root) : null;
  if (repo) layers.push(repo);
  if (options.args) layers.push(options.args);
  return layers;
}

export function resolveSettings(
  options: { args?: SettingsInput; root?: string; env?: NodeJS.ProcessEnv } = {},
): Settings {
  return mergeSettings(...resolveLayers(options));
}

/** The settings a repo is checked and synced with: its answers file, or what its manifests say. */
export function repoSettings(root: string): Settings {
  const settings = mergeSettings(readRepoSettings(root) ?? inferRepoSettings(root));
  if (!settings.namespace) settings.namespace = namespaceInRepo(root);
  return settings;
}

let active: Settings = mergeSettings();

/** The settings the checker and generator use until the next `useSettings`. */
export function current(): Settings {
  return active;
}

export function useSettings(settings: Settings): Settings {
  active = settings;
  return settings;
}

/** One thing scaffolding needs before it can write a repo, as a question for the user. */
export type Question = { key: keyof Settings; ask: string; default: string };

export const QUESTIONS: Question[] = [
  {
    key: 'org',
    ask: 'Which GitHub user or organization will hold your plugin repos?',
    default: '',
  },
  { key: 'authorName', ask: 'Whose name goes in the manifests and the licence?', default: '' },
  { key: 'authorUrl', ask: "The author's web address, if any?", default: '' },
  {
    key: 'homepage',
    ask: "Your plugins' homepage, if any? Empty uses each repo's GitHub page.",
    default: '',
  },
  {
    key: 'prefix',
    ask: 'A prefix in front of every plugin id, such as "acme-" for acme-notes, or none (the usual answer)?',
    default: DEFAULTS.prefix,
  },
  {
    key: 'marketplace',
    ask: "Where do people install your plugins from: each plugin's own repo (leave empty, the usual answer), or a shared marketplace repo, as owner/repo?",
    default: DEFAULTS.marketplace,
  },
  {
    key: 'license',
    ask: 'The template ships the MIT licence. Keep it? For another, keep MIT now and swap the LICENSE file in after scaffolding.',
    default: DEFAULTS.license,
  },
  {
    key: 'ci',
    ask: 'CI runs on GitHub-hosted ubuntu-24.04 runners ("hosted"). Keep that?',
    default: DEFAULTS.ci,
  },
  {
    key: 'houseStyle',
    ask: "Which house style should your plugins follow: Agentskills' own (leave empty), Agentskills' own with your changes, or your own guide (give its path or URL)?",
    default: DEFAULTS.houseStyle,
  },
  {
    key: 'voice',
    ask: "Which voice should their docs and skills be written in: the template's VOICE.md (leave empty), that one adapted, or your own guide (give its path or URL)?",
    default: DEFAULTS.voice,
  },
];

/**
 * Whether `input` says enough to write a repo: a profile, or at least the owner and the author. The
 * Sidecut profile counts only when someone chose it; nothing falls back to it.
 */
export function answered(input: SettingsInput): boolean {
  return Boolean(input.profile || (input.org && input.authorName));
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The brand the templates put in front of a phrase, with its space, or nothing. */
export function brandSpace(s: Settings = active): string {
  return s.brand ? `${s.brand} ` : '';
}

/**
 * The name Agentskills' own markers, package.json key and usage log go under in a repo: `sidecut` for
 * the Sidecut profile, whose repos have always used it, and `agentskills` for everyone else. The
 * checker reads both, so a repo made before this keeps passing until sync moves it over.
 */
export function namespaceOf(s: Settings = active): 'sidecut' | 'agentskills' {
  if (s.namespace === 'sidecut' || s.namespace === 'agentskills') return s.namespace;
  return s.profile === 'sidecut' ? 'sidecut' : 'agentskills';
}

/** The files whose markers or usage log say which namespace a repo was made with. */
const NAMESPACE_FILES = ['.gitignore', 'AGENTS.md', 'SECURITY.md', 'tests/setup.ts'];

/**
 * The namespace a repo already uses, so a repo made before `agentskills` existed keeps `sidecut`
 * and its own tests keep working: `sidecut` when its files carry only the older markers or switch,
 * `agentskills` when they carry the new ones, and empty when neither shows.
 */
export function namespaceInRepo(root: string): '' | 'sidecut' | 'agentskills' {
  const plugins = join(root, 'plugins');
  const hooks = existsSync(plugins)
    ? readdirSync(plugins).map((id) => join('plugins', id, 'hooks', 'post-tool-use-skill-log.mjs'))
    : [];
  let older = false;
  for (const file of [...NAMESPACE_FILES, ...hooks]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    let text = '';
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    // Only a real marker line or the switch in code counts, never prose that mentions them.
    if (
      /^(?:<!--|#|\/\/) agentskills:start |\benv\.AGENTSKILLS_SKILL_LOG\b|process\.env\.AGENTSKILLS_SKILL_LOG\b/m.test(
        text,
      )
    )
      return 'agentskills';
    if (
      /^(?:<!--|#|\/\/) sidecut:start |\benv\.SIDECUT_SKILL_LOG\b|process\.env\.SIDECUT_SKILL_LOG\b/m.test(
        text,
      )
    )
      older = true;
  }
  return older ? 'sidecut' : '';
}

/** Every namespace the checker reads. */
export const NAMESPACES = ['agentskills', 'sidecut'] as const;

/** A marker line's namespace, as a regular expression source: either one. */
export const NAMESPACE_RE = '(?:agentskills|sidecut)';

/**
 * What `package.json` tells Agentskills, such as `keep` and `kind`: its `agentskills` key over its
 * `sidecut` key, so a repo can use either.
 */
export function packageConfig(pkg: unknown): { keep?: Record<string, string>; kind?: unknown } {
  const read = (key: string) => {
    const value = (pkg as Record<string, unknown> | null)?.[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  };
  const old = read('sidecut');
  const own = read('agentskills');
  const keep = { ...(old.keep as object), ...(own.keep as object) } as Record<string, string>;
  const kind = own.kind ?? old.kind;
  return {
    ...(Object.keys(keep).length > 0 || 'keep' in old || 'keep' in own ? { keep } : {}),
    ...(kind !== undefined ? { kind } : {}),
  };
}

/** The marketplace's name: its repo part, or the plugin id when the plugin lists itself. */
export function marketplaceName(id: string, s: Settings = active): string {
  return s.marketplace ? (s.marketplace.split('/')[1] ?? s.marketplace) : id;
}
