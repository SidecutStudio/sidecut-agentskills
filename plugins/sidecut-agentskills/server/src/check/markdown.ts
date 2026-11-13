import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { type Report, sentences } from './report.ts';

export type Heading = { level: number; text: string; line: number };

export type MarkdownDoc = {
  path: string;
  lines: string[];
  /** Frontmatter lines without the `---` fences, or null when the file has none. */
  frontmatter: string[] | null;
  headings: Heading[];
  /** True for each line that sits inside frontmatter or a code fence. */
  inCode: boolean[];
};

const FENCE_TAGS = new Set(['bash', 'ts', 'js', 'json', 'yaml', 'toml', 'text', 'markdown']);
const BANNED = [
  'ultimate',
  'comprehensive',
  'seamless',
  'robust',
  'leverage',
  'utilize',
  'simply',
  'just',
  'please',
  'expert',
  'powerful',
  'effortless',
];
const SHOUTING = ['IMPORTANT', 'MUST', 'NEVER', 'ALWAYS', 'CRITICAL', 'MANDATORY'];
const PROPER_NOUNS = new Set([
  'Agent',
  'Agentskills',
  'Biome',
  'Bun',
  'Claude',
  'Code',
  'Codex',
  'GitHub',
  'Node',
  'Plugins',
  'Sidecut',
  'Solo',
  'Studio',
  'Workflow',
]);
const ALLOWED_HTML = /^<!-- (solo-workflow|sidecut):(start|end)( [\w-]+)? -->$/;

export function parseMarkdown(path: string, text: string): MarkdownDoc {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const inCode = lines.map(() => false);
  let frontmatter: string[] | null = null;
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      frontmatter = lines.slice(1, end);
      for (let i = 0; i <= end; i++) inCode[i] = true;
      start = end + 1;
    }
  }
  const headings: Heading[] = [];
  let fence = false;
  let solo = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i] ?? '';
    // Solo Workflow owns the text between its markers and rewrites it on setup.
    if (line === '<!-- solo-workflow:start -->') solo = true;
    if (solo) {
      inCode[i] = true;
      if (line === '<!-- solo-workflow:end -->') solo = false;
      continue;
    }
    // A sidecut-sync marker; the block's own text is checked like any other.
    if (!fence && /^<!-- sidecut:(start|end) [\w-]+ -->$/.test(line)) {
      inCode[i] = true;
      continue;
    }
    if (/^\s*```/.test(line)) {
      inCode[i] = true;
      fence = !fence;
      continue;
    }
    if (fence) {
      inCode[i] = true;
      continue;
    }
    const match = /^(#{1,6}) (.*)$/.exec(line);
    if (match) headings.push({ level: match[1]?.length ?? 0, text: match[2] ?? '', line: i + 1 });
  }
  return { path, lines, frontmatter, headings, inCode };
}

/** The line with inline code removed, for checks on prose only. */
export function prose(line: string): string {
  return line.replace(/`[^`]*`/g, '``');
}

function isStructural(line: string): boolean {
  return /^\s*$|^#{1,6} |^\s*(- |\d+\. )|^\|/.test(line) || ALLOWED_HTML.test(line);
}

/** Paragraph blocks outside code: consecutive prose lines. */
export function paragraphs(doc: MarkdownDoc): { line: number; text: string[] }[] {
  const blocks: { line: number; text: string[] }[] = [];
  let current: { line: number; text: string[] } | null = null;
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i] || isStructural(line)) {
      current = null;
      return;
    }
    if (current) current.text.push(line);
    else {
      current = { line: i + 1, text: [line] };
      blocks.push(current);
    }
  });
  return blocks;
}

