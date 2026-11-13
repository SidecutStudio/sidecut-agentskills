import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brandColorOf, displayNameOf, listFiles, PLUGIN_ID, templatesRoot } from '../scaffold.ts';
import { checkMarkdown, paragraphAfter, parseMarkdown, sections, tableAfter } from './markdown.ts';
import { type Report, sameJson, sentences } from './report.ts';
import { checkServer } from './server.ts';
import { checkSkills } from './skills.ts';

const PLUGIN_ENTRIES = new Set([
  '.claude-plugin',
  '.codex-plugin',
  '.mcp.json',
  'mcp.json',
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'assets',
  'agents',
  'codex',
  'hooks',
  'server',
  'skills',
  'evals',
]);
const SHARED_FIELDS = [
  'name',
  'version',
  'description',
  'author',
  'homepage',
  'repository',
  'license',
  'keywords',
];
const INTERFACE_FIELDS = [
  'displayName',
  'shortDescription',
  'longDescription',
  'developerName',
  'category',
  'capabilities',
  'websiteURL',
  'defaultPrompt',
  'brandColor',
  'composerIcon',
  'logo',
];
const SEMVER = /^\d+\.\d+\.\d+$/;
const README_SECTIONS = [
  'What it does',
  'Install',
  'Use',
  'Settings',
  'Privacy',
  'Develop',
  'License',
];
const CHANGELOG_SECTIONS = ['Added', 'Changed', 'Fixed', 'Removed'];

type Json = Record<string, unknown>;

function readJson(path: string, root: string, report: Report): Json | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Json;
  } catch {
    report.add(
      'JSON_INVALID',
      relative(root, path),
      undefined,
      'File is not valid JSON.',
      'Fix the JSON.',
    );
    return null;
  }
}

function checkKeys(
  obj: Json,
  expected: string[],
  file: string,
  report: Report,
  code: string,
): void {
  const keys = Object.keys(obj);
  if (keys.join() !== expected.join()) {
    report.add(
      code,
      file,
      undefined,
      `Fields are ${keys.join(', ')}.`,
      `Use exactly, in order: ${expected.join(', ')}.`,
    );
  }
}

function emptyDirs(dir: string): string[] {
  const entries = readdirSync(dir);
  const found = entries.length === 0 ? [dir] : [];
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...emptyDirs(path));
  }
  return found;
}

function pngSize(path: string): [number, number] | null {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR') return null;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function checkLayout(pluginDir: string, root: string, report: Report): void {
  for (const name of readdirSync(pluginDir)) {
    if (name === '.DS_Store') continue;
    if (!PLUGIN_ENTRIES.has(name)) {
      const hint =
        name === 'plugin.json'
          ? 'Codex reads .codex-plugin/plugin.json; a root plugin.json stops it loading hooks.'
          : name === 'commands'
            ? 'Turn commands into skills.'
            : 'Move or remove it.';
      report.add(
        'PLUGIN_ENTRY_UNEXPECTED',
        relative(root, join(pluginDir, name)),
        undefined,
        `"${name}" isn't part of the plugin layout.`,
        hint,
      );
    }
  }
  for (const dir of emptyDirs(pluginDir)) {
    report.add(
      'PLUGIN_EMPTY_FOLDER',
      relative(root, dir),
      undefined,
      'Empty folder.',
      'Remove it.',
    );
  }
  const assets = join(pluginDir, 'assets');
  const icon = join(assets, 'icon.png');
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      if (name !== 'icon.png')
        report.add(
          'PLUGIN_ASSET',
          relative(root, join(assets, name)),
          undefined,
          'Only assets/icon.png is allowed.',
          'Remove it.',
        );
    }
  }
  const size = existsSync(icon) ? pngSize(icon) : null;
  if (size?.[0] !== 512 || size[1] !== 512) {
    report.add(
      'PLUGIN_ICON',
      relative(root, icon),
      undefined,
      'assets/icon.png is missing or not a 512 by 512 PNG.',
      'Add a 512 by 512 PNG.',
    );
  }
  if (existsSync(join(pluginDir, 'agents'))) {
    for (const name of readdirSync(join(pluginDir, 'agents'))) {
      if (!/^[a-z]+\.md$/.test(name)) {
        report.add(
          'NAME_AGENT',
          relative(root, join(pluginDir, 'agents', name)),
          undefined,
          'Subagent file is not a one-word role noun.',
          'Rename it, for example `reviewer.md`.',
        );
      }
      // Codex loads subagents only from a project's .codex/agents/, so each one ships as a profile.
      const prefix = relative(join(pluginDir, '..'), pluginDir).replace(/^sidecut-/, '');
      const profile = join(
        pluginDir,
        'codex',
        'agents',
        `${prefix}-${name.replace(/\.md$/, '')}.toml`,
      );
      if (!existsSync(profile)) {
        report.add(
          'AGENT_CODEX_PROFILE',
          relative(root, profile),
          undefined,
          'The subagent has no Codex profile.',
          'Run `bun run build`, which writes codex/agents/ from agents/.',
        );
      }
    }
  }
}

