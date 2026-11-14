# Marketplace entries

Read this when adding a plugin to the sidecut-plugins marketplace or pointing it at a new version. The marketplace lists each plugin twice, once per host, and both entries fetch the plugin folder from its repo at the same pin. A plugin in its own repo is pinned to a release tag; a plugin inside another product's repo is pinned to one commit of `main`.

## Claude Code

In `.claude-plugin/marketplace.json`, the plugin's entry in `plugins`:

```json
{
  "name": "sidecut-agentskills",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/SidecutStudio/sidecut-agentskills.git",
    "path": "plugins/sidecut-agentskills",
    "ref": "v0.1.0"
  },
  "description": "Creates, checks and publishes Sidecut plugins, skills and MCP servers that all follow one house style.",
  "category": "development"
}
```

The `description` is the plugin's manifest description, word for word. Both hosts get the full HTTPS URL: Claude Code clones the `owner/repo` shorthand over SSH, which fails on a Mac signed in to GitHub over HTTPS.

## Codex

In `.agents/plugins/marketplace.json`, the same plugin:

```json
{
  "name": "sidecut-agentskills",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/SidecutStudio/sidecut-agentskills.git",
    "path": "plugins/sidecut-agentskills",
    "ref": "v0.1.0"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Developer Tools"
}
```

## Commit pin

A plugin inside another product's repo, such as Next Role in `next-role-lovable`, has no release tags. Both entries keep `"ref": "main"` and add the full 40-character `sha` of a `main` commit; both hosts check out that commit:

```json
"source": {
  "source": "git-subdir",
  "url": "https://github.com/SidecutStudio/next-role-lovable.git",
  "path": "plugins/next-role",
  "ref": "main",
  "sha": "958f065cb9007a90d8406f0111e067533bbc4e3a"
}
```

The rest of each entry is the same as above. When the repo isn't named after the plugin, add it to the `REPOS` map in `scripts/validate.ts`.

## Updating to a new version

For a tag release, change `ref` in both entries to the new tag. For a commit pin, change `sha` in both entries to the merge commit and leave `ref` as `main`. Do it in one commit, run `sh scripts/check.sh`, and change nothing else unless the description did.

## Removing a plugin

Delete both entries in one commit. People who have it installed keep their copy until they remove it.
