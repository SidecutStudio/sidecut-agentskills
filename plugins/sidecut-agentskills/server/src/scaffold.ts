import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sentences } from './check/report.ts';
import {
  answered,
  answersOf,
  brandSpace,
  current,
  escapeRegExp,
  marketplaceName,
  mergeSettings,
  PROFILES,
  QUESTIONS,
  type Question,
  REPO_FILE,
  repoSettings,
  resolveLayers,
  type Settings,
  type SettingsInput,
  useSettings,
  validateSettings,
  writeUserSettings,
} from './settings.ts';

// The data folder sits next to the bundled server/index.mjs, or one level up from server/src/.
const here = dirname(fileURLToPath(import.meta.url));
export const dataRoot = existsSync(join(here, 'data'))
  ? join(here, 'data')
  : existsSync(join(here, '..', 'data'))
    ? join(here, '..', 'data')
    : join(here, '..', 'plugins', 'sidecut-agentskills', 'server', 'data');
export const templatesRoot = join(dataRoot, 'templates');
export const OWNER_INPUT_PATH = 'server/data/owner-input.md';

export function ownerInput(): string {
  return readFileSync(join(dataRoot, 'owner-input.md'), 'utf8');
}

/** This plugin's own version, from its manifest beside the data folder. */
export const ownVersion = (
  JSON.parse(readFileSync(join(dataRoot, '..', '..', '.claude-plugin', 'plugin.json'), 'utf8')) as {
    version: string;
  }
).version;

export type PluginInput = {
  id: string;
  description: string;
  longDescription: string;
  keywords: string[];
  date?: string;
  /** Where the generated repo gets the house-style checker from. */
  checkerSource?: string;
  /** Answers that win over the user's saved settings, such as `{ profile: 'sidecut' }`. */
  settings?: SettingsInput;
  /** Save the merged answers as the user's settings, so the next scaffold doesn't ask again. */
  save?: boolean;
};

/** Thrown when scaffolding doesn't know enough yet; the tool turns it into questions, not an error. */
export class SettingsNeeded extends Error {
  readonly questions: Question[];
  constructor(questions: Question[]) {
    super(
      `Scaffolding needs a few answers first: ${questions.map((q) => q.key).join(', ')}. Ask the user, then call again with settings and save: true.`,
    );
    this.questions = questions;
  }
}

export type SkillInput = { name: string; does: string };

export type Problem = { code: string; message: string };

/** A plugin id: the settings' prefix, then lowercase kebab-case. */
export function pluginIdPattern(s: Settings = current()): RegExp {
  return new RegExp(`^${escapeRegExp(s.prefix)}[a-z0-9]+(-[a-z0-9]+)*$`);
}
/** The verb-object part of a skill name, after the plugin prefix: 2 or 3 words. */
export const SKILL_NAME = /^[a-z]+(-[a-z]+){1,2}$/;

/** The prefix every skill name starts with: the plugin id without the settings' prefix. It alone names the router. */
export function skillPrefixOf(pluginId: string, s: Settings = current()): string {
  return pluginId.replace(new RegExp(`^${escapeRegExp(s.prefix)}`), '');
}

/** Whether a skill name is the router or `<prefix>-<verb>-<object>`. */
export function isSkillName(name: string, prefix: string): boolean {
  return (
    name === prefix ||
    (name.startsWith(`${prefix}-`) && SKILL_NAME.test(name.slice(prefix.length + 1)))
  );
}
/** Sidecut Builder's orange, the brand color of the Sidecut profile. */
export const BRAND_COLOR = PROFILES.sidecut?.brandColor ?? '#FF6B00';
const DEFAULT_CHECKER = 'github:SidecutStudio/sidecut-agentskills';

