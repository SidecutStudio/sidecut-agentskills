# User input

Ask only when the user's answer materially changes the work, supplies a missing requirement, settles an actionable recommendation or authorizes a consequential action. Recover decisions and permission from the current task first. Use the repository and other available sources to resolve facts. Take routine, reversible steps yourself. Give an advisory recommendation directly when there is no decision to make now. Next actions the user can pick from are a decision: offer them as Offer follow-ups describes.

Ask in the main session. Batch related questions that are ready together. For a choice, recommend one option first with its reason and main trade-off. Use short labels and leave room for the user's own answer. For authorization, name the action, scope and consequences, including any cost, release or other external effect.

## Choose the channel

- In Claude Code, use `AskUserQuestion` when the active session exposes it. Use its custom-answer affordance. Plain headless runs may omit it. Use `ExitPlanMode` for native plan approval when Claude Code requires it.
- In Codex, use `request_user_input` for decisions when the active mode exposes and permits it. Plan mode supports planning questions. In Default mode, use this tool only for optional questions that materially improve the work, when exposed. Use a concise chat question for required input or task authorization in Default mode unless the surface offers another native question tool explicitly permitted for that purpose.
- In Gemini/Antigravity, tool calls run before your final message is displayed, so calling `ask_question` in the same turn hides new options, comparisons, drafts or report links behind the question prompt. Present new options, comparisons, drafts or results in a completed chat turn first (inviting the user's choice in chat), and call `ask_question` only when the needed context is already visible from prior turns or self-contained in the prompt. Use concise chat questions for yes/no confirmations or task authorization.
- If another host exposes an asynchronous question tool, use it only where its instructions permit the question. Continue unrelated work while it is pending. If no eligible tool is available, ask in concise chat and invite the user's own answer.
- Use the host's native confirmation or permission flow whenever it applies. A question answer can record a task choice or explicit task consent where the host permits it. It cannot satisfy a separate plan approval, sandbox escalation, connector confirmation or other execution gate. Stay in the active host mode and preserve refusals.

## Offer follow-ups

When finished work leaves concrete next actions, such as fixing some findings, recording exceptions or publishing, ask about them last, after the result and its verdict. Use the host's question tool when it renders after the message; where Choose the channel falls back to chat (including Gemini/Antigravity when the result and options are first shown in that turn), ask one concise chat question that lists the options. Never end on an open "want me to...?" line.

Offer 2 to 4 actions, the recommended one first with its reason, and leave room for the user's own answer. With a single action, ask yes or no for it. An option that publishes, merges or has another external effect says so. A review-only or read-only request ends this way too.

A pick records consent only for the action it names, with the scope and effects it states, and host gates still apply. A dismissal or no answer picks nothing: end with the result and change nothing. With nothing to choose, or when the only next step is the user's own, end with the result.

## Handle the answer

Reuse explicit decisions and task-scoped authorization. A suggested or preselected default, dismissal, empty response or elapsed time grants no approval. Require an affirmative answer covering the action before doing work that depends on authorization. Keep required unanswered decisions pending and continue unrelated work. If the choice is optional and the host returns no answer, proceed with a stated reversible assumption when useful; a follow-up offer is the exception, where no answer means nothing runs. Never turn an optional recommendation into authorization to implement it.

**Example** — For a reversible connection choice, lead with “Use the existing server (Recommended)” and explain that it avoids a second deployment but shares the server's availability. Offer the separate deployment and let the user supply another option. For a ready-to-publish change, explain which version and audience the release reaches and keep publishing pending until the necessary task and host approvals are in place.
