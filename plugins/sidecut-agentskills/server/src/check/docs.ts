// Rules over the text of a whole repo, of any kind: links, retired names, dated notes, dead and
// pointer-only files, copies, line budgets, facts another repo owns and weak copy. Exact rules
// block; the heuristic ones are advisories (see ADVISORY_CODES).
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { current, escapeRegExp } from '../settings.ts';
import { SIDECUT_RETIRED, SOLO_FILE } from '../sidecut-profile.ts';
import { type Fleet, readToml, repoName, trackedFiles } from './fleet.ts';
import type { Kind } from './kinds.ts';
import { checkLinks, parseMarkdown, prose } from './markdown.ts';
import type { Report } from './report.ts';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.output', '.vercel']);
const TEXT = /\.(md|mdx|markdown|txt|html?|astro|ts|tsx|js|mjs|cjs|jsx|json|toml|ya?ml|css|sh)$/i;
const MARKDOWN = /\.(md|mdx|markdown)$/i;
const PROSE = /\.(md|mdx|markdown|txt|html?|astro)$/i;

/** Every file in the repo: git's tracked and unignored files, or a walk when it isn't a checkout. */
export function repoFiles(root: string): string[] {
  const tracked = trackedFiles(root);
  if (tracked) return tracked.filter((file) => lstatSync(join(root, file)).isFile());
  const walk = (dir: string): string[] =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(path);
      return entry.isFile() ? [path] : [];
    });
  return walk('');
}

/**
 * Files another tool writes and owns: skills a skills manager installs into each host's folder, and
 * an app builder's own plans. They're checked where they come from.
 */
export function isVendored(file: string): boolean {
  return (
    /^(\.agents|\.claude|\.codex|\.cursor|\.gemini)\/skills\//.test(file) ||
    file.startsWith('.lovable/') ||
    // A marketplace's bundled copies of other repos' plugins.
    file.startsWith('bundled/')
  );
}