export function checkPluginInput(input: PluginInput): Problem[] {
  const problems: Problem[] = [];
  if (!pluginIdPattern().test(input.id) || input.id.length > 64) {
    problems.push({
      code: 'NAME_PLUGIN_ID',
      message: `Plugin id "${input.id}" must be ${current().prefix}<name> in lowercase kebab-case, at most 64 characters.`,
    });
  }
  if (input.description.length > 120 || !input.description.endsWith('.')) {
    problems.push({
      code: 'MANIFEST_DESCRIPTION',
      message:
        'The description must be one sentence of at most 120 characters ending with a full stop.',
    });
  }
  const long = sentences(input.longDescription).length;
  if (long < 2 || long > 3) {
    problems.push({
      code: 'MANIFEST_INTERFACE',
      message: 'The long description must be 2 or 3 sentences.',
    });
  }
  const badKeyword = input.keywords.some((k) => k !== k.toLowerCase() || k === input.id);
  if (input.keywords.length < 3 || input.keywords.length > 8 || badKeyword) {
    problems.push({
      code: 'MANIFEST_KEYWORDS',
      message: "Give 3 to 8 lowercase keywords that aren't the plugin id.",
    });
  }
  return problems;
}

export function checkSkillInput(input: SkillInput, prefix: string): Problem[] {
  const problems: Problem[] = [];
  if (input.name !== prefix && !isSkillName(input.name, prefix)) {
    problems.push({
      code: 'NAME_SKILL',
      message: `Skill name "${input.name}" must be ${prefix}- then a verb and an object, 2 or 3 words in kebab-case, or ${prefix} alone for the router.`,
    });
  }
  if (
    !/^[A-Z][a-z]+s /.test(input.does) ||
    !input.does.endsWith('.') ||
    input.does.split('. ').length > 1
  ) {
    problems.push({
      code: 'SKILL_DESCRIPTION_SHAPE',
      message:
        'Say what the skill does in one sentence starting with a third-person verb, such as "Writes a skill."',
    });
  }
  return problems;
}

/** Words written in capitals wherever a name becomes a title. */
const ACRONYMS = new Set([
  'ai',
  'api',
  'aws',
  'cdn',
  'ci',
  'cli',
  'css',
  'dns',
  'gpu',
  'html',
  'http',
  'json',
  'llm',
  'mcp',
  'pdf',
  'pr',
  'sdk',
  'sql',
  'ssh',
  'ui',
  'url',
  'ux',
  'yaml',
]);

/** The plugin id with hyphens as spaces, each word capitalized and acronyms in capitals. */
export function displayNameOf(id: string): string {
  return id
    .split('-')
    .map((word) =>
      ACRONYMS.has(word) ? word.toUpperCase() : (word[0] ?? '').toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/**
 * The SKILL.md H1: the name without its plugin prefix, hyphens as spaces, first word capitalized,
 * acronyms upper case. The router's title is the plugin's display name.
 */
export function skillTitleOf(name: string, prefix: string): string {
  if (name === prefix) return displayNameOf(`${current().prefix}${prefix}`);
  return name
    .slice(name.startsWith(`${prefix}-`) ? prefix.length + 1 : 0)
    .split('-')
    .map((word, i) => {
      if (ACRONYMS.has(word)) return word.toUpperCase();
      return i === 0 ? (word[0] ?? '').toUpperCase() + word.slice(1) : word;
    })
    .join(' ');
}

/** Turns a third-person verb into its base form: Checks to check, Fixes to fix, Applies to apply. */
export function baseVerb(verb: string): string {
  const word = verb.toLowerCase();
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(ch|sh|ss|x|z)es$/.test(word)) return word.slice(0, -2);
  return word.endsWith('s') ? word.slice(0, -1) : word;
}

/** Codex's starter prompt for a skill: "Use $<skill> to <first sentence with its verb in base form>". */
export function defaultPromptOf(does: string): string {
  const [verb = '', ...rest] = does.split(' ');
  return [baseVerb(verb), ...rest].join(' ');
}

function render(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) throw new Error(`Template uses unknown variable ${match}`);
    return value;
  });
}

/** One template file, such as `repo/AGENTS.md.tmpl`, rendered with `vars`. */
export function renderFile(path: string, vars: Record<string, string>): string {
  return render(readFileSync(join(templatesRoot, path), 'utf8'), vars);
}

