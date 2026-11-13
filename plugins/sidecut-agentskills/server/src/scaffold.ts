import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { sentences } from './check/report.ts';

// The data folder sits next to the bundled server/index.mjs, or one level up from server/src/.
const here = dirname(fileURLToPath(import.meta.url));
export const dataRoot = existsSync(join(here, 'data'))
  ? join(here, 'data')
  : join(here, '..', 'data');
export const templatesRoot = join(dataRoot, 'templates');

export type PluginInput = {
  id: string;
  description: string;
  longDescription: string;
  keywords: string[];
  brandColor?: string;
  date?: string;
  /** Where the generated repo gets the house-style checker from. */
  checkerSource?: string;
};

export type SkillInput = { name: string; does: string };

export type Problem = { code: string; message: string };

export const PLUGIN_ID = /^sidecut-[a-z0-9]+(-[a-z0-9]+)*$/;
/** The verb-object part of a skill name, after the plugin prefix: 2 or 3 words. */
export const SKILL_NAME = /^[a-z]+(-[a-z]+){1,2}$/;

/** The prefix every skill name starts with: the plugin id without `sidecut-`. It alone names the router. */
export function skillPrefixOf(pluginId: string): string {
  return pluginId.replace(/^sidecut-/, '');
}

/** Whether a skill name is the router or `<prefix>-<verb>-<object>`. */
export function isSkillName(name: string, prefix: string): boolean {
  return (
    name === prefix ||
    (name.startsWith(`${prefix}-`) && SKILL_NAME.test(name.slice(prefix.length + 1)))
  );
}
const HEX_COLOR = /^#[0-9A-F]{6}$/;
const DEFAULT_CHECKER = 'github:SidecutStudio/sidecut-agentskills';

export function checkPluginInput(input: PluginInput): Problem[] {
  const problems: Problem[] = [];
  if (!PLUGIN_ID.test(input.id) || input.id.length > 64) {
    problems.push({
      code: 'NAME_PLUGIN_ID',
      message: `Plugin id "${input.id}" must be sidecut-<name> in lowercase kebab-case, at most 64 characters.`,
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
  if (input.brandColor && !HEX_COLOR.test(input.brandColor)) {
    problems.push({
      code: 'MANIFEST_BRAND_COLOR',
      message: 'The brand color must be an upper-case hex color such as #ED8D70.',
    });
  }
  return problems;
}

export function checkSkillInput(input: SkillInput, prefix: string): Problem[] {
  const problems: Problem[] = [];
  if (input.name === prefix || !isSkillName(input.name, prefix)) {
    problems.push({
      code: 'NAME_SKILL',
      message: `Skill name "${input.name}" must be ${prefix}- then a verb and an object, 2 or 3 words in kebab-case.`,
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
  if (name === prefix) return displayNameOf(`sidecut-${prefix}`);
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

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** A 512 by 512 PNG filled with one color, used as the starting icon. */
export function solidIcon(hex: string, size = 512): Buffer {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) row.set([r ?? 0, g ?? 0, b ?? 0], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeAll(out: string, files: Map<string, string | Buffer>): string[] {
  for (const [path, content] of files) {
    const target = join(out, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return [...files.keys()].sort();
}

/** Writes a new plugin repo to `out`. Returns the files written, relative to `out`. */
export function scaffoldPlugin(input: PluginInput, out: string): string[] {
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
    id: input.id,
    key: input.id.replace(/^sidecut-/, ''),
    displayName,
    description: input.description,
    longDescription: input.longDescription,
    keywordsJson: JSON.stringify(input.keywords),
    brandColor: input.brandColor ?? '#ED8D70',
    version,
    date,
    year: date.slice(0, 4),
    skillDoes,
    skillPrompt: defaultPromptOf(skillDoes),
    checkerSource: input.checkerSource ?? `${DEFAULT_CHECKER}#v${version}`,
  };

  const files = new Map<string, string | Buffer>();
  for (const [path, text] of renderTree('repo', vars)) files.set(path, text);
  const pluginDir = `plugins/${input.id}`;
  for (const [path, text] of renderTree('plugin', vars)) files.set(`${pluginDir}/${path}`, text);
  for (const name of ['README.md', 'LICENSE', 'CHANGELOG.md']) {
    files.set(name, files.get(`${pluginDir}/${name}`) as string);
  }
  files.set(`${pluginDir}/assets/icon.png`, solidIcon(vars.brandColor as string));
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
  for (const [path, text] of renderTree('skill', vars)) files.set(join(skillDir, path), text);
  return writeAll(pluginDir, files);
}