/** History and tests, which may keep old names, dates and facts as they were. */
export function isHistoryOrTest(file: string): boolean {
  return (
    /(^|\/)CHANGELOG[^/]*$/i.test(file) ||
    /(^|\/)(tests?|__tests__|e2e|fixtures|examples?)\//.test(file) ||
    /(^|\/)(archive|records|[\w-]*history)\//i.test(file) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}

/** Text people read about the product outside the repo: READMEs, and a site's pages. */
function isPublicCopy(file: string, kind: Kind): boolean {
  if (/(^|\/)README[^/]*\.mdx?$/i.test(file)) return true;
  return kind === 'site' && /^(src|content|public|pages)\//.test(file) && PROSE.test(file);
}

type Text = { file: string; text: string };

function read(root: string, file: string): string | null {
  try {
    if (statSync(join(root, file)).size > 2_000_000) return null;
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return null;
  }
}

const MONTH =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
/** A note that pins guidance to the day someone looked, which goes stale the day after. */
export const DATED = new RegExp(
  `\\b(?:(?:accurate )?as of|read on|checked on|verified on|last (?:checked|verified|updated|reviewed|read)(?: on)?)\\s+(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2} ${MONTH} \\d{4}|${MONTH} (?:\\d{1,2},? )?\\d{4})`,
  'i',
);

/** Stock phrases and hedges: copy that says nothing a reader can check. */
export const WEAK_COPY =
  /\b(seamless(?:ly)?|leverag(?:e|es|ing)|robust|cutting[- ]edge|game[- ]chang\w*|unlock(?:s|ing)? the|empower\w*|best[- ]in[- ]class|world[- ]class|effortless(?:ly)?|supercharg\w*|next[- ]level|harness(?:es|ing)? the power|in today's fast[- ]paced|delv(?:e|es|ing) into|revolutioni[sz]\w*|it(?:'s| is) worth noting|might potentially|arguably|please note that|needless to say|rest assured)\b/i;

/** Lines that describe the person behind the work, which public copy never does. */
export const OWNER_DESCRIBED =
  /\b((?:by|from|I'm|I am|as) (?:a |an |one )?(?:solo (?:maker|founder|developer|dev|builder)|non[- ]technical founder|self[- ]taught (?:developer|maker|founder)|indie hacker|person)|(?:I'm|I am|who is|who's) not a (?:trained |professional |real )?developer|built by one person|one[- ](?:person|man|woman) (?:studio|shop|company) behind)\b/i;

/** Files a host loads by name, which nothing else needs to link to. */
function hostLoaded(file: string): boolean {
  const name = basename(file);
  return (
    !file.includes('/') ||
    /^(SKILL|AGENTS|CLAUDE|GEMINI|README|CHANGELOG|LICENSE|SECURITY|CONTRIBUTING)(\.[\w-]+)?\.mdx?$/i.test(
      name,
    ) ||
    /^(\.github|\.claude|\.agents|\.codex|\.cursor|evals)\//.test(file) ||
    /(^|\/)(agents|commands|rules)\/[^/]+\.md$/.test(file)
  );
}

/** Runs every whole-repo text rule. */
export function checkDocs(root: string, kind: Kind, fleet: Fleet | null, report: Report): void {
  const files = repoFiles(root).filter(
    (file) => !file.split('/').some((p) => SKIP_DIRS.has(p)) && !isVendored(file),
  );
  const texts: Text[] = files
    .filter((file) => TEXT.test(file) || /(^|\/)LICENSE[^/]*$/.test(file))
    .flatMap((file) => {
      const text = read(root, file);
      return text === null ? [] : [{ file, text }];
    });
  const markdown = texts.filter((t) => MARKDOWN.test(t.file));
  for (const t of markdown)
    if (!isHistoryOrTest(t.file))
      checkLinks(parseMarkdown(join(root, t.file), t.text), t.file, root, report);
  // A data repo's notes and records are its history.
  if (kind !== 'data') {
    checkRetired(texts, report);
    checkDated(markdown, report);
  }
  checkPointers(markdown, report);
  if (kind !== 'data') checkOrphans(markdown, texts, report);
  checkBudgets(markdown, kind, report);
  checkSmallRefs(markdown, report);
  checkDuplicates(root, markdown, report);
  checkCopy(texts, kind, report);
  checkOwnedFacts(root, markdown, fleet, report);
}

function checkRetired(texts: Text[], report: Report): void {
  if (current().workflow !== 'solo') return;
  for (const t of texts) {
    if (isHistoryOrTest(t.file) || !(PROSE.test(t.file) || /(^|\/)LICENSE[^/]*$/.test(t.file)))
      continue;
    t.text.split('\n').forEach((line, i) => {
      for (const name of SIDECUT_RETIRED) {
        name.re.lastIndex = 0;
        if (!name.re.test(line)) continue;
        report.add(
          'STALE_NAME',
          t.file,
          i + 1,
          `Names ${name.name}, which is retired.`,
          `Use ${name.use}. Only CHANGELOG history and tests keep the old name.`,
          name.autofix
            ? {
                what: `Replaced ${name.name} with ${name.use}.`,
                apply: (text) => text.replace(name.re, name.use),
              }
            : undefined,
        );
      }
    });
  }
}

function checkDated(markdown: Text[], report: Report): void {
  for (const t of markdown) {
    if (isHistoryOrTest(t.file)) continue;
    const doc = parseMarkdown(t.file, t.text);
    doc.lines.forEach((line, i) => {
      if (!doc.inCode[i] && DATED.test(prose(line)))
        report.add(
          'STALE_DATED',
          t.file,
          i + 1,
          'A dated "as of" note, which is stale the day after it was written.',
          'Say what is true now and drop the date; link to the source so it can be read again.',
        );
    });
  }
}

/** A Markdown file that only sends the reader somewhere else. */
function checkPointers(markdown: Text[], report: Report): void {
  for (const t of markdown) {
    if (/^(CLAUDE|GEMINI)\.md$/i.test(basename(t.file)) || isHistoryOrTest(t.file)) continue;
    const doc = parseMarkdown(t.file, t.text);
    // Frontmatter makes it a data file, such as an eval grader, not a page.
    if (doc.frontmatter) continue;
    const body = doc.lines.filter(
      (line, i) =>
        !doc.inCode[i] && line.trim() !== '' && !/^#{1,6} /.test(line) && !/^<!--.*-->$/.test(line),
    );
    const hasCode = doc.lines.some((line, i) => doc.inCode[i] && /^\s*```/.test(line));
    if (hasCode) continue;
    const pointer =
      body.length <= 2 &&
      body.every((line) => /\]\([^)]+\)|^@\S+/.test(line)) &&
      body
        .join(' ')
        .replace(/\[[^\]]*\]\([^)]*\)|@\S+/g, '')
        .split(/\s+/)
        .filter(Boolean).length <= 12;
    if (body.length === 0 || pointer)
      report.add(
        'DEAD_POINTER',
        t.file,
        1,
        body.length === 0 ? 'The file has no text.' : 'The file only points to another one.',
        'Remove it and link to the real file where this one was linked.',
      );
  }
}

/** Markdown that no other file in the repo names, so nobody finds it. */
function checkOrphans(markdown: Text[], texts: Text[], report: Report): void {
  const named = new Map<string, Set<string>>();
  for (const t of texts)
    for (const m of t.text.matchAll(/[\w.@/-]*?([\w.@-]+\.mdx?)\b/gi)) {
      const name = (m[1] ?? '').toLowerCase();
      if (!named.has(name)) named.set(name, new Set());
      named.get(name)?.add(t.file);
    }
  for (const t of markdown) {
    if (hostLoaded(t.file) || isHistoryOrTest(t.file)) continue;
    const by = named.get(basename(t.file).toLowerCase()) ?? new Set();
    if ([...by].some((file) => file !== t.file)) continue;
    report.add(
      'DEAD_ORPHAN',
      t.file,
      undefined,
      'No other file in the repo links to or names this one.',
      'Link it from where readers start (the "Read this when" table or the skill that reads it), or remove it.',
    );
  }
}

const AGENTS_LINES = 200;
const AGENTS_BYTES = 32 * 1024;
const DOC_LINES = 500;

function checkBudgets(markdown: Text[], kind: Kind, report: Report): void {
  for (const t of markdown) {
    if (isHistoryOrTest(t.file)) continue;
    const lines = t.text.split('\n').length;
    if (basename(t.file) === 'AGENTS.md') {
      if (lines > AGENTS_LINES || Buffer.byteLength(t.text) > AGENTS_BYTES)
        report.add(
          'AGENTS_BUDGET',
          t.file,
          undefined,
          `AGENTS.md is ${lines} lines and ${Math.ceil(Buffer.byteLength(t.text) / 1024)} KiB; it loads on every task, and Codex stops reading at 32 KiB.`,
          `Keep it under ${AGENTS_LINES} lines: move detail into docs/ and link it from "Read this when".`,
        );
    } else if (kind !== 'data' && lines > DOC_LINES)
      report.add(
        'BLOAT_LINES',
        t.file,
        undefined,
        `${lines} lines, past the ${DOC_LINES}-line budget for a doc.`,
        'Split it by what readers come for, or cut what the code already says.',
      );
  }
}

const SMALL_REF = 30;

/** A short reference file only one skill reads is cheaper inside that skill's SKILL.md. */
function checkSmallRefs(markdown: Text[], report: Report): void {
  const skills = markdown.filter((t) => /^plugins\/[^/]+\/skills\/[^/]+\/SKILL\.md$/.test(t.file));
  for (const t of markdown) {
    const m = /^(plugins\/[^/]+\/skills\/[^/]+)\/(.+\.md)$/.exec(t.file);
    if (!m || basename(t.file) === 'SKILL.md') continue;
    if (t.text.split('\n').filter((l) => l.trim()).length >= SMALL_REF) continue;
    const name = basename(t.file);
    const readers = skills.filter(
      (s) => s.file.startsWith(`${m[1]}/`) || s.text.includes(name),
    ).length;
    if (readers <= 1)
      report.add(
        'BLOAT_SMALL_REF',
        t.file,
        undefined,
        `Under ${SMALL_REF} lines and read by one skill, so it costs an extra read for little.`,
        'Fold it into that SKILL.md.',
      );
  }
}

/** The repo's generated files, from Solo's protected_paths. */
function generatedFiles(root: string): Set<string> {
  const path = join(root, SOLO_FILE);
  if (!existsSync(path)) return new Set();
  const value = readToml(readFileSync(path, 'utf8'))['']?.protected_paths;
  return new Set(Array.isArray(value) ? value : []);
}

/** The same Markdown in two places, with nothing keeping the copies the same. */
function checkDuplicates(root: string, markdown: Text[], report: Report): void {
  const generated = generatedFiles(root);
  const byText = new Map<string, string[]>();
  for (const t of markdown) {
    if (isHistoryOrTest(t.file) || t.text.split('\n').filter((l) => l.trim()).length < 10) continue;
    // Sync writes these into every plugin that carries them, so their copies are kept the same.
    if (/^plugins\/[^/]+\/server\/data\/(user-input\.md|visual-reports\.md)$/.test(t.file))
      continue;
    byText.set(t.text, [...(byText.get(t.text) ?? []), t.file]);
  }
  for (const group of byText.values()) {
    const loose = group.filter((file) => !generated.has(file));
    // The root README, LICENSE and CHANGELOG and the plugin's copies are checked as REPO_COPY.
    const [a, b] = group;
    const pair =
      group.length === 2 &&
      a !== undefined &&
      b !== undefined &&
      [a, b].some((f) => !f.includes('/')) &&
      [a, b].some((f) => new RegExp(`^plugins/[^/]+/${escapeRegExp(basename(a))}$`).test(f));
    if (group.length < 2 || loose.length < 2 || pair) continue;
    const [first, ...rest] = loose;
    report.add(
      'COPY_DUPLICATE',
      first ?? '',
      undefined,
      `${[first, ...rest].join(' and ')} are the same text, and nothing keeps them the same.`,
      'Keep one and link to it, or generate the others in the build and list them under protected_paths.',
    );
  }
}

function checkCopy(texts: Text[], kind: Kind, report: Report): void {
  for (const t of texts) {
    if (isHistoryOrTest(t.file) || !PROSE.test(t.file)) continue;
    const isPublic = isPublicCopy(t.file, kind);
    const doc = MARKDOWN.test(t.file) ? parseMarkdown(t.file, t.text) : null;
    t.text.split('\n').forEach((line, i) => {
      if (doc?.inCode[i]) return;
      const words = doc ? prose(line) : line;
      if (isPublic && OWNER_DESCRIBED.test(words))
        report.add(
          'COPY_OWNER',
          t.file,
          i + 1,
          'Public copy describes the person behind the work.',
          'Say what the product does; anything about its maker comes from their own words.',
        );
      // A phrase in quotes is being talked about, not used.
      const weak = MARKDOWN.test(t.file)
        ? WEAK_COPY.exec(words.replace(/"[^"]*"|“[^”]*”/g, ''))
        : null;
      if (weak)
        report.add(
          'COPY_WEAK',
          t.file,
          i + 1,
          `"${weak[1]}" is a stock phrase or a hedge.`,
          'Say the specific thing it stands for, or cut it.',
        );
    });
  }
}

type Detector = {
  fact: string;
  owner: string;
  path: string;
  find: (line: string) => string | null;
};

/** Names a repo goes by in prose: its own name, and its display name with and without the brand. */
function namesOf(repo: string, prefix: string): string[] {
  const short = prefix && repo.startsWith(prefix) ? repo.slice(prefix.length) : repo;
  const title = short
    .split('-')
    .map((w) => (w.length <= 2 ? w.toUpperCase() : `${w[0]?.toUpperCase()}${w.slice(1)}`))
    .join(' ');
  const brand = current().brand;
  return [...new Set([repo, title, brand ? `${brand} ${title}` : title])].filter(
    (n) => n.length > 3,
  );
}

/** The JSON string values under runner-label keys. */
function labelsIn(value: unknown, key = ''): string[] {
  if (typeof value === 'string')
    return /^(label|light_label|labels|name|names)$/.test(key) && /^[a-z][\w]*-[\w-]+$/.test(value)
      ? [value]
      : [];
  if (Array.isArray(value)) return value.flatMap((v) => labelsIn(v, key));
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => labelsIn(v, k));
  return [];
}

/** One finder per owned fact the fleet's map lists that this checker knows how to spot. */
function detectors(root: string, fleet: Fleet, me: string, report: Report): Detector[] {
  const found: Detector[] = [];
  const unread: string[] = [];
  const source = (fact: string) => {
    const owner = fleet.owners.get(fact);
    if (!owner) return null;
    const text = owner.repo === '*' ? null : fleet.read(owner.repo, owner.path);
    if (owner.repo !== '*' && text === null) unread.push(`${fact} (no ${owner.repo} checkout)`);
    return { ...owner, text };
  };
  const runners = source('runners');
  if (runners?.text && runners.repo !== me) {
    let labels: string[] = [];
    try {
      labels = [...new Set(labelsIn(JSON.parse(runners.text)))];
    } catch {
      unread.push('runners (its file is not JSON)');
    }
    // A label is written as one: in code, in a label list or after runs-on. The same word in a
    // path or a product name is something else.
    const names = labels.map(escapeRegExp).join('|');
    const inList = labels.length ? new RegExp(`\\[[^\\]\\n]*\\b(${names})\\b[^\\[\\n]*\\]`) : null;
    const inCode = labels.length ? new RegExp(`\`(${names})\``) : null;
    const runsOn = labels.length ? new RegExp(`runs-on:\\s*(${names})\\b`) : null;
    found.push({
      fact: 'runners',
      owner: runners.repo,
      path: runners.path,
      find: (line) => {
        // The same word as a plugin or repo name isn't a label, so code needs runner words around it.
        const m =
          inList?.exec(line) ??
          runsOn?.exec(line) ??
          (/\brunners?\b|\blabels?\b|self-hosted|\blanes?\b/i.test(line)
            ? inCode?.exec(line)
            : null);
        return m ? `the runner label "${m[1]}"` : null;
      },
    });
  }
  const ports = source('ports');
  if (ports?.text && ports.repo !== me) {
    const holder = new Map<number, string>();
    for (const [repo, values] of Object.entries(readToml(ports.text)))
      for (const port of Object.values(values))
        if (typeof port === 'number') holder.set(port, repo);
    found.push({
      fact: 'ports',
      owner: ports.repo,
      path: ports.path,
      find: (line) => {
        for (const m of line.matchAll(
          /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})\b|\bports? (\d{4,5})\b/gi,
        )) {
          const port = Number(m[1] ?? m[2]);
          const of = holder.get(port);
          // A repo may say its own port: it owns its active default.
          if (of && of !== me) return `port ${port}, reserved for ${of}`;
        }
        return null;
      },
    });
  }
  // Versions of the fleet's plugins and CI actions, written out where they go stale.
  const versioned = new Map<string, { fact: string; owner: string; path: string }>();
  const pins = source('plugin-pins');
  if (pins?.text && pins.repo !== me) {
    try {
      for (const [plugin, entry] of Object.entries(
        JSON.parse(pins.text) as Record<string, { repo?: string }>,
      )) {
        const repo = entry.repo?.split('/')[1] ?? plugin;
        if (repo === me) continue;
        for (const name of [plugin, repo])
          versioned.set(name, { fact: 'plugin-pins', owner: pins.repo, path: pins.path });
      }
    } catch {
      unread.push('plugin-pins (its file is not JSON)');
    }
  }
  const actions = source('ci-actions');
  if (actions && actions.repo !== me && actions.repo !== '*')
    versioned.set(actions.repo, { fact: 'ci-actions', owner: actions.repo, path: actions.path });
  const prefix = current().prefix;
  for (const [repo, where] of versioned) {
    const names = namesOf(repo, prefix).map(escapeRegExp).join('|');
    const re = new RegExp(`(?<![\\w-])(${names})(?:@| v| version |#v| )v?(\\d+\\.\\d+\\.\\d+)\\b`);
    found.push({
      ...where,
      find: (line) => {
        const m = re.exec(line);
        return m ? `${m[1]} ${m[2]}` : null;
      },
    });
  }
  // Each repo owns its own merge gate; its docs point to the settings file instead of listing it.
  const gate = fleet.owners.get('merge-gate');
  const settings = join(root, gate?.path ?? SOLO_FILE);
  if (gate?.repo === '*' && existsSync(settings)) {
    const value = readToml(readFileSync(settings, 'utf8'))['']?.required_checks;
    const checks = Array.isArray(value) ? value : [];
    const names = new RegExp(`\`(${checks.map(escapeRegExp).join('|')})\``, 'g');
    found.push({
      fact: 'merge-gate',
      owner: me,
      path: gate.path,
      find: (line) => {
        if (!checks.length || !/merge gate|required[ _]checks?/i.test(line)) return null;
        // Listing the gate's checks copies it; naming one in a rule about the gate doesn't.
        const listed = [...new Set([...line.matchAll(names)].map((m) => m[1]))];
        return listed.length >= 2
          ? `the required checks ${listed.map((c) => `\`${c}\``).join(', ')}`
          : null;
      },
    });
  }
  if (unread.length) report.notes.push(`Owned facts not checked: ${unread.join(', ')}.`);
  return found;
}

/** Facts another file owns, written out in this repo's docs where they drift from the source. */
function checkOwnedFacts(
  root: string,
  markdown: Text[],
  fleet: Fleet | null,
  report: Report,
): void {
  if (current().workflow !== 'solo') return;
  if (!fleet) {
    report.notes.push(
      "Owned facts and the repo index not checked: the fleet's data checkout isn't beside this repo (set SIDECUT_HOME to it).",
    );
    return;
  }
  const me = repoName(root);
  const finders = detectors(root, fleet, me, report);
  for (const t of markdown) {
    if (isHistoryOrTest(t.file)) continue;
    t.text.split('\n').forEach((line, i) => {
      for (const d of finders) {
        if (d.owner === me && t.file === d.path) continue;
        const what = d.find(line);
        if (!what) continue;
        const where = d.owner === me ? d.path : `${d.path} in ${d.owner}`;
        report.add(
          d.fact === 'ports' ? 'OWNED_PORT' : 'OWNED_FACT',
          t.file,
          i + 1,
          `Writes out ${what}, which ${where} owns, so this copy goes stale when it changes.`,
          `Point to ${where} instead of repeating the value.`,
        );
      }
    });
  }
}

/** External links that no longer answer. Uses the network, so it runs on a schedule, not per PR. */
export async function checkExternalLinks(root: string, report: Report): Promise<void> {
  const seen = new Map<string, { file: string; line: number }>();
  for (const file of repoFiles(root).filter((f) => MARKDOWN.test(f) && !isHistoryOrTest(f))) {
    const text = read(root, file);
    if (text === null) continue;
    const doc = parseMarkdown(file, text);
    doc.lines.forEach((line, i) => {
      if (doc.inCode[i]) return;
      for (const m of prose(line).matchAll(/\]\((https?:\/\/[^)\s]+)\)|<(https?:\/\/[^>\s]+)>/g)) {
        const url = (m[1] ?? m[2] ?? '').replace(/#.*$/, '');
        if (!/\/\/(localhost|127\.|0\.0\.0\.0)/.test(url) && !seen.has(url))
          seen.set(url, { file, line: i + 1 });
      }
    });
  }
  const queue = [...seen];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [url, at] = next;
      let status = 0;
      for (const method of ['HEAD', 'GET']) {
        try {
          const res = await fetch(url, {
            method,
            redirect: 'follow',
            signal: AbortSignal.timeout(15_000),
          });
          status = res.status;
          if (res.ok || ![403, 405, 501].includes(res.status)) break;
        } catch {
          status = 0;
        }
      }
      if (status === 0 || status === 404 || status === 410 || status >= 500)
        report.add(
          'LINK_EXTERNAL',
          at.file,
          at.line,
          `${url} ${status ? `answers ${status}` : "doesn't answer"}.`,
          'Point it at the current page, or remove it.',
        );
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
}
