import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** Where CI runs: GitHub-hosted Linux, or Sidecut's self-hosted runners through the runner picker. */
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
  /** Put in front of every plugin id, such as `sidecut-`. Skill names leave it out. */
  prefix: string;
  /** `owner/repo` of the marketplace that lists the plugin, or empty for the plugin's own repo. */
  marketplace: string;
  ci: CiMode;
  license: string;
  brandColor: string;
  /** The name the templates put in front of "house style", "voice" and "usage log". */
  brand: string;
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
};

/** Sidecut Studio's own values, kept as one profile. */
export const PROFILES: Record<string, Omit<Settings, 'profile'>> = {
  sidecut: {
    org: 'SidecutStudio',
    authorName: 'Sidecut Studio',
    authorUrl: 'https://sidecut.dev',
    homepage: 'https://sidecut.dev',
    prefix: 'sidecut-',
    marketplace: 'SidecutStudio/sidecut-plugins',
    ci: 'sidecut',
    license: 'MIT',
    brandColor: '#FF6B00',
    brand: 'Sidecut',
  },
};

/** The answers file a repo keeps at its root, so sync and check reuse what scaffolding was told. */
export const REPO_FILE = '.agentskills.json';

const KEYS = Object.keys(DEFAULTS) as (keyof Settings)[];

/** The user's settings file: `$XDG_CONFIG_HOME/agentskills/settings.json`, or under `~/.config`. */
export function userSettingsPath(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.XDG_CONFIG_HOME || join(homedir(), '.config');
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

export function readUserSettings(env: NodeJS.ProcessEnv = process.env): SettingsInput | null {
  return readInput(userSettingsPath(env));
}

export function readRepoSettings(root: string): SettingsInput | null {
  return readInput(join(root, REPO_FILE));
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
 * repository URL. A SidecutStudio repo is the Sidecut profile, so repos made before settings
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
      if (owner === 'SidecutStudio') return { profile: 'sidecut' };
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
  return mergeSettings(readRepoSettings(root) ?? inferRepoSettings(root));
}

let active: Settings = mergeSettings({ profile: 'sidecut' });

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
    key: 'profile',
    ask: 'Start from a saved profile? Answer "sidecut" for Sidecut Studio\'s values, or leave it empty and answer the rest.',
    default: '',
  },
  { key: 'org', ask: 'Which GitHub user or organization will hold the repo?', default: '' },
  { key: 'authorName', ask: 'Whose name goes in the manifests and the licence?', default: '' },
  { key: 'authorUrl', ask: "The author's web address, if any?", default: '' },
  { key: 'homepage', ask: "The plugin's homepage, if any?", default: '' },
  {
    key: 'prefix',
    ask: 'A prefix for every plugin id, such as "acme-", or none?',
    default: DEFAULTS.prefix,
  },
  {
    key: 'marketplace',
    ask: 'Which marketplace lists the plugin: its own repo (leave empty), or another repo as owner/repo?',
    default: DEFAULTS.marketplace,
  },
  {
    key: 'ci',
    ask: 'Where does CI run: "hosted" (GitHub-hosted ubuntu-24.04) or "sidecut" (Sidecut\'s self-hosted runner picker)?',
    default: DEFAULTS.ci,
  },
];

/** Whether `input` says enough to write a repo: a profile, or at least the owner and the author. */
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

/** The marketplace's name: its repo part, or the plugin id when the plugin lists itself. */
export function marketplaceName(id: string, s: Settings = active): string {
  return s.marketplace ? (s.marketplace.split('/')[1] ?? s.marketplace) : id;
}
