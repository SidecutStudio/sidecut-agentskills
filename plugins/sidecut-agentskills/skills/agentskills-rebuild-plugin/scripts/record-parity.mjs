#!/usr/bin/env node
// Records a plugin's tools, skills, hard rules and hooks as JSON, so a rebuild can be compared
// with the plugin before it. Run it on the old and the new version with the same inputs.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const USAGE = `usage: node record-parity.mjs <plugin folder> <out.json> [--call 'tool={"arg":1}']... [--env NAME=value]...

Starts the plugin's bundled server (server/index.mjs) over stdio, records tools/list and one
tools/call for each read-only tool (with {} unless --call gives its arguments; repeat --call to
call a tool more than once), then each skill's description, allowed-tools and hard-rule lines,
and both hooks files. Pass the same --call and --env values for the old and new version.`;

const RULE = /\b(never|always|only when|only with|don't|do not|must|ask before|nothing runs)\b/i;
const VOLATILE = /"(time|now|timestamp|checkedAt|generatedAt|startedAt|finishedAt)":"[^"]*"/g;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}
const positional = [];
const calls = new Map();
const env = { PATH: process.env.PATH ?? '', SIDECUT_SKILL_LOG: '0' };
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--call' || arg === '--env') {
    const value = argv[++i] ?? '';
    const at = value.indexOf('=');
    if (at < 1) fail(`${arg} needs NAME=value, got "${value}".`);
    const name = value.slice(0, at);
    const rest = value.slice(at + 1);
    if (arg === '--env') env[name] = rest;
    else {
      let args;
      try {
        args = JSON.parse(rest);
      } catch {
        fail(`--call ${name}: the arguments aren't JSON.`);
      }
      calls.set(name, [...(calls.get(name) ?? []), args]);
    }
  } else positional.push(arg);
}
const [dirArg, out] = positional;
if (!dirArg || !out) fail(USAGE);
const dir = resolve(dirArg);
if (!existsSync(join(dir, '.claude-plugin', 'plugin.json')))
  fail(`${dir} isn't a plugin folder: it has no .claude-plugin/plugin.json.`);
const bundle = join(dir, 'server', 'index.mjs');

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

async function recordServer() {
  if (!existsSync(bundle)) return null;
  const child = spawn('node', [bundle], { env, stdio: ['pipe', 'pipe', 'ignore'] });
  const waiting = new Map();
  let buffer = '';
  let id = 0;
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
      const line = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      try {
        const message = JSON.parse(line);
        waiting.get(message.id)?.(message);
      } catch {
        // Not a JSON-RPC line; the server logs to stderr, so this is rare noise.
      }
    }
  });
  const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
  const rpc = (method, params) =>
    new Promise((done, reject) => {
      const n = ++id;
      const timer = setTimeout(() => reject(new Error(`${method} got no answer in 10 s.`)), 10_000);
      waiting.set(n, (message) => {
        clearTimeout(timer);
        done(message);
      });
      send({ jsonrpc: '2.0', id: n, method, params });
    });
  try {
    const init = await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'record-parity', version: '1' },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const tools = (await rpc('tools/list', {})).result?.tools ?? [];
    const results = {};
    for (const tool of tools.filter((t) => t.annotations?.readOnlyHint === true)) {
      results[tool.name] = [];
      for (const args of calls.get(tool.name) ?? [{}]) {
        const reply = await rpc('tools/call', { name: tool.name, arguments: args });
        const text = (reply.result?.content ?? []).map((c) => c.text ?? '').join('\n');
        results[tool.name].push({
          args,
          isError: reply.result?.isError === true || reply.error !== undefined,
          text: (text || JSON.stringify(reply.error ?? null)).replace(VOLATILE, '"$1":"<varies>"'),
        });
      }
    }
    return {
      serverInfo: init.result?.serverInfo ?? null,
      instructions: init.result?.instructions ?? null,
      tools: tools.map(({ name, title, description, annotations, inputSchema }) => ({
        name,
        title,
        description,
        annotations,
        inputSchema,
      })),
      calls: results,
    };
  } finally {
    child.kill();
  }
}

function recordSkills() {
  const skillsDir = join(dir, 'skills');
  if (!existsSync(skillsDir)) return {};
  const skills = {};
  for (const name of readdirSync(skillsDir).sort()) {
    const md = join(skillsDir, name, 'SKILL.md');
    if (!existsSync(md)) continue;
    const texts = [readFileSync(md, 'utf8')];
    for (const sub of ['references', 'examples']) {
      const folder = join(skillsDir, name, sub);
      if (existsSync(folder))
        for (const f of readdirSync(folder).sort())
          texts.push(readFileSync(join(folder, f), 'utf8'));
    }
    const text = texts[0];
    skills[name] = {
      description: /^description: "(.*)"$/m.exec(text)?.[1] ?? null,
      allowedTools: [...text.matchAll(/^ {2}- (.+)$/gm)].map((m) => m[1].trim()),
      rules: texts
        .join('\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => RULE.test(line)),
    };
  }
  return skills;
}

try {
  const server = await recordServer();
  const record = {
    plugin: readJson(join(dir, '.claude-plugin', 'plugin.json'))?.name ?? null,
    version: readJson(join(dir, '.claude-plugin', 'plugin.json'))?.version ?? null,
    server,
    skills: recordSkills(),
    hooks: {
      claudeCode: readJson(join(dir, 'hooks', 'hooks.json')),
      codex: readJson(join(dir, 'hooks', 'codex-hooks.json')),
    },
  };
  writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  const toolCount = server?.tools.length ?? 0;
  const ruleCount = Object.values(record.skills).reduce((n, s) => n + s.rules.length, 0);
  console.log(
    `Recorded ${toolCount} tools, ${Object.keys(record.skills).length} skills and ${ruleCount} rule lines in ${out}.`,
  );
} catch (error) {
  fail(`Couldn't record the plugin: ${error.message}`);
}