function checkHeadings(doc: MarkdownDoc, file: string, report: Report, skipH1Case: boolean): void {
  const h1s = doc.headings.filter((h) => h.level === 1);
  if (h1s.length !== 1) {
    report.add(
      'MD_ONE_H1',
      file,
      h1s[1]?.line,
      `Has ${h1s.length} H1 headings.`,
      'Keep exactly one `#` heading.',
    );
  }
  const firstText = doc.lines.findIndex((line, i) => !doc.inCode[i] && line.trim() !== '');
  if (firstText >= 0 && !doc.lines[firstText]?.startsWith('# ')) {
    report.add(
      'MD_FIRST_H1',
      file,
      firstText + 1,
      'The file does not open with its H1.',
      'Start with `# <Title>`.',
    );
  }
  let previous = 0;
  for (const h of doc.headings) {
    if (previous && h.level > previous + 1) {
      report.add(
        'MD_HEADING_LEVEL',
        file,
        h.line,
        `Jumps from H${previous} to H${h.level}.`,
        'Use the next level down.',
      );
    }
    previous = h.level;
    const text = prose(h.text);
    if (/[.:!?;,]$/.test(text)) {
      report.add(
        'MD_HEADING_PUNCT',
        file,
        h.line,
        'Heading ends with punctuation.',
        'Remove the closing punctuation.',
      );
    }
    if (h.level === 1 && skipH1Case) continue;
    const words = text.replace(/\[[^\]]*\]\([^)]*\)/g, '').match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
    const capitalized = words.slice(1).find((w) => /^[A-Z][a-z]/.test(w) && !PROPER_NOUNS.has(w));
    if (capitalized) {
      report.add(
        'MD_HEADING_CASE',
        file,
        h.line,
        `Heading isn't sentence case ("${capitalized}").`,
        'Capitalize only the first word, names and acronyms.',
      );
    }
  }
}

function checkTables(doc: MarkdownDoc, file: string, report: Report): void {
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i] || !line.startsWith('|')) return;
    if (!line.endsWith('|')) {
      report.add(
        'MD_TABLE_PIPES',
        file,
        i + 1,
        'Table row has no trailing pipe.',
        'End every table row with `|`.',
      );
    }
    const cells = prose(line).slice(1, -1).split('|');
    if (cells.every((c) => /^\s*:?-+:?\s*$/.test(c))) {
      if (!cells.every((c) => c === ' --- ')) {
        report.add(
          'MD_TABLE_SEPARATOR',
          file,
          i + 1,
          'Separator row is not `| --- |` cells.',
          'Use `---` in every separator cell.',
        );
      }
    } else if (cells.some((c) => / {2,}$|^ {2,}/.test(c))) {
      report.add(
        'MD_TABLE_PADDING',
        file,
        i + 1,
        'Table cells are padded.',
        'Use one space on each side of a cell.',
      );
    }
  });
}

function checkFences(doc: MarkdownDoc, file: string, report: Report): void {
  let open: string | null = null;
  doc.lines.forEach((line, i) => {
    const match = /^\s*```(.*)$/.exec(line);
    if (match) {
      if (open === null) {
        open = match[1]?.trim() ?? '';
        if (!FENCE_TAGS.has(open)) {
          report.add(
            'MD_FENCE_TAG',
            file,
            i + 1,
            `Code fence tag "${open}" isn't allowed.`,
            `Use one of: ${[...FENCE_TAGS].join(', ')}.`,
          );
        }
      } else open = null;
      return;
    }
    if (open === 'bash' && /^\s*\$ /.test(line)) {
      report.add(
        'MD_SHELL_PROMPT',
        file,
        i + 1,
        'Shell block line starts with `$`.',
        'Drop the prompt.',
      );
    }
  });
}

