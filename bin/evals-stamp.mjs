#!/usr/bin/env node

// scripts/evals-stamp.ts
import { resolve } from "node:path";
import { parseArgs } from "node:util";

// plugins/sidecut-agentskills/server/src/check/evals-stamp.ts
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
var STAMP_FILE = "evals-source.json";
function treeFiles(dir) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const walk = (d) => {
    const real = realpathSync(d);
    if (seen.has(real)) throw new Error(`${relative(dir, d) || "."} links back into the copy.`);
    seen.add(real);
    for (const name of readdirSync(d)) {
      if (name === ".DS_Store") continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join("/"));
    }
    seen.delete(real);
  };
  walk(dir);
  return out.sort();
}
function treeHash(dir, files = treeFiles(dir)) {
  const h = createHash("sha256");
  for (const f of files) {
    const body = createHash("sha256").update(readFileSync(join(dir, f))).digest("hex");
    h.update(`${f}
${body}
`);
  }
  return `sha256-${h.digest("hex")}`;
}
function stampProblems(root) {
  const file = join(root, STAMP_FILE);
  if (!existsSync(file)) return [];
  let copies;
  try {
    copies = JSON.parse(readFileSync(file, "utf8")).copies;
  } catch {
    copies = void 0;
  }
  if (!Array.isArray(copies) || copies.length === 0)
    return [{ file: STAMP_FILE, message: `${STAMP_FILE} has no copies list.` }];
  const problems2 = [];
  for (const copy of copies) {
    const path = String(copy?.path ?? "");
    const dir = join(root, path);
    const inside = path !== "" && !isAbsolute(path) && !relative(root, dir).startsWith("..");
    let hash = null;
    try {
      if (inside && existsSync(dir) && statSync(dir).isDirectory()) hash = treeHash(dir);
    } catch (error) {
      problems2.push({
        file: path,
        message: `${path} can't be hashed: ${error instanceof Error ? error.message : String(error)}`
      });
      continue;
    }
    if (hash === null || hash !== copy.hash)
      problems2.push({
        file: path || STAMP_FILE,
        message: `${path || "A copy"} doesn't match the hash in ${STAMP_FILE}.`
      });
  }
  return problems2;
}

// scripts/evals-stamp.ts
var usage = `Usage: sidecut-evals-stamp [<repo>]

Checks that every folder ${STAMP_FILE} lists still matches the hash sidecut-evals stamped on it.
sidecut-check runs the same check; this is for repos that don't run sidecut-check. Passes when the
repo has no ${STAMP_FILE}. Exits 1 when a copy was edited here instead of at its source.`;
var { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { help: { type: "boolean" } }
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
var problems = stampProblems(resolve(positionals[0] ?? "."));
if (problems.length === 0) {
  console.log("Every copied evals folder matches its stamp.");
  process.exit(0);
}
for (const problem of problems) console.error(problem.message);
console.error(
  "\nEdit the evals at their source and sync again, or delete evals-source.json to own them here."
);
process.exit(1);
