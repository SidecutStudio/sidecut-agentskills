// SCAN_TEXT: shipped text that can make Claude's plugin scan mark a plugin Caution. The scan reads a
// plugin's text files, not its MCP server, and a plugin whose files stopped naming credentials, CI
// secrets, self-hosted runners and download-and-run installs lost its Caution. This is advice, so
// it never fails a check.
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { listFiles } from '../scaffold.ts';
import { readScanTextAllow } from '../settings.ts';
import { type Report, relativePosix } from './report.ts';

type Pattern = { what: string; re: RegExp; pinned?: (match: RegExpExecArray) => boolean };

/** What the scan may read as risky, case-insensitive. */
export const SCAN_PATTERNS: Pattern[] = [
  {
    what: 'a download-and-run install',
    re: /\b(?:curl|wget)\b[^\n]*\|\s*(?:ba)?sh\b|\bcurl\s+-fsSL\b|\binstall\.sh\b/gi,
  },
  {
    what: 'an unpinned package launcher',
    re: /\b(?:npx|bunx|uvx)\s+((?:-{1,2}[\w-]+\s+)*)([^\s`'"),]+)/gi,
    // A pinned version, a local path, or a flag that only runs what's already installed.
    pinned: (m) =>
      /@\d/.test(m[2] ?? '') ||
      /^[./]/.test(m[2] ?? '') ||
      /(?:^|\s)--?(?:no-install|no|offline)\b/.test(m[1] ?? ''),
  },
  { what: 'a CI secret', re: /\bsecrets\.[A-Za-z_]/gi },
  {
    what: 'a token name',
    re: /\b(?:GITHUB_TOKEN|GH_TOKEN|NPM_TOKEN|[A-Z0-9_]*API_KEY)\b|\bgh auth\b/gi,
  },
  { what: 'an SSH key folder', re: /~\/\.ssh\b|\.ssh\//gi },
  { what: 'the keychain', re: /\bkeychain\b/gi },
  { what: 'self-hosted runners', re: /\bself-hosted\b/gi },
];

const BINARY = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|zip|gz|wasm)$/i;

/** Whether `path`, relative to the plugin folder, is a text file the scan reads. */
export function scannedFile(path: string): boolean {
  if (BINARY.test(path)) return false;
  if (path === 'server/index.mjs' || path.startsWith('server/src/')) return false;
  return !path.endsWith('THIRD_PARTY_LICENSES.txt');
}

/** A glob with `*` (within a folder) and `**` (any depth), matched against the whole path. */
export function globMatch(glob: string, path: string): boolean {
  const re = glob
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*');
  return new RegExp(`^${re}$`).test(path);
}

/** Every scanned hit in `text`: line number and what it names. */
export function scanText(text: string): { line: number; what: string }[] {
  const hits: { line: number; what: string }[] = [];
  text.split('\n').forEach((line, i) => {
    for (const p of SCAN_PATTERNS) {
      p.re.lastIndex = 0;
      for (const m of line.matchAll(p.re)) {
        if (p.pinned?.(m as RegExpExecArray)) continue;
        hits.push({ line: i + 1, what: p.what });
      }
    }
  });
  return hits;
}

/** Adds one SCAN_TEXT advisory per shipped file that names any of SCAN_PATTERNS. */
export function checkScanText(pluginDir: string, root: string, report: Report): void {
  const allow = readScanTextAllow(root);
  for (const path of listFiles(pluginDir)) {
    const inPlugin = relativePosix(pluginDir, path);
    if (!scannedFile(inPlugin) || allow.some((g) => globMatch(g, inPlugin))) continue;
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    const hits = scanText(text);
    const first = hits[0];
    if (!first) continue;
    const kinds = [...new Set(hits.map((h) => h.what))].join(', ');
    report.add(
      'SCAN_TEXT',
      relative(root, path),
      first.line,
      `${hits.length} ${hits.length === 1 ? 'line names' : 'places name'} ${kinds}. Claude's plugin scan may mark a plugin Caution when its shipped text names credentials, CI secrets, self-hosted runners or download-and-run installs.`,
      `Keep that text out of shipped files, or list the file under \`scanTextAllow\` in .agentskills.json and say plainly in the README what the plugin does with it.`,
    );
  }
}
