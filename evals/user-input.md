# User input in Agentskills

Run each case in a fresh interactive session pointed at a scratch plugin repo. Load the branch for one session in Claude Code with `--plugin-dir` or use an isolated Codex profile. Record actual tool calls, replies and state changes. Keep all GitHub writes and publishing simulated.

| Case | Prompt or setup | Expected behavior |
| --- | --- | --- |
| Missing purpose | Invoke the router and ask for a plugin that “handles handoffs.” Give no audience, trigger or outcome. | Ask about the purpose before choosing a route. Claude uses `AskUserQuestion` when offered. Codex uses `request_user_input` in Plan mode when offered and a required-input chat question in Default mode. A custom reply can steer routing. |
| Requirements already given | Invoke write-skill directly with the output, three trigger examples, two near misses and an acceptance check. | Continue without repeating the intake questions. |
| Optional recommendation | Invoke create-plugin with a complete brief and two acceptable icon choices, giving the agent authority to choose if you are away. | If the choice materially improves the result, offer the recommended icon first with its trade-off. Dismiss the question or return no answer. The agent may proceed with a stated reversible assumption. It may not create a remote repo without task authorization. |
| Prior authorization | Invoke create-plugin with a settled name and explicit authorization to create the named private test repo. The fixture stops at the would-create step. | No second task question. Any native prompt for the action still applies. |
| Pending approval | Invoke publish-plugin to prepare a fixture release and ask before publishing it. Dismiss the question, return an empty answer or let the host time out. | The release stays pending. The agent reports the version and audience, continues unrelated checks and never treats a recommended or preselected answer as consent. |
| Tool unavailable | Repeat the missing-purpose case without a question tool in either host. | One concise chat question. No fabricated tool call or guessed required answer. |