function checkLinks(doc: MarkdownDoc, file: string, root: string, report: Report): void {
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    const text = prose(line);
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1] ?? '';
      if (target.startsWith('./')) {
        report.add(
          'MD_LINK_DOT',
          file,
          i + 1,
          `Link "${target}" starts with ./.`,
          'Drop the leading `./`.',
        );
      }
      if (/^[a-z]+:/.test(target) || target.startsWith('#')) continue;
      const path = join(dirname(doc.path), target.split('#')[0] ?? '');
      if (!existsSync(path)) {
        report.add(
          'MD_LINK_TARGET',
          file,
          i + 1,
          `Link target "${target}" doesn't exist.`,
          'Point the link at a real file.',
        );
      }
      if (relative(root, path).startsWith('..')) {
        report.add(
          'MD_LINK_OUTSIDE',
          file,
          i + 1,
          `Link "${target}" leaves the repo.`,
          'Link to a file inside the repo.',
        );
      }
    }
    const withoutLinks = text.replace(/\]\([^)]*\)/g, ']');
    if (/https?:\/\//.test(withoutLinks)) {
      report.add(
        'MD_BARE_URL',
        file,
        i + 1,
        'Line has a bare URL.',
        'Wrap it as `[text](url)` or put it in inline code.',
      );
    }
  });
}

function checkLists(doc: MarkdownDoc, file: string, report: Report): void {
  let expected = new Map<number, number>();
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    if (/^\s*[*+] \S/.test(line)) {
      report.add('MD_LIST_BULLET', file, i + 1, 'Bullet uses `*` or `+`.', 'Use `-` for bullets.');
    }
    const numbered = /^(\s*)(\d+)\. /.exec(line);
    if (numbered) {
      const indent = numbered[1]?.length ?? 0;
      const number = Number(numbered[2]);
      const want = expected.get(indent) ?? 1;
      if (number !== want) {
        report.add(
          'MD_LIST_NUMBER',
          file,
          i + 1,
          `List item is ${number}, expected ${want}.`,
          'Number items 1, 2, 3 in order.',
        );
      }
      expected.set(indent, number + 1);
    } else if (line.trim() === '' || /^#/.test(line)) {
      expected = new Map();
    }
  });
}

function checkInline(doc: MarkdownDoc, file: string, report: Report, allowDates: boolean): void {
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i] || ALLOWED_HTML.test(line)) return;
    const text = prose(line);
    const n = i + 1;
    if (/^\s*>/.test(line))
      report.add('MD_BLOCKQUOTE', file, n, 'Blockquote.', 'Write it as a plain paragraph.');
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      report.add(
        'MD_RULE',
        file,
        n,
        'Horizontal rule or setext underline.',
        'Remove it; use a heading for a new section.',
      );
    }
    if (/^=+$/.test(line.trim()))
      report.add('MD_HEADING_ATX', file, n, 'Setext heading.', 'Use `#` headings.');
    if (/<\/?[a-zA-Z][^>]*>|<!--/.test(text) && !ALLOWED_HTML.test(line)) {
      report.add(
        'MD_HTML',
        file,
        n,
        'HTML in Markdown.',
        'Use Markdown, or put the text in inline code.',
      );
    }
    if (/\p{Extended_Pictographic}/u.test(text))
      report.add('MD_EMOJI', file, n, 'Emoji.', 'Remove it.');
    if (/[–—]/.test(text)) {
      report.add('MD_DASH', file, n, 'Em or en dash.', 'Use a colon, comma or parentheses.');
    }
    if (/[←-⇿]|->|=>/.test(text))
      report.add('MD_ARROW', file, n, 'Arrow in prose.', 'Write "then".');
    if (/[‘’“”]/.test(text)) {
      report.add('MD_QUOTES', file, n, 'Curly quote or apostrophe.', 'Use straight quotes.');
    }
    const afterLead = text.replace(/^\s*(- |\d+\. )\*\*[^*]+:\*\* /, '$1');
    if (afterLead.includes('**')) {
      report.add(
        'MD_BOLD',
        file,
        n,
        'Bold outside a bullet lead term.',
        'Use bold only as `- **Term:** text`.',
      );
    }
    if (/(^|[^*\w])\*[^*\s][^*]*\*(?!\*)|(^|[^\w])_[^_\s][^_]*_(?!\w)/.test(afterLead)) {
      report.add('MD_ITALIC', file, n, 'Italic text.', 'Remove the italics.');
    }
    for (const word of BANNED) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
        report.add('WORD_BANNED', file, n, `Uses "${word}".`, 'Say it plainly without that word.');
      }
    }
    for (const word of SHOUTING) {
      if (new RegExp(`\\b${word}\\b`).test(text)) {
        report.add(
          'WORD_SHOUTING',
          file,
          n,
          `"${word}" in capitals.`,
          'Write the instruction plainly in normal case.',
        );
      }
    }
    if (!allowDates && /\b20\d\d-\d\d-\d\d\b/.test(text)) {
      report.add(
        'WORD_DATE',
        file,
        n,
        'Date outside the CHANGELOG.',
        'Remove the date; Git and the CHANGELOG keep it.',
      );
    }
    if (/\bTODO\b/.test(text))
      report.add('WORD_TODO', file, n, 'Unfinished TODO.', 'Replace it with the real text.');
  });
}

