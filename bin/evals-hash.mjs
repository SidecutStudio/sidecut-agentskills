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
  const problems = [];
  for (const copy of copies) {
    const path = String(copy?.path ?? "");
    const dir = join(root, path);
    const inside = path !== "" && !isAbsolute(path) && !relative(root, dir).startsWith("..");
    let hash = null;
    try {
      if (inside && existsSync(dir) && statSync(dir).isDirectory()) hash = treeHash(dir);
    } catch (error) {
      problems.push({
        file: path,
        message: `${path} can't be hashed: ${error instanceof Error ? error.message : String(error)}`
      });
      continue;
    }
    if (hash === null || hash !== copy.hash)
      problems.push({
        file: path || STAMP_FILE,
        message: `${path || "A copy"} doesn't match the hash in ${STAMP_FILE}.`
      });
  }
  return problems;
}
export {
  STAMP_FILE,
  stampProblems,
  treeFiles,
  treeHash
};
