# Marketplace entries

Read this when adding a plugin to the sidecut-plugins marketplace or pointing it at a new version. The marketplace lists each plugin twice, once per host, and both entries fetch the plugin folder from its own repo at a tag.

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

## Updating to a new version

Change `ref` in both entries to the new tag, in one commit. Nothing else changes unless the description did.

## Removing a plugin

Delete both entries in one commit. People who have it installed keep their copy until they remove it.