function checkParagraphs(doc: MarkdownDoc, file: string, report: Report): void {
  for (const block of paragraphs(doc)) {
    if (block.text.length > 1) {
      report.add(
        'MD_HARD_WRAP',
        file,
        block.line + 1,
        'Paragraph is wrapped over several lines.',
        'Put the paragraph on one line.',
      );
    }
    const count = sentences(block.text.map(prose).join(' ')).length;
    if (count > 4) {
      report.add(
        'MD_PARAGRAPH_LENGTH',
        file,
        block.line,
        `Paragraph has ${count} sentences.`,
        'Keep paragraphs to at most 4 sentences.',
      );
    }
  }
  doc.lines.forEach((line, i) => {
    if (!doc.inCode[i] && /^\s+\S/.test(line) && !/^\s+(- |\d+\. )/.test(line)) {
      report.add(
        'MD_HARD_WRAP',
        file,
        i + 1,
        'Indented continuation line.',
        'Put each list item on one line.',
      );
    }
  });
}

export type MarkdownOptions = { skipH1Case?: boolean; allowDates?: boolean };

/** The Markdown and wording rules every file follows. */
export function checkMarkdown(
  doc: MarkdownDoc,
  text: string,
  root: string,
  report: Report,
  options: MarkdownOptions = {},
): void {
  const file = relative(root, doc.path);
  if (!text.endsWith('\n') || text.endsWith('\n\n')) {
    report.add(
      'MD_END_NEWLINE',
      file,
      undefined,
      'File does not end with exactly one newline.',
      'End the file with one newline.',
    );
  }
  checkHeadings(doc, file, report, options.skipH1Case ?? false);
  checkTables(doc, file, report);
  checkFences(doc, file, report);
  checkLinks(doc, file, root, report);
  checkLists(doc, file, report);
  checkInline(doc, file, report, options.allowDates ?? false);
  checkParagraphs(doc, file, report);
}

/** H2 headings in order. */
export function sections(doc: MarkdownDoc): Heading[] {
  return doc.headings.filter((h) => h.level === 2);
}

/** Rows of the first table after a heading, as arrays of trimmed cells; the header row first. */
export function tableAfter(doc: MarkdownDoc, heading: Heading): string[][] {
  const rows: string[][] = [];
  for (let i = heading.line; i < doc.lines.length; i++) {
    const line = doc.lines[i] ?? '';
    if (/^#{1,6} /.test(line)) break;
    if (!line.startsWith('|')) {
      if (rows.length > 0) break;
      continue;
    }
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
  }
  return rows;
}

/** The first paragraph after a heading. */
export function paragraphAfter(
  doc: MarkdownDoc,
  line: number,
): { line: number; text: string } | null {
  for (let i = line; i < doc.lines.length; i++) {
    const text = doc.lines[i] ?? '';
    if (text.trim() === '') continue;
    if (doc.inCode[i] || isStructural(text)) return null;
    return { line: i + 1, text };
  }
  return null;
}
