# User input

Ask only when the user's answer materially changes the work, supplies a missing requirement, settles an actionable recommendation or authorizes a consequential action. Recover decisions and permission from the current task first. Use the repository and other available sources to resolve facts. Take routine, reversible steps yourself. Give an advisory recommendation directly when there is no decision to make now.

Ask in the main session. Batch related questions that are ready together. For a choice, recommend one option first with its reason and main trade-off. Use short labels and leave room for the user's own answer. For authorization, name the action, scope and consequences, including any cost, release or other external effect.

## Choose the channel

- In Claude Code, use `AskUserQuestion` when the active session exposes it. Use its custom-answer affordance. Plain headless runs may omit it. Use `ExitPlanMode` for native plan approval when Claude Code requires it.
- In Codex, use `request_user_input` for decisions when the active mode exposes and permits it. Plan mode supports planning questions. In Default mode, use this tool only for optional questions that materially improve the work, when exposed. Use a concise chat question for required input or task authorization in Default mode unless the surface offers another native question tool explicitly permitted for that purpose.
- If the host exposes an asynchronous question tool, use it only where its instructions permit the question. Continue unrelated work while it is pending. If no eligible tool is available, ask in concise chat and invite the user's own answer.
- Use the host's native confirmation or permission flow whenever it applies. A question answer can record a task choice or explicit task consent where the host permits it. It cannot satisfy a separate plan approval, sandbox escalation, connector confirmation or other execution gate. Stay in the active host mode and preserve refusals.

## Handle the answer

Reuse explicit decisions and task-scoped authorization. A suggested or preselected default, dismissal, empty response or elapsed time grants no approval. Require an affirmative answer covering the action before doing work that depends on authorization. Keep required unanswered decisions pending and continue unrelated work. If the choice is optional and the host returns no answer, proceed with a stated reversible assumption when useful. Never turn an optional recommendation into authorization to implement it.

**Example** — For a reversible connection choice, lead with “Use the existing server (Recommended)” and explain that it avoids a second deployment but shares the server's availability. Offer the separate deployment and let the user supply another option. For a ready-to-publish change, explain which version and audience the release reaches and keep publishing pending until the necessary task and host approvals are in place.
