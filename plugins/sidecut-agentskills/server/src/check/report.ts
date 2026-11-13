export type Problem = {
  code: string;
  file: string;
  line?: number;
  message: string;
  fix: string;
};

export class Report {
  readonly problems: Problem[] = [];

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
