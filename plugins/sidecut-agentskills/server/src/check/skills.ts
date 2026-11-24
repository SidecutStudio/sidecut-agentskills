import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  defaultPromptOf,
  isSkillName,
  listFiles,
  skillPrefixOf,
  skillTitleOf,
} from '../scaffold.ts';
import { checkMarkdown, parseMarkdown, prose } from './markdown.ts';
import { type Report, relativePosix, sentences } from './report.ts';

export type SkillInfo = {
  name: string;
  description: string;
  firstSentence: string;
  /** Claude Code never starts it on its own, so Codex mustn't either. */
  manualOnly: boolean;
};

const FRONTMATTER_ORDER = [
  'name',
  'description',
  'argument-hint',
  'allowed-tools',
  'user-invocable',
  'disable-model-invocation',
  'paths',
  'model',
  'effort',
  'context',
  'agent',
];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const SUPPORT_FOLDERS: Record<string, RegExp> = {
  references: /^[a-z0-9]+(-[a-z0-9]+)*\.md$/,
  examples: /^[a-z0-9]+(-[a-z0-9]+)*\.md$/,
  scripts: /^[a-z]+(-[a-z]+)+\.mjs$/,
};
// Backticked names that read as MCP tools: a verb, then an object, in snake_case.
const TOOL_NAME =
  /^(get|list|add|check|scaffold|create|update|delete|remove|set|run|publish|call|search|fetch|read|write|send|start|stop)(_[a-z]+)+$/;
const DESCRIPTION_SHAPE = /^[A-Z][a-z]+s [^.]*(\.[^ ][^.]*)*\. Use when .+\.$/;

type Frontmatter = { keys: string[]; values: Map<string, string>; lines: Map<string, number> };

function parseFrontmatter(lines: string[]): Frontmatter {
  const keys: string[] = [];
  const values = new Map<string, string>();
  const lineOf = new Map<string, number>();
  lines.forEach((line, i) => {
    const match = /^([a-z-]+):(?: (.*))?$/.exec(line);
    if (!match) return;
    const key = match[1] ?? '';
    keys.push(key);
    values.set(key, match[2] ?? '');
    lineOf.set(key, i + 2);
  });
  return { keys, values, lines: lineOf };
}