function checkManifests(
  pluginDir: string,
  id: string,
  repoName: string | null,
  root: string,
  report: Report,
): Json | null {
  const claudePath = join(pluginDir, '.claude-plugin', 'plugin.json');
  const portablePath = join(pluginDir, '.codex-plugin', 'plugin.json');
  for (const path of [claudePath, portablePath]) {
    if (!existsSync(path))
      report.add(
        'MANIFEST_MISSING',
        relative(root, path),
        undefined,
        'Manifest is missing.',
        'Add it from the template.',
      );
  }
  if (!existsSync(claudePath) || !existsSync(portablePath)) return null;
  const claude = readJson(claudePath, root, report);
  const portable = readJson(portablePath, root, report);
  if (!claude || !portable) return null;
  const claudeFile = relative(root, claudePath);
  const portableFile = relative(root, portablePath);
  checkKeys(claude, SHARED_FIELDS, claudeFile, report, 'MANIFEST_FIELDS');
  // Codex finds each part through a path in its manifest, and only what exists is listed.
  const paths: Json = { skills: './skills/' };
  if (existsSync(join(pluginDir, 'mcp.json'))) paths.mcpServers = './mcp.json';
  if (existsSync(join(pluginDir, 'hooks', 'codex-hooks.json')))
    paths.hooks = './hooks/codex-hooks.json';
  checkKeys(
    portable,
    [...SHARED_FIELDS, ...Object.keys(paths), 'interface'],
    portableFile,
    report,
    'MANIFEST_FIELDS',
  );
  for (const [field, value] of Object.entries(paths)) {
    if (portable[field] !== value)
      report.add(
        'MANIFEST_CODEX_PATH',
        portableFile,
        undefined,
        `"${field}" is not "${value}".`,
        'Set it.',
      );
  }
  for (const field of SHARED_FIELDS) {
    if (!sameJson(claude[field], portable[field])) {
      report.add(
        'MANIFEST_SYNC',
        portableFile,
        undefined,
        `"${field}" differs from .claude-plugin/plugin.json.`,
        'Make the shared fields identical.',
      );
    }
  }
  if (claude.name !== id || !PLUGIN_ID.test(id)) {
    report.add(
      'MANIFEST_NAME',
      claudeFile,
      undefined,
      `Name must be the folder name "${id}" in the form sidecut-<name>.`,
      'Rename the plugin or its folder.',
    );
  }
  if (typeof claude.version !== 'string' || !SEMVER.test(claude.version)) {
    report.add('MANIFEST_VERSION', claudeFile, undefined, 'Version is not x.y.z.', 'Use SemVer.');
  }
  const description = String(claude.description ?? '');
  if (
    description.length > 120 ||
    !description.endsWith('.') ||
    sentences(description).length !== 1
  ) {
    report.add(
      'MANIFEST_DESCRIPTION',
      claudeFile,
      undefined,
      'Description is not one sentence of at most 120 characters.',
      'Shorten it to one sentence ending with a full stop.',
    );
  }
  if (!sameJson(claude.author, { name: 'Sidecut Studio', url: 'https://sidecut.dev' })) {
    report.add(
      'MANIFEST_AUTHOR',
      claudeFile,
      undefined,
      'Author is not Sidecut Studio.',
      'Use `{ "name": "Sidecut Studio", "url": "https://sidecut.dev" }`.',
    );
  }
  if (claude.homepage !== 'https://sidecut.dev')
    report.add(
      'MANIFEST_HOMEPAGE',
      claudeFile,
      undefined,
      'Homepage is not https://sidecut.dev.',
      'Set it.',
    );
  const repository = String(claude.repository ?? '');
  const repoOk = repoName
    ? repository === `https://github.com/SidecutStudio/${repoName}`
    : repository.startsWith('https://github.com/SidecutStudio/');
  if (!repoOk)
    report.add(
      'MANIFEST_REPOSITORY',
      claudeFile,
      undefined,
      `Repository "${repository}" is not this SidecutStudio repo.`,
      'Point it at the GitHub repo.',
    );
  if (claude.license !== 'MIT')
    report.add(
      'MANIFEST_LICENSE',
      claudeFile,
      undefined,
      'License is not MIT.',
      'Set `"license": "MIT"`.',
    );
  const keywords = Array.isArray(claude.keywords) ? (claude.keywords as string[]) : [];
  if (
    keywords.length < 3 ||
    keywords.length > 8 ||
    keywords.some((k) => k !== k.toLowerCase() || k === id)
  ) {
    report.add(
      'MANIFEST_KEYWORDS',
      claudeFile,
      undefined,
      'Keywords are not 3 to 8 lowercase words without the plugin id.',
      'Fix the keyword list.',
    );
  }
  const ui = (portable.interface ?? {}) as Json;
  checkKeys(ui, INTERFACE_FIELDS, portableFile, report, 'MANIFEST_INTERFACE');
  const expected: Json = {
    displayName: displayNameOf(id),
    shortDescription: description,
    developerName: 'Sidecut Studio',
    websiteURL: 'https://sidecut.dev',
    composerIcon: './assets/icon.png',
    logo: './assets/icon.png',
  };
  for (const [key, value] of Object.entries(expected)) {
    if (ui[key] !== value)
      report.add(
        'MANIFEST_INTERFACE',
        portableFile,
        undefined,
        `interface.${key} is not "${value}".`,
        'Set it.',
      );
  }
  const long = sentences(String(ui.longDescription ?? '')).length;
  if (long < 2 || long > 3)
    report.add(
      'MANIFEST_INTERFACE',
      portableFile,
      undefined,
      'longDescription is not 2 or 3 sentences.',
      'Rewrite it in 2 or 3 sentences.',
    );
  const prompts = Array.isArray(ui.defaultPrompt) ? (ui.defaultPrompt as string[]) : [];
  if (prompts.length < 1 || prompts.length > 3 || prompts.some((p) => p.length > 128)) {
    report.add(
      'MANIFEST_INTERFACE',
      portableFile,
      undefined,
      'defaultPrompt is not 1 to 3 prompts of at most 128 characters.',
      'Fix the prompt list.',
    );
  }
  if (!/^#[0-9A-F]{6}$/.test(String(ui.brandColor ?? ''))) {
    report.add(
      'MANIFEST_INTERFACE',
      portableFile,
      undefined,
      'brandColor is not an upper-case hex color.',
      'Use a color such as #ED8D70.',
    );
  }
  return claude;
}

