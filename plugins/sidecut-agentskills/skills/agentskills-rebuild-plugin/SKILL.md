---
name: agentskills-rebuild-plugin
description: "Rebuilds an existing plugin repo so it follows the house style, keeping everything it does and proving nothing was lost. Use when the user wants an older plugin brought up to the template, cleaned of drift, or moved onto the Sidecut layout. Not for one change to a plugin that already passes `check_plugin` (use `agentskills-write-skill` or `agentskills-build-mcp-server`)."
allowed-tools:
  - mcp__plugin_sidecut-agentskills_agentskills__check_plugin
  - mcp__plugin_sidecut-agentskills_agentskills__get_house_style
---

# Rebuild plugin

Produces the same plugin in the house style on a branch, with a before-and-after comparison that shows its tools, skills, hard rules, hooks and checks still behave the same.

## Before you start

- Work on a new branch. Merge only through the repo's own flow, and only when the comparison holds.
- Read the "Repo layout" and "Plugin layout" sections of `get_house_style`. A repo that ships a plugin next to other work, such as an app repo, keeps its own top level; only `plugins/<plugin-id>/` changes.

## Steps

1. Record the plugin as it is now, following [parity.md](references/parity.md): its skills, their trigger requests and their hard rules; its tools and their output on fixed inputs; its hooks and their decisions on fixed inputs; its required checks.
2. Call `check_plugin` and keep the list; it shows most of what has to change.
3. Work out every name the rebuild changes, and identify compatibility decisions before building: plugin id, skill prefix and skill names, tool names, paths, the repo name, config and state file names, and how existing installs move over (the marketplace's `renames` entry, and old config files still read). Search the user's other repos (the folders next to this one) and the marketplace files that list the plugin (`.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`, here and in any shared marketplace) for each old name, as described in [parity.md](references/parity.md). Explain what a rename would break. Bundle any unsettled names and compatibility choices, and obtain missing authorization before renaming anything people or other repos already use. Follow `server/data/user-input.md` from the loaded plugin root.
4. Call `scaffold_plugin` into a temporary folder with the plugin's id, description and keywords. Copy in whichever generated files the plugin lacks: manifests, MCP files, hook, CI workflow. Draw its icon with `npm exec --no -- sidecut-icon <lucide-name>`. A public repo also gets the two marketplace files and the README install steps from the Install source section of `get_house_style`; drop any install line that needs a marketplace the public can't read.
5. Commit, push the branch and open one draft PR now. Commit and push again after each step that follows, so the work is never only on this disk.
6. Rewrite each skill with `agentskills-write-skill`. Read the old skill to list what it covers and every hard rule it states (never, always, only when, don't, must), then write the new one from that list. A skill generated from code, a template string or a shared constant gets the same treatment: write the SKILL.md by hand, delete the generator and its regeneration test, and have whatever shared the text, such as an MCP prompt, read the SKILL.md instead.
7. Move the server's logic into `server/src/` and bundle it with `npm run build`. Keep tool names and outputs, except where the house style says otherwise; list every change.
8. Port each hook so it makes the same decision on every recorded input. Carry the old hook's tests over before rewriting it.
9. Delete what the house style has no place for: extra manifests, duplicate MCP files, commands, unused scripts and stale docs.
10. Run `npm run check` until it passes.
11. Repeat the recording from step 1 on the new version and compare the two. Write down every difference and why it is there.
12. Hand the rebuilt repo, its commit and the list of differences to the `sidecut-agentskills:reviewer` subagent, which reads it without your context. A rebuild is always a deep review, so it runs on your own model, and so does the full re-review after its fixes. In Codex it is `agentskills_reviewer`; if the project's `.codex/agents/agentskills-reviewer.toml` is missing, copy it from this plugin's `codex/agents/` first. Fix what it finds and run `npm run check` again.
13. After those fixes, present the before-and-after table in the format the test in `server/data/visual-reports.md` from the loaded plugin root picks. It doesn't replace the checks.
14. Merge and release through `agentskills-publish-plugin`, which also bundles the new tag into the marketplace. If the plugin id changed, bundle it under the new id and remove the old copy and entries in the same marketplace change. Then fix each other repo step 3 found in its own PR.

## Rules

- Nothing is copied over as it was; text, layout and names follow the house style.
- A repo or brief rule that keeps the old structure, such as "SKILL.md is generated; never hand-edit it", is part of what the rebuild replaces. Raise it with the user instead of building around it.
- Match the user's other plugins in the same marketplace: read two of them first, and give this one the same shape, failure handling and usage log unless the house style says otherwise.
- A behavior that changes, such as a renamed tool, goes in the CHANGELOG under Changed with the version bump that `agentskills-publish-plugin` makes. A rename people have to act on starts with "Breaking:" and says what they do.
- The parity records and the list of differences stay in the scratch folder and the PR body. Nothing about the rebuild itself, such as "candidate", "comparison" or "unpublished", goes into the repo's files.

## Resolve rebuild problems

- **A tool's output differs and the house style doesn't explain it:** that is a regression. Fix the port before going on.
- **A skill no longer triggers on one of its recorded requests:** fix its description with `agentskills-write-skill`, then rerun that request.
- **A hard rule is missing or weaker in the new skill:** that is a regression too, even when every test passes. Put the rule back as strong as it was.
- **A hook decides differently on a recorded input:** fix the port and add that input to its tests.

## Done when

`npm run check` passes on the branch, and the comparison shows the same tools, skills, hard rules, hook decisions and checks, with every difference explained. Every place that used an old name is updated, or the user has chosen to leave it.

## References

| Read | When |
| --- | --- |
| [parity.md](references/parity.md) | Recording the plugin before and after |
