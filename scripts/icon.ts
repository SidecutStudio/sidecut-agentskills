#!/usr/bin/env bun
// Draws a plugin's icon in the Sidecut style: a near-black rounded tile, one white Lucide mark and
// Sidecut Builder's orange full stop. `sidecut-icon <lucide-name>` writes the 512 px PNG to
// plugins/<package name>/assets/icon.png; `--out <file>` writes it somewhere else.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

export const TILE = '#0a0a0a';
export const ORANGE = '#ff6b00';

/** The SVG of the icon for one Lucide mark, on a 40 by 40 grid like Sidecut Builder's favicon. */
export function iconSvg(lucideSvg: string): string {
  const shapes = [
    ...lucideSvg.matchAll(/<(path|rect|circle|line|polyline|polygon|ellipse)\b[^>]*\/>/g),
  ]
    .map((m) => m[0])
    .join('');
  // The mark sits left of centre so the dot reads as its full stop, as in Builder's "s.".
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="${TILE}"/><g transform="translate(7.4 8.2) scale(0.98)" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${shapes}</g><circle cx="31.5" cy="30.5" r="2.6" fill="${ORANGE}"/></svg>`;
}

/** The 512 by 512 PNG of an icon SVG. */
export function iconPng(svg: string): Buffer {
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: 512 } }).render().asPng());
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const name = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
  const outFlag = args.indexOf('--out');
  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    console.error('Usage: sidecut-icon <lucide-icon-name> [--out <file>]');
    process.exit(1);
  }
  const lucide = join(
    dirname(createRequire(import.meta.url).resolve('lucide-static/package.json')),
    'icons',
    `${name}.svg`,
  );
  if (!existsSync(lucide)) {
    console.error(`No Lucide icon is named ${name}. Pick one from https://lucide.dev/icons.`);
    process.exit(1);
  }
  const id = JSON.parse(readFileSync('package.json', 'utf8')).name as string;
  const out = outFlag >= 0 ? (args[outFlag + 1] ?? '') : join('plugins', id, 'assets', 'icon.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, iconPng(iconSvg(readFileSync(lucide, 'utf8'))));
  console.log(`Wrote ${out}.`);
}