function checkFrontmatter(
  name: string,
  lines: string[] | null,
  file: string,
  report: Report,
  tools: Set<string> | null,
  plugin: string,
): SkillInfo | null {
  if (!lines) {
    report.add(
      'SKILL_FRONTMATTER',
      file,
      1,
      'SKILL.md has no frontmatter.',
      'Start with `---`, `name` and `description`.',
    );
    return null;
  }
  const fm = parseFrontmatter(lines);
  const unknown = fm.keys.filter((k) => !FRONTMATTER_ORDER.includes(k));
  for (const key of unknown) {
    report.add(
      'SKILL_FIELD_UNKNOWN',
      file,
      fm.lines.get(key),
      `Field "${key}" isn't used.`,
      `Use only: ${FRONTMATTER_ORDER.join(', ')}.`,
    );
  }
  const known = fm.keys.filter((k) => FRONTMATTER_ORDER.includes(k));
  const sorted = [...known].sort(
    (a, b) => FRONTMATTER_ORDER.indexOf(a) - FRONTMATTER_ORDER.indexOf(b),
  );
  if (known.join() !== sorted.join()) {
    report.add(
      'SKILL_FIELD_ORDER',
      file,
      2,
      'Frontmatter fields are out of order.',
      `Order them: ${sorted.join(', ')}.`,
    );
  }
  if (fm.values.get('name') !== name) {
    report.add(
      'SKILL_NAME_FIELD',
      file,
      fm.lines.get('name'),
      '`name` differs from the folder name.',
      `Set \`name: ${name}\`.`,
    );
  }
  const raw = fm.values.get('description') ?? '';
  const quoted = /^"([^"]*)"$/.exec(raw);
  if (!quoted) {
    report.add(
      'SKILL_DESCRIPTION_QUOTES',
      file,
      fm.lines.get('description'),
      'Description is not one double-quoted line.',
      'Write `description: "..."` on one line.',
    );
    return null;
  }
  const description = quoted[1] ?? '';
  if (description.length > 400) {
    report.add(
      'SKILL_DESCRIPTION_LENGTH',
      file,
      fm.lines.get('description'),
      `Description is ${description.length} characters.`,
      'Keep it to 400 or fewer.',
    );
  }
  if (!DESCRIPTION_SHAPE.test(description)) {
    report.add(
      'SKILL_DESCRIPTION_SHAPE',
      file,
      fm.lines.get('description'),
      'Description needs a capability and concrete trigger.',
      'Describe what the skill does, then when to use it. Add an exclusion only if useful.',
    );
  }
  if (fm.keys.includes('allowed-tools')) {
    const start = (fm.lines.get('allowed-tools') ?? 0) - 1;
    // This plugin's MCP tools are named mcp__plugin_<plugin>_<server>__<tool> in Claude Code.
    const own = `mcp__plugin_${plugin}_${skillPrefixOf(plugin)}__`;
    for (let i = start; /^ {2}- /.test(lines[i] ?? ''); i++) {
      const entry = (lines[i] ?? '').slice(4).trim();
      if (!entry.startsWith('mcp__')) continue;
      const tool = entry.startsWith(own) ? entry.slice(own.length) : null;
      if (!tool || (tools && !tools.has(tool))) {
        report.add(
          'SKILL_ALLOWED_MCP',
          file,
          i + 2,
          `\`${entry}\` isn't one of this plugin's MCP tools.`,
          `Name a tool the server has, as \`${own}<tool>\`.`,
        );
      }
    }
    if (fm.values.get('allowed-tools') !== '' || !/^ {2}- \S/.test(lines[start] ?? '')) {
      report.add(
        'SKILL_ALLOWED_TOOLS',
        file,
        start + 1,
        '`allowed-tools` is not a YAML list.',
        'List each tool on its own `  - ` line.',
      );
    }
  }
  if (fm.keys.includes('user-invocable') && fm.values.get('user-invocable') !== 'false') {
    report.add(
      'SKILL_DEFAULT_FIELD',
      file,
      fm.lines.get('user-invocable'),
      '`user-invocable` repeats its default.',
      'Remove it, or set it to `false`.',
    );
  }
  if (
    fm.keys.includes('disable-model-invocation') &&
    fm.values.get('disable-model-invocation') !== 'true'
  ) {
    report.add(
      'SKILL_DEFAULT_FIELD',
      file,
      fm.lines.get('disable-model-invocation'),
      '`disable-model-invocation` repeats its default.',
      'Remove it, or set it to `true`.',
    );
  }
  const effort = fm.values.get('effort');
  if (effort !== undefined && !EFFORTS.includes(effort)) {
    report.add(
      'SKILL_EFFORT',
      file,
      fm.lines.get('effort'),
      `\`effort: ${effort}\` isn't a level.`,
      `Use one of ${EFFORTS.join(', ')}.`,
    );
  }
  const context = fm.values.get('context');
  const forked = context === 'fork' && Boolean(fm.values.get('agent'));
  if ((context !== undefined || fm.keys.includes('agent')) && !forked) {
    report.add(
      'SKILL_FORK',
      file,
      fm.lines.get('context') ?? fm.lines.get('agent'),
      '`context` and `agent` are not set together.',
      'Use `context: fork` with `agent: <subagent>`, or neither.',
    );
  }
  return {
    name,
    description,
    firstSentence: sentences(description)[0] ?? '',
    manualOnly: fm.values.get('disable-model-invocation') === 'true',
  };
}

