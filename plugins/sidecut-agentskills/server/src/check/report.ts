import { relative, sep } from 'node:path';

/** A path with the platform separator turned into `/`, the form every reported and compared repo path takes. */
export function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/');
}

/** `path` relative to `from`, with `/` separators on every platform. */
export function relativePosix(from: string, path: string): string {
  return toPosix(relative(from, path));
}

export type Problem = {
  code: string;
  file: string;
  line?: number;
  message: string;
  fix: string;
};

/** A change `sidecut-sync --fix` can make for a problem: the file's new text from its current text. */
export type AutoFix = { what: string; apply: (text: string) => string };

/**
 * Heuristic rules: they can't tell intent, so they advise and never fail a check. CI shows them on
 * changed lines only. A rule moves to blocking in a later checker version once the fleet shows none.
 */
export const ADVISORY_CODES = [
  'SKILL_LENGTH',
  'REF_LENGTH',
  'SKILL_DESCRIPTION_LENGTH',
  'SCAN_TEXT',
  'SKILL_LONG_STEP',
  'SKILL_REPEATED_TEXT',
  'DEAD_ORPHAN',
  'BLOAT_LINES',
  'BLOAT_SMALL_REF',
  'COPY_WEAK',
];

/** Whether a sidecut.keep key covers a problem: its code, its file, a folder holding it, or "CODE file". */
export function keepCovers(key: string, code: string, file: string): boolean {
  return key === code || key === file || file.startsWith(`${key}/`) || key === `${code} ${file}`;
}

export class Report {
  problems: Problem[] = [];
  readonly advisories: Problem[] = [];
  /** Problems the repo lists under `sidecut.keep` in package.json, each with the reason given. */
  readonly kept: (Problem & { reason: string })[] = [];
  /** What was checked, for example the whole repo or only its plugins, and why. */
  scope = '';
  /** Checks that couldn't run here, and why, so a pass never hides them. */
  readonly notes: string[] = [];
  /** What `sidecut-sync --fix` can change, keyed to the problem it fixes. */
  readonly fixes: (AutoFix & { code: string; file: string })[] = [];

  /**
   * Moves the problems `keep` covers into `kept`. A key covers a problem when it is the problem's
   * code, its file, a folder holding the file, or "CODE file". A key that covers nothing is itself a
   * problem, so a difference that was fixed doesn't stay listed.
   */
  applyKeep(keep: Record<string, string>): void {
    for (const [key, reason] of Object.entries(keep)) {
      const hit = this.problems.filter((p) => keepCovers(key, p.code, p.file));
      if (!String(reason).trim())
        this.add(
          'KEEP_REASON',
          'package.json',
          undefined,
          `"${key}" has no reason.`,
          'Say why it differs.',
        );
      else if (hit.length === 0)
        this.add(
          'KEEP_UNUSED',
          'package.json',
          undefined,
          `sidecut.keep lists "${key}", which no longer differs.`,
          'Remove it.',
        );
      for (const p of hit) this.kept.push({ ...p, reason: String(reason) });
      this.problems = this.problems.filter((p) => !hit.includes(p));
      for (let i = this.fixes.length - 1; i >= 0; i--) {
        const f = this.fixes[i];
        if (f && keepCovers(key, f.code, f.file)) this.fixes.splice(i, 1);
      }
    }
  }

  add(
    code: string,
    file: string,
    line: number | undefined,
    message: string,
    fix: string,
    autoFix?: AutoFix,
  ): void {
    const target = ADVISORY_CODES.includes(code) ? this.advisories : this.problems;
    target.push({ code, file: toPosix(file), line, message, fix });
    if (autoFix) this.fixes.push({ ...autoFix, code, file: toPosix(file) });
  }

  format(): string {
    return this.problems
      .map((p) => `${p.code} ${p.file}${p.line ? `:${p.line}` : ''} ${p.message} Fix: ${p.fix}`)
      .join('\n');
  }
}

/** Splits text into sentences on a full stop, question mark or exclamation mark followed by a space or the end. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