function checkMcp(pluginDir: string, id: string, root: string, report: Report): Set<string> | null {
  const claudePath = join(pluginDir, '.mcp.json');
  const portablePath = join(pluginDir, 'mcp.json');
  const hasClaude = existsSync(claudePath);
  const hasPortable = existsSync(portablePath);
  if (!hasClaude && !hasPortable) return null;
  if (hasClaude !== hasPortable) {
    report.add(
      'MCP_PAIR',
      relative(root, pluginDir),
      undefined,
      'Only one of .mcp.json and mcp.json exists.',
      'Add the other; Claude Code reads .mcp.json and Codex reads mcp.json.',
    );
    return null;
  }
  const claude = readJson(claudePath, root, report);
  const portable = readJson(portablePath, root, report);
  if (!claude || !portable) return null;
  const claudeFile = relative(root, claudePath);
  const portableFile = relative(root, portablePath);
  checkKeys(claude, ['mcpServers'], claudeFile, report, 'MCP_FIELDS');
  checkKeys(portable, ['mcpServers'], portableFile, report, 'MCP_FIELDS');
  const a = (claude.mcpServers ?? {}) as Record<string, Json>;
  const b = (portable.mcpServers ?? {}) as Record<string, Json>;
  const key = id.replace(/^sidecut-/, '');
  if (Object.keys(a).join() !== key || Object.keys(b).join() !== key) {
    report.add(
      'MCP_KEY',
      claudeFile,
      undefined,
      `Each MCP file must define one server named "${key}".`,
      `Name the server "${key}" in both files.`,
    );
  }
  let local = false;
  for (const [name, server] of Object.entries(a)) {
    const other = b[name] ?? {};
    if (server.url) {
      if (!sameJson(server, { type: 'http', url: server.url }) || !sameJson(other, server)) {
        report.add(
          'MCP_REMOTE',
          claudeFile,
          undefined,
          `Remote server "${name}" isn't the same \`type: http\` and \`url\` in .mcp.json and mcp.json.`,
          'Use only `type` and `url`.',
        );
      }
    } else {
      local = true;
      if (
        !sameJson(server, { command: 'node', args: [`\${CLAUDE_PLUGIN_ROOT}/server/index.mjs`] })
      ) {
        report.add(
          'MCP_LOCAL',
          claudeFile,
          undefined,
          `Server "${name}" isn't node running \${CLAUDE_PLUGIN_ROOT}/server/index.mjs.`,
          'Use only `command` and `args` as the template does.',
        );
      }
      if (
        // Codex fills in no root variable for MCP servers, but resolves `cwd` from the plugin root.
        !sameJson(other, { command: 'node', args: ['server/index.mjs'], cwd: '.' })
      ) {
        report.add(
          'MCP_LOCAL',
          portableFile,
          undefined,
          `Server "${name}" isn't node running server/index.mjs with \`cwd: "."\`.`,
          'Use `command`, `args` and `cwd` as the template does.',
        );
      }
    }
  }
  return local ? checkServer(pluginDir, root, report) : null;
}

