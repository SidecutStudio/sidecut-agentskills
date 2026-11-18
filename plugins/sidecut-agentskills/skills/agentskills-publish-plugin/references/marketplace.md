# Marketplace entries

Read this when adding a plugin to the sidecut-plugins marketplace or pointing it at a new version. Every plugin built in another repo installs from a copy in sidecut-plugins' `bundled/<plugin-id>/`. claude.ai reads the private marketplace with the owner's GitHub access but fetches any other repo anonymously, so it can't install straight from a private plugin repo. `scripts/bundle.ts` makes the copy and records its pin in `bundled/sources.json`: a release tag for a plugin in its own repo, or one commit of `main` for a plugin inside another product's repo, such as Next Role in `next-role-lovable`.

## Updating to a new version

In `sidecut-plugins`, on a branch:

```bash
bun scripts/bundle.ts <plugin-id> v<version>      # a tag release
bun scripts/bundle.ts <plugin-id> <merge-commit>  # a commit pin: the full 40-character sha
```

It clones the plugin's repo with `gh`, copies `plugins/<plugin-id>/` at that ref into `bundled/<plugin-id>/` and updates `bundled/sources.json`. The marketplace entries don't change. Run `sh scripts/check.sh`, commit the copy and `sources.json` together, and merge. Never edit the copy by hand: the check compares it with the source and fails on any difference.

## Adding a plugin

Bundle it with its repo named:

```bash
bun scripts/bundle.ts <plugin-id> <ref> --repo SidecutStudio/<repo>
```

Then list it in both marketplace files. In `.claude-plugin/marketplace.json`:

```json
{
  "name": "sidecut-demo",
  "source": "./bundled/sidecut-demo",
  "description": "Shows the status of a demo service.",
  "category": "development"
}
```

The `description` is the plugin's manifest description, word for word. In `.agents/plugins/marketplace.json`:

```json
{
  "name": "sidecut-demo",
  "source": {
    "source": "local",
    "path": "./bundled/sidecut-demo"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Developer Tools"
}
```

Run `sh scripts/check.sh` and merge the copy, `sources.json` and both entries in one change.

## Removing a plugin

Delete both entries, its `bundled/<plugin-id>/` folder and its line in `bundled/sources.json` in one commit. People who have it installed keep their copy until they remove it.

## Shared release workflow pilot

From a fresh marketplace branch, run `bun scripts/reconcile.ts check` for Sidecut Agentskills and Sidecut Solo. If a release is ahead of the bundle, run the printed update command. The update verifies the published ZIP and checksum against the tagged source and generates the bundle and its pin. Commit the generated diff and open a marketplace PR.