function supportFiles(dir: string): string[] {
  return Object.keys(SUPPORT_FOLDERS).flatMap((folder) =>
    existsSync(join(dir, folder))
      ? readdirSync(join(dir, folder))
          // Only files: a folder nested in a support folder is reported by checkLayout.
          .filter((f) => statSync(join(dir, folder, f)).isFile())
          .map((f) => `${folder}/${f}`)
      : [],
  );
}

function checkLayout(dir: string, root: string, report: Report): void {
  for (const path of listFiles(dir)) {
    const rel = relativePosix(dir, path);
    const file = relative(root, path);
    if (rel === 'SKILL.md' || rel === 'agents/openai.yaml') continue;
    const [folder, name, ...rest] = rel.split('/');
    const pattern = SUPPORT_FOLDERS[folder ?? ''];
    if (!pattern || rest.length > 0 || !pattern.test(name ?? '')) {
      report.add(
        'SKILL_FILE_UNEXPECTED',
        file,
        undefined,
        'File is not part of the skill layout.',
        'Keep only SKILL.md, agents/openai.yaml, references/, examples/ and scripts/ files, one level deep.',
      );
    }
  }
  if (!existsSync(join(dir, 'agents', 'openai.yaml'))) {
    report.add(
      'SKILL_OPENAI_YAML',
      relative(root, dir),
      undefined,
      'Skill has no agents/openai.yaml.',
      'Add it with display_name, short_description and default_prompt.',
    );
  }
}

/** The skill's agents/openai.yaml, exactly: how Codex lists it, and its invocation policy. */
export function openAiYamlOf(info: SkillInfo, title: string, brandColor: string): string {
  return [
    'interface:',
    `  display_name: "${title}"`,
    `  short_description: "${info.firstSentence}"`,
    // Codex accepts a path out of the skill only into the plugin's own assets/.
    '  icon_small: "../../assets/icon.png"',
    '  icon_large: "../../assets/icon.png"',
    `  brand_color: "${brandColor}"`,
    `  default_prompt: "Use $${info.name} to ${defaultPromptOf(info.firstSentence)}"`,
    ...(info.manualOnly ? ['policy:', '  allow_implicit_invocation: false'] : []),
    '',
  ].join('\n');
}

function checkOpenAiYaml(
  dir: string,
  info: SkillInfo,
  title: string,
  brandColor: string,
  root: string,
  report: Report,
): void {
  const path = join(dir, 'agents', 'openai.yaml');
  if (!existsSync(path)) return;
  const expected = openAiYamlOf(info, title, brandColor);
  if (readFileSync(path, 'utf8') !== expected) {
    report.add(
      'SKILL_OPENAI_YAML',
      relative(root, path),
      1,
      "openai.yaml doesn't match the skill.",
      `Make it exactly:\n${expected}`,
    );
  }
}