function kebab(event: string): string {
  return event.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function checkHookConfig(
  config: Json,
  file: string,
  registered: Set<string>,
  report: Report,
): void {
  for (const [event, groups] of Object.entries((config.hooks ?? {}) as Record<string, Json[]>)) {
    for (const group of groups) {
      for (const handler of (group.hooks ?? []) as Json[]) {
        const match = /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/([a-z0-9-]+\.mjs)"$/.exec(
          String(handler.command ?? ''),
        );
        if (!match) {
          report.add(
            'HOOK_COMMAND',
            file,
            undefined,
            `A ${event} hook isn't \`node "\${CLAUDE_PLUGIN_ROOT}/hooks/<file>.mjs"\`.`,
            'Run a hook script with node from the plugin root; Codex fills in the same variable.',
          );
          continue;
        }
        const script = match[1] ?? '';
        registered.add(script);
        if (!script.startsWith(`${kebab(event)}-`)) {
          report.add(
            'NAME_HOOK',
            file,
            undefined,
            `Hook ${script} doesn't start with its event, ${kebab(event)}.`,
            `Rename it to ${kebab(event)}-<what>.mjs.`,
          );
        }
        if (typeof handler.timeout !== 'number' || handler.timeout > 5) {
          report.add(
            'HOOK_TIMEOUT',
            file,
            undefined,
            `Hook ${script} has no timeout of 5 or less.`,
            'Add `"timeout": 5`.',
          );
        }
      }
    }
  }
}

