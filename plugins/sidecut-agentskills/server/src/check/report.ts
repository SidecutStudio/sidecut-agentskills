export type Problem = {
  code: string;
  file: string;
  line?: number;
  message: string;
  fix: string;
};

export class Report {
  problems: Problem[] = [];
  /** Problems the repo lists under `sidecut.keep` in package.json, each with the reason given. */
  readonly kept: (Problem & { reason: string })[] = [];
  /** What was checked, for example the whole repo or only its plugins, and why. */
  scope = '';

  /**
   * Moves the problems `keep` covers into `kept`. A key covers a problem when it is the problem's
   * code, its file, a folder holding the file, or "CODE file". A key that covers nothing is itself a
   * problem, so a difference that was fixed doesn't stay listed.
   */
  applyKeep(keep: Record<string, string>): void {
    const covers = (key: string, p: Problem) =>
      key === p.code ||
      key === p.file ||
      p.file.startsWith(`${key}/`) ||
      key === `${p.code} ${p.file}`;
    for (const [key, reason] of Object.entries(keep)) {
      const hit = this.problems.filter((p) => covers(key, p));
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
    }
  }

  add(code: string, file: string, line: number | undefined, message: string, fix: string): void {
    this.problems.push({ code, file, line, message, fix });
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