function checkSections(
  dir: string,
  name: string,
  root: string,
  report: Report,
  tools: Set<string> | null,
  skills: Set<string>,
  plugin: string,
): void {
  const path = join(dir, 'SKILL.md');
  const file = relative(root, path);
  const text = readFileSync(path, 'utf8');
  const doc = parseMarkdown(path, text);
  // SKILL_TITLE pins the H1 exactly, and a router's title is the display name.
  checkMarkdown(doc, text, root, report, { skipH1Case: true });
  if (doc.lines.length > 200) {
    report.add(
      'SKILL_LENGTH',
      file,
      201,
      `SKILL.md has ${doc.lines.length} lines.`,
      'Move detail into references/ to stay at 200 or fewer.',
    );
  }
  const prefix = skillPrefixOf(plugin);
  const title = skillTitleOf(name, prefix);
  const h1 = doc.headings.find((h) => h.level === 1);
  if (h1 && h1.text !== title) {
    report.add('SKILL_TITLE', file, h1.line, `H1 is "${h1.text}".`, `Make it "# ${title}".`);
  }
  const support = supportFiles(dir);
  for (const f of support) {
    if (!text.includes(f)) {
      report.add(
        'SKILL_REFERENCES',
        file,
        undefined,
        f + ' is not referenced from SKILL.md.',
        'Reference the supporting file where it helps.',
      );
    }
  }
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    const words = stepWords(line);
    if (words > LONG_STEP_WORDS) {
      report.add(
        'SKILL_LONG_STEP',
        file,
        i + 1,
        `A step or paragraph runs to ${words} words.`,
        'Split it into short steps under a heading that names the work, or move the detail into references/.',
      );
    }
    if (/\]\(\.\.\//.test(prose(line))) {
      report.add(
        'SKILL_LINK_OUTSIDE',
        file,
        i + 1,
        'Link leaves the skill folder.',
        'Name the other skill in backticks instead of linking its files.',
      );
    }
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const token = match[1] ?? '';
      const pointer = /^([a-z0-9-]+):([a-z0-9-]+)$/.exec(token);
      if (pointer && pointer[1] === plugin && !skills.has(pointer[2] ?? '')) {
        report.add(
          'SKILL_POINTER',
          file,
          i + 1,
          `\`${token}\` isn't a skill or subagent in this plugin.`,
          'Point at a skill or subagent that exists.',
        );
      }
      if (TOOL_NAME.test(token) && tools && !tools.has(token)) {
        report.add(
          'SKILL_TOOL',
          file,
          i + 1,
          `\`${token}\` isn't a tool on this plugin's MCP server.`,
          'Name a tool the server has.',
        );
      }
    }
  });
  for (const f of support) {
    const p = join(dir, f);
    if (f.endsWith('.md')) checkSupportDoc(p, root, report);
    else checkScript(p, root, report);
  }
}

function checkSupportDoc(path: string, root: string, report: Report): void {
  const file = relative(root, path);
  const text = readFileSync(path, 'utf8');
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report);
  if (doc.frontmatter)
    report.add(
      'REF_FRONTMATTER',
      file,
      1,
      'Reference file has frontmatter.',
      'Remove it; references are not skills.',
    );
  if (doc.lines.length > 300) {
    report.add(
      'REF_LENGTH',
      file,
      301,
      `File has ${doc.lines.length} lines.`,
      'Split it to stay at 300 or fewer.',
    );
  }
}