function checkHooks(pluginDir: string, root: string, report: Report): void {
  const dir = join(pluginDir, 'hooks');
  if (!existsSync(dir)) return;
  const configPath = join(dir, 'hooks.json');
  if (!existsSync(configPath) || !readJson(configPath, root, report)) {
    report.add(
      'HOOKS_CONFIG',
      relative(root, configPath),
      undefined,
      'hooks/ has no valid hooks.json.',
      'Add hooks.json or remove the folder.',
    );
    return;
  }
  // Claude Code reads hooks.json; Codex reads codex-hooks.json, named in its manifest.
  const registered = new Set<string>();
  const byHost = new Map<string, Set<string>>();
  for (const name of ['hooks.json', 'codex-hooks.json']) {
    const path = join(dir, name);
    const config = existsSync(path) ? readJson(path, root, report) : null;
    const scripts = new Set<string>();
    if (config) checkHookConfig(config, relative(root, path), scripts, report);
    for (const script of scripts) registered.add(script);
    byHost.set(name, scripts);
  }
  // Every hook runs in both hosts, so each script is registered in both files.
  const claudeHooks = [...(byHost.get('hooks.json') ?? [])].sort().join();
  const codexHooks = [...(byHost.get('codex-hooks.json') ?? [])].sort().join();
  if (claudeHooks !== codexHooks) {
    report.add(
      'HOOK_PARITY',
      relative(root, join(dir, 'codex-hooks.json')),
      undefined,
      "hooks.json and codex-hooks.json don't register the same scripts.",
      'Register every hook script in both, with the event and matcher each host uses.',
    );
  }
  const scripts = readdirSync(dir).filter((n) => n.endsWith('.mjs'));
  for (const name of scripts) {
    const path = join(dir, name);
    if (!registered.has(name))
      report.add(
        'HOOK_UNREGISTERED',
        relative(root, path),
        undefined,
        'Hook script is not registered.',
        'Register it in hooks.json or codex-hooks.json, or delete it.',
      );
    const text = readFileSync(path, 'utf8');
    if (/\bfetch\(|node:https?|node:net|node:dgram/.test(text)) {
      report.add(
        'HOOK_NETWORK',
        relative(root, path),
        undefined,
        'Hook uses the network.',
        'Hooks make no network calls.',
      );
    }
    if (name === 'post-tool-use-skill-log.mjs') {
      const canonical = readFileSync(
        join(templatesRoot, 'plugin', 'hooks', `${name}.tmpl`),
        'utf8',
      );
      if (text !== canonical) {
        report.add(
          'HOOK_SKILL_LOG',
          relative(root, path),
          undefined,
          'The usage log hook differs from the Sidecut copy.',
          'Copy it again from the sidecut-agentskills template.',
        );
      }
    }
  }
  for (const name of registered) {
    if (!scripts.includes(name))
      report.add(
        'HOOK_MISSING',
        relative(root, dir),
        undefined,
        `Registered hook ${name} doesn't exist.`,
        'Add the script or remove the entry.',
      );
  }
}

function checkEvals(pluginDir: string, skills: string[], root: string, report: Report): void {
  const dir = join(pluginDir, 'evals');
  const cases = existsSync(dir)
    ? readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory())
    : [];
  for (const name of cases) {
    const where = relative(root, join(dir, name));
    const owner = skills.find((s) => name.startsWith(`${s}-`));
    if (!owner && !/^negative-[a-z0-9-]+$/.test(name)) {
      report.add(
        'EVAL_NAME',
        where,
        undefined,
        'Eval case is not named <skill>-<what> or negative-<what>.',
        'Rename it after the skill it tests.',
      );
    }
    const prompt = join(dir, name, 'prompt.md');
    if (!existsSync(prompt) || !readFileSync(prompt, 'utf8').startsWith('---\n')) {
      report.add(
        'EVAL_PROMPT',
        where,
        undefined,
        'Eval case has no prompt.md with frontmatter.',
        'Add prompt.md with tags, runs, max_turns and allowed_tools.',
      );
    }
    const graders = join(dir, name, 'graders');
    if (!existsSync(graders) || !readdirSync(graders).some((g) => g.endsWith('.md'))) {
      report.add(
        'EVAL_GRADERS',
        where,
        undefined,
        'Eval case has no graders.',
        'Add at least one graders/*.md file.',
      );
    }
  }
  if (cases.length > 0 && !cases.some((c) => c.startsWith('negative-'))) {
    report.add(
      'EVAL_MISSING',
      relative(root, dir),
      undefined,
      'There is no negative- eval case.',
      'Add evals/negative-<what>/ for a request no skill should answer.',
    );
  }
  for (const skill of skills) {
    if (!cases.some((c) => c.startsWith(`${skill}-`))) {
      report.add(
        'EVAL_MISSING',
        relative(root, dir),
        undefined,
        `Skill ${skill} has no eval case.`,
        `Add evals/${skill}-<what>/ with a trigger case.`,
      );
    }
  }
}

