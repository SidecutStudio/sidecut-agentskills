# Adapt patterns from upstream skills

Read the original skill and the relevant official documentation. Identify the trigger, the minimum context the agent needs, and how it can check the result. Carry the procedure into the appropriate skill in your own words and link the source beside it.

## Keep the skill easy to find and small to load

- Keep the trigger and common steps in `SKILL.md`. Open a topic reference when the task reaches its decision or verification point. For example, an Expo Router skill can keep route discovery and basic checks in its body and load native tabs or deep-linking guidance when relevant. Read the project's SDK and actual route tree before recommending version-specific APIs.
- Make any optional files, dependencies and their effects discoverable before writing. shadcn's registry items show this with declared file targets and dependencies and a preview of proposed edits. For a plugin, use the existing manifests and References table. When a skill writes files, have it show the intended targets and check the resulting diff.
- For a context-mapping skill, start from the task entry point, direct consumers, relevant contracts and checks. Gather more context when evidence calls for it. For a resumed task, use the accepted constraints, current diff, next action and latest applicable checks. Link to files and concise evidence so another session can recover them.

[Expo Router skill](https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-router/SKILL.md) · [shadcn registry items](https://ui.shadcn.com/docs/registry/registry-item-json) · [Context Map](https://github.com/github/awesome-copilot/blob/main/skills/context-map/SKILL.md) · [Context Engineering](https://github.com/addyosmani/agent-skills/blob/main/skills/context-engineering/SKILL.md)