function checkScript(path: string, root: string, report: Report): void {
  const file = relative(root, path);
  const text = readFileSync(path, 'utf8');
  for (const match of text.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
    if (!(match[1] ?? '').startsWith('node:')) {
      report.add(
        'SCRIPT_IMPORT',
        file,
        undefined,
        `Imports "${match[1]}".`,
        'Use only built-in `node:` modules.',
      );
    }
  }
  if (!text.includes('--help'))
    report.add(
      'SCRIPT_HELP',
      file,
      undefined,
      'Script has no `--help`.',
      'Handle `--help` with a usage line.',
    );
  if (/\bfetch\(|node:https?|node:net/.test(text)) {
    report.add(
      'SCRIPT_NETWORK',
      file,
      undefined,
      'Script uses the network.',
      'Skill scripts work offline.',
    );
  }
}

/** Checks every skill in a plugin. Returns what the README table and other checks need. */
export function checkSkills(
  pluginDir: string,
  root: string,
  report: Report,
  tools: Set<string> | null,
  plugin: string,
  brandColor: string,
): SkillInfo[] {
  const skillsDir = join(pluginDir, 'skills');
  if (!existsSync(skillsDir)) {
    report.add(
      'PLUGIN_NO_SKILLS',
      relative(root, pluginDir),
      undefined,
      'Plugin has no skills folder.',
      'Add at least one skill.',
    );
    return [];
  }
  const names = readdirSync(skillsDir)
    .filter((n) => statSync(join(skillsDir, n)).isDirectory())
    .sort();
  const skills = new Set(names);
  // `<plugin>:<name>` can name a skill or one of the plugin's subagents.
  const agentsDir = join(pluginDir, 'agents');
  const targets = new Set(names);
  if (existsSync(agentsDir)) {
    for (const f of readdirSync(agentsDir)) if (f.endsWith('.md')) targets.add(f.slice(0, -3));
  }
  const prefix = skillPrefixOf(plugin);
  const infos: SkillInfo[] = [];
  for (const name of names) {
    const dir = join(skillsDir, name);
    const file = relative(root, join(dir, 'SKILL.md'));
    if (!isSkillName(name, prefix)) {
      report.add(
        'NAME_SKILL',
        relative(root, dir),
        undefined,
        `Skill "${name}" is not ${prefix}- then a 2 or 3 word verb-object name.`,
        `Rename it, for example \`${prefix}-write-skill\`, or \`${prefix}\` for the router.`,
      );
    }
    if (!existsSync(join(dir, 'SKILL.md'))) {
      report.add(
        'SKILL_MISSING',
        file,
        undefined,
        'Skill folder has no SKILL.md.',
        'Add SKILL.md or remove the folder.',
      );
      continue;
    }
    checkLayout(dir, root, report);
    const doc = parseMarkdown(join(dir, 'SKILL.md'), readFileSync(join(dir, 'SKILL.md'), 'utf8'));
    const info = checkFrontmatter(name, doc.frontmatter, file, report, tools, plugin);
    checkSections(dir, name, root, report, tools, targets, plugin);
    if (info) {
      checkOpenAiYaml(dir, info, skillTitleOf(name, prefix), brandColor, root, report);
      infos.push(info);
    }
  }
  const hasRouter = skills.has(prefix);
  const needsRouter = names.filter((n) => n !== prefix).length >= 4;
  if (hasRouter !== needsRouter) {
    report.add(
      'SKILL_ROUTER',
      relative(root, skillsDir),
      undefined,
      needsRouter
        ? `Plugin has 4 or more skills but no \`${prefix}\` router.`
        : `Plugin has a \`${prefix}\` router but fewer than 4 other skills.`,
      needsRouter ? `Add \`skills/${prefix}\`.` : `Remove \`skills/${prefix}\`.`,
    );
  }
  checkRepeatedText(skillsDir, names, root, report);
  return infos;
}

/** A step or paragraph longer than this many words is several steps, or detail for a reference. */
const LONG_STEP_WORDS = 120;
/** A line at least this many words long that two skills both carry is one block said twice. */
const REPEATED_LINE_WORDS = 12;

/** The words in a prose line or list item, leaving out headings, tables and blank lines. */
function stepWords(line: string): number {
  if (/^\s*$|^#{1,6} |^\|/.test(line)) return 0;
  return prose(line)
    .replace(/^\s*(- |\d+\. )/, '')
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Flags a long line that two or more of a plugin's skills share word for word, such as the same
 * failure list pasted into every skill: a block said once in a file they all point to, or in the one
 * skill that owns it, can't drift apart.
 */
function checkRepeatedText(skillsDir: string, names: string[], root: string, report: Report): void {
  const firstSeen = new Map<string, string>();
  for (const name of names) {
    const path = join(skillsDir, name, 'SKILL.md');
    if (!existsSync(path)) continue;
    const doc = parseMarkdown(path, readFileSync(path, 'utf8'));
    const seenHere = new Set<string>();
    doc.lines.forEach((line, i) => {
      if (doc.inCode[i] || stepWords(line) < REPEATED_LINE_WORDS) return;
      // A pointer to the plugin root or a shared file is meant to be in every skill that needs it.
      if (/plugin root|CLAUDE_PLUGIN_ROOT|server\/data\//.test(line)) return;
      const key = line.replace(/^\s*(- |\d+\. )/, '').trim();
      if (seenHere.has(key)) return;
      seenHere.add(key);
      const other = firstSeen.get(key);
      if (other === undefined) {
        firstSeen.set(key, name);
        return;
      }
      report.add(
        'SKILL_REPEATED_TEXT',
        relative(root, path),
        i + 1,
        `This line is also in \`${other}\`.`,
        'Say it once: in a file under server/data/ that both skills point to, or in the skill that owns it.',
      );
    });
  }
}