function checkReadme(
  pluginDir: string,
  description: string,
  skills: { name: string; firstSentence: string }[],
  root: string,
  report: Report,
): void {
  const path = join(pluginDir, 'README.md');
  if (!existsSync(path)) {
    report.add(
      'README_MISSING',
      relative(root, path),
      undefined,
      'Plugin has no README.md.',
      'Add it from the template.',
    );
    return;
  }
  const file = relative(root, path);
  const text = readFileSync(path, 'utf8');
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report, { skipH1Case: true });
  const h1 = doc.headings.find((h) => h.level === 1);
  const id = relative(join(pluginDir, '..'), pluginDir);
  if (h1 && h1.text !== displayNameOf(id))
    report.add(
      'README_TITLE',
      file,
      h1.line,
      `H1 is not "${displayNameOf(id)}".`,
      'Use the display name.',
    );
  if (h1 && paragraphAfter(doc, h1.line)?.text !== description) {
    report.add(
      'README_DESCRIPTION',
      file,
      h1.line + 2,
      'First paragraph is not the manifest description.',
      'Use the description word for word.',
    );
  }
  const found = sections(doc);
  if (found.map((h) => h.text).join('|') !== README_SECTIONS.join('|')) {
    report.add(
      'README_SECTIONS',
      file,
      found[0]?.line,
      'Sections are not the README layout.',
      `Use exactly: ${README_SECTIONS.join(', ')}.`,
    );
  }
  const whatItDoes = found.find((h) => h.text === 'What it does');
  if (whatItDoes) {
    const rows = tableAfter(doc, whatItDoes);
    const want = [['Skill', 'Does'], ...skills.map((s) => [`\`${s.name}\``, s.firstSentence])];
    if (!sameJson(rows, want)) {
      report.add(
        'README_SKILLS',
        file,
        whatItDoes.line,
        "The skill table doesn't match the skills.",
        "List every skill once, in name order, with its description's first sentence.",
      );
    }
  }
  if (!text.includes('## License\n\nMIT. See [LICENSE](LICENSE).\n')) {
    report.add(
      'README_LICENSE',
      file,
      undefined,
      'License section is not "MIT. See [LICENSE](LICENSE)."',
      'Use that line.',
    );
  }
}

