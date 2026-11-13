# Tool design

Read this when designing, naming or describing an MCP tool. Agents choose a tool from its name and description alone, so those two decide whether the tool gets used.

## One job per tool

- A tool answers one question or makes one change. "Get PR checks" and "rerun a check" are two tools, not one with a mode flag.
- Prefer a few tools that cover what users ask for over one tool per API endpoint.
- When two tools would always be called together, make them one.

## Names

- Verb then object in snake_case: `get_pr_checks`, `scaffold_plugin`, `check_plugin`.
- Use `get_` for reading one thing, `list_` for reading many, and a plain verb for changes: `add_skill`, `publish_version`.
- Keep a name once it is published; agents and other skills refer to it.

## Descriptions

At most two sentences: what the tool returns, then when to use it. Name what makes it different from its neighbors.

| Weak | Strong |
| --- | --- |
| "Use this tool to check a plugin." | "Returns every place a plugin repo breaks the house style. Use it after any change and before publishing." |
| "Gets data about runners." | "Returns each CI runner's name, status and current job. Use it when a job is queued and you need to know why." |

## Inputs and outputs

- Give every input a `.describe()` saying its format, such as "Absolute path to the repo root".
- Accept absolute paths only, and refuse relative ones with an error.
- A tool that works on the user's project takes the project's path. Codex starts the server in the plugin's folder, so the working directory isn't the project there.
- Keep required inputs few, and give each a safe default where one exists. Answer a missing input with an error that names it.
- Declare an `outputSchema` and return `structuredContent`, so a test can check fields instead of parsing text.
- Use camelCase field names that stay stable between versions. A tool that wraps a program's existing JSON keeps that program's field names, so both give the same data the same names.
- Report a value you couldn't get as `null`, never a guess.

## Hints

| Hint | Set it to true when |
| --- | --- |
| `readOnlyHint` | The tool changes nothing |
| `destructiveHint` | The tool deletes or overwrites something that can't be recovered |
| `idempotentHint` | Calling it twice with the same input has the same effect as once |
| `openWorldHint` | The tool reaches anything outside the user's machine |

Hosts use these to decide what to ask the user before running a tool, so set all four on every tool.