export function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

export function renderTree(templateDir: string, vars: Record<string, string>): Map<string, string> {
  const base = join(templatesRoot, templateDir);
  const files = new Map<string, string>();
  for (const path of listFiles(base)) {
    files.set(
      render(relative(base, path), vars).replace(/\.tmpl$/, ''),
      render(readFileSync(path, 'utf8'), vars),
    );
  }
  return files;
}

function writeAll(out: string, files: Map<string, string | Buffer>): string[] {
  for (const [path, content] of files) {
    const target = join(out, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return [...files.keys()].sort();
}

/**
 * The settings a new repo is written with: the user's saved settings, then the call's own answers.
 * Throws SettingsNeeded when neither says who publishes the plugin.
 */
export function scaffoldSettings(
  input: PluginInput,
  env: NodeJS.ProcessEnv = process.env,
): Settings {
  // A new repo has no answers file yet, so scaffolding reads the call's answers over the user's.
  const layers = resolveLayers({ args: input.settings, env });
  if (!answered(Object.assign({}, ...layers))) throw new SettingsNeeded(QUESTIONS);
  const settings = validateSettings(mergeSettings(...layers));
  if (settings.license !== 'MIT')
    throw new Error(
      `Only an MIT licence template ships. Scaffold with MIT, then replace LICENSE and the manifests' license field.`,
    );
  return settings;
}

/** The answers a new repo records in its answers file: the profile and whatever differs from it. */
export function answersFile(settings: Settings): string {
  return `${JSON.stringify(answersOf(settings), null, 2)}\n`;
}

/** What the templates fill in from the settings, beside each file's own variables. */
export function settingsVars(id: string, s: Settings = current()): Record<string, string> {
  const brand = brandSpace(s);
  const market = marketplaceName(id, s);
  let host = '';
  try {
    host = s.homepage ? new URL(s.homepage).host : '';
  } catch {
    host = '';
  }
  const installBlock = s.marketplace
    ? [
        '```text',
        `/plugin install ${id}@${market}      # Claude Code`,
        `codex plugin add ${id}@${market}     # Codex`,
        '```',
      ].join('\n')
    : [
        "In Claude Code, add this repo's marketplace, then install the plugin:",
        '',
        '```text',
        `/plugin marketplace add ${s.org}/${id}`,
        `/plugin install ${id}@${id}`,
        '```',
        '',
        'In Codex, run:',
        '',
        '```bash',
        `codex plugin marketplace add ${s.org}/${id}`,
        `codex plugin add ${id}@${id}`,
        '```',
      ].join('\n');
  return {
    org: s.org,
    authorName: s.authorName,
    authorUrl: s.authorUrl,
    homepage: s.homepage,
    brandColor: s.brandColor,
    brandSpace: brand,
    everyBrand: s.brand ? `Every ${s.brand}` : 'Every',
    voiceTitle: s.brand ? `${s.brand} voice` : 'Voice',
    logTitle: s.brand ? `${s.brand} usage log` : 'Usage log',
    prefixPattern: escapeRegExp(s.prefix),
    securityAlt: host ? `, or through [${host}](${s.homepage})` : '',
    ciLayout:
      s.ci === 'sidecut' ? "CI, using sidecut-ops' runner picker" : 'CI on GitHub-hosted runners',
    installBlock,
  };
}

/**
 * Writes a new plugin repo to `out`. Returns the files written, relative to `out`. Throws
 * SettingsNeeded, before writing anything, when it doesn't yet know who publishes the plugin.
 */
export function scaffoldPlugin(
  input: PluginInput,
  out: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const settings = scaffoldSettings(input, env);
  const previous = current();
  useSettings(settings);
  let files: string[];
  try {
    files = writeRepo(input, out, settings);
  } finally {
    useSettings(previous);
  }
  // Saved only once the repo is written, and as the settings it was written with.
  if (input.save) writeUserSettings(answersOf(settings), env);
  return files;
}

function writeRepo(input: PluginInput, out: string, settings: Settings): string[] {
  const problems = checkPluginInput(input);
  if (problems.length > 0)
    throw new Error(problems.map((p) => `${p.code}: ${p.message}`).join('\n'));
  if (existsSync(out) && readdirSync(out).length > 0)
    throw new Error(`${out} already exists and isn't empty.`);

  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const displayName = displayNameOf(input.id);
  const skillDoes = `Checks that the ${displayName} MCP server is running and reports its version.`;
  const version = '0.1.0';
  const vars: Record<string, string> = {
    ...settingsVars(input.id, settings),
    id: input.id,
    repo: input.id,
    key: skillPrefixOf(input.id, settings),
    displayName,
    description: input.description,
    longDescription: input.longDescription,
    keywordsJson: JSON.stringify(input.keywords),
    version,
    date,
    year: date.slice(0, 4),
    skillDoes,
    skillPrompt: defaultPromptOf(skillDoes),
    checkerSource: input.checkerSource ?? `${DEFAULT_CHECKER}#v${ownVersion}`,
  };

  const files = new Map<string, string | Buffer>();
  for (const [path, text] of renderTree('repo', vars)) files.set(path, text);
  for (const [path, text] of renderTree(`ci/${settings.ci}`, vars))
    files.set(`.github/workflows/${path}`, text);
  if (!settings.marketplace)
    for (const [path, text] of renderTree('marketplace', vars)) files.set(path, text);
  files.set(REPO_FILE, answersFile(settings));
  const pluginDir = `plugins/${input.id}`;
  for (const [path, text] of renderTree('plugin', vars)) files.set(`${pluginDir}/${path}`, text);
  for (const name of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
    files.set(name, files.get(`${pluginDir}/${name}`) as string);
  }
  files.set(`${pluginDir}/${OWNER_INPUT_PATH}`, ownerInput());
  // A plain mark until `sidecut-icon` draws the plugin's own.
  files.set(`${pluginDir}/assets/icon.png`, readFileSync(join(templatesRoot, '..', 'icon.png')));
  return writeAll(out, files);
}

/** The plugin's brand color from its Codex listing, which every skill's openai.yaml repeats. */
export function brandColorOf(pluginDir: string): string {
  try {
    const codex = JSON.parse(readFileSync(join(pluginDir, '.codex-plugin', 'plugin.json'), 'utf8'));
    return String(codex.interface?.brandColor ?? '');
  } catch {
    return '';
  }
}

/** Adds a skill skeleton to an existing plugin folder. Returns the files written, relative to the plugin. */
export function addSkill(pluginDir: string, input: SkillInput): string[] {
  const previous = current();
  useSettings(repoSettings(join(pluginDir, '..', '..')));
  try {
    return writeSkill(pluginDir, input);
  } finally {
    useSettings(previous);
  }
}

function writeSkill(pluginDir: string, input: SkillInput): string[] {
  const prefix = skillPrefixOf(basename(pluginDir));
  const problems = checkSkillInput(input, prefix);
  if (problems.length > 0)
    throw new Error(problems.map((p) => `${p.code}: ${p.message}`).join('\n'));
  const skillDir = join('skills', input.name);
  if (existsSync(join(pluginDir, skillDir))) throw new Error(`Skill ${input.name} already exists.`);
  const vars = {
    skill: input.name,
    skillTitle: skillTitleOf(input.name, prefix),
    skillDoes: input.does,
    skillPrompt: defaultPromptOf(input.does),
    brandColor: brandColorOf(pluginDir),
  };
  const files = new Map<string, string>();
  const template = input.name === prefix ? 'router' : 'skill';
  for (const [path, text] of renderTree(template, vars)) files.set(join(skillDir, path), text);
  if (!existsSync(join(pluginDir, OWNER_INPUT_PATH))) {
    files.set(OWNER_INPUT_PATH, ownerInput());
  }
  return writeAll(pluginDir, files);
}