function checkChangelog(pluginDir: string, version: string, root: string, report: Report): void {
  const path = join(pluginDir, 'CHANGELOG.md');
  if (!existsSync(path)) {
    report.add(
      'CHANGELOG_MISSING',
      relative(root, path),
      undefined,
      'Plugin has no CHANGELOG.md.',
      'Add it.',
    );
    return;
  }
  const file = relative(root, path);
  const text = readFileSync(path, 'utf8');
  const doc = parseMarkdown(path, text);
  checkMarkdown(doc, text, root, report, { allowDates: true });
  if (doc.headings[0]?.text !== 'Changelog' || doc.headings[0]?.level !== 1) {
    report.add(
      'CHANGELOG_TITLE',
      file,
      1,
      'CHANGELOG does not open with `# Changelog`.',
      'Start with `# Changelog`.',
    );
  }
  const versions: string[] = [];
  let subsections: string[] = [];
  const flush = (line: number) => {
    const sorted = [...subsections].sort(
      (x, y) => CHANGELOG_SECTIONS.indexOf(x) - CHANGELOG_SECTIONS.indexOf(y),
    );
    if (
      subsections.some((s) => !CHANGELOG_SECTIONS.includes(s)) ||
      subsections.join() !== sorted.join()
    ) {
      report.add(
        'CHANGELOG_SECTIONS',
        file,
        line,
        'Entry sections are not Added, Changed, Fixed, Removed in order.',
        'Use only those, in that order.',
      );
    }
    subsections = [];
  };
  for (const h of doc.headings.slice(1)) {
    if (h.level === 2) {
      flush(h.line);
      const match = /^\[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/.exec(h.text);
      if (!match)
        report.add(
          'CHANGELOG_ENTRY',
          file,
          h.line,
          'Entry heading is not `## [x.y.z] - YYYY-MM-DD`.',
          'Fix the heading.',
        );
      else versions.push(match[1] ?? '');
    } else if (h.level === 3) subsections.push(h.text);
  }
  flush(doc.lines.length);
  if (versions[0] !== version) {
    report.add(
      'VERSION_SYNC',
      file,
      undefined,
      `Newest entry is ${versions[0] ?? 'missing'}, the manifests say ${version}.`,
      'Add an entry for the current version.',
    );
  }
  const numeric = versions.map((v) => v.split('.').map(Number));
  for (let i = 1; i < numeric.length; i++) {
    const [x, y] = [numeric[i - 1] ?? [], numeric[i] ?? []];
    const newer =
      (x[0] ?? 0) - (y[0] ?? 0) || (x[1] ?? 0) - (y[1] ?? 0) || (x[2] ?? 0) - (y[2] ?? 0);
    if (newer <= 0)
      report.add(
        'CHANGELOG_ORDER',
        file,
        undefined,
        'Entries are not newest first.',
        'Order entries by version, newest first.',
      );
  }
}

export type PluginResult = { version: string | null };

/** Checks one plugin folder. `repoName` is set when the repo exists to ship this plugin. */
export function checkPlugin(
  pluginDir: string,
  root: string,
  report: Report,
  repoName: string | null,
): PluginResult {
  const id = relative(join(pluginDir, '..'), pluginDir);
  checkLayout(pluginDir, root, report);
  const manifest = checkManifests(pluginDir, id, repoName, root, report);
  const tools = checkMcp(pluginDir, id, root, report);
  const skills = checkSkills(pluginDir, root, report, tools, id, brandColorOf(pluginDir));
  checkHooks(pluginDir, root, report);
  checkEvals(
    pluginDir,
    skills.map((s) => s.name),
    root,
    report,
  );
  const version = typeof manifest?.version === 'string' ? manifest.version : null;
  checkReadme(pluginDir, String(manifest?.description ?? ''), skills, root, report);
  if (version) checkChangelog(pluginDir, version, root, report);
  for (const path of listFiles(pluginDir)) {
    if (
      path.endsWith('.md') &&
      !path.includes('/skills/') &&
      !path.includes('/evals/') &&
      !/\/(README|CHANGELOG)\.md$/.test(path)
    ) {
      const text = readFileSync(path, 'utf8');
      checkMarkdown(parseMarkdown(path, text), text, root, report);
    }
  }
  return { version };
}
