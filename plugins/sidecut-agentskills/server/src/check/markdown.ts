import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { SOLO_END, SOLO_START } from '../sidecut-profile.ts';
import type { Report } from './report.ts';

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

const ALLOWED_HTML = /^<!-- sidecut:(start|end)( [\w-]+)? -->$/;
const allowedHtml = (line: string) =>
  ALLOWED_HTML.test(line) || line === SOLO_START || line === SOLO_END;

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
    // The sidecut profile's workflow owns the text between its markers and rewrites it on setup.
    if (line === SOLO_START) solo = true;
    if (solo) {
      inCode[i] = true;
      if (line === SOLO_END) solo = false;
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
  return /^\s*$|^#{1,6} |^\s*(- |\d+\. )|^\|/.test(line) || allowedHtml(line);
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

function checkLinks(doc: MarkdownDoc, file: string, root: string, report: Report): void {
  doc.lines.forEach((line, i) => {
    if (doc.inCode[i]) return;
    const text = prose(line);
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1] ?? '';
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
  });
}

export type MarkdownOptions = { skipH1Case?: boolean; allowDates?: boolean };

/** Check packaged links and incomplete templates, not editorial preferences. */
export function checkMarkdown(
  doc: MarkdownDoc,
  _text: string,
  root: string,
  report: Report,
  _options: MarkdownOptions = {},
): void {
  const file = relative(root, doc.path);
  checkLinks(doc, file, root, report);
  doc.lines.forEach((line, i) => {
    if (!doc.inCode[i] && /\bTODO\b/.test(prose(line))) {
      report.add(
        'WORD_TODO',
        file,
        i + 1,
        'Unfinished template text.',
        'Complete the instruction or remove it.',
      );
    }
  });
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
