# Releasing Agentskills

1. Add the dated release notes at the top of CHANGELOG.md. Run `node scripts/version.ts <version>` to set the npm package version and generate both host manifests, the lockfile version and the plugin changelog. Run `npm ci`, `npm run build` and `npm run check`. Commit the generated files with their sources.
2. Merge through Sidecut Solo after the required checks pass. The Release workflow verifies the checked main commit, then publishes the stable tag, ZIP and SHA-256 checksum. Inspect the run and both assets in GitHub.
3. Reconcile the shared marketplace from its own checkout. The public Claude Code and Codex catalogs live here and install from this repository.

Rerun a failed Release job to reconcile an incomplete draft. If main has advanced, inspect the Release run for the newer checked main commit. The publisher can resume an existing tag on checked main history for the same version. Fix an incorrect published artifact in a new version.

The reusable workflow lives in `.github/workflows/publish-plugin.yml`. Other participating repos call it at a reviewed full commit SHA. The caller owns its Check trigger and merge policy. Releasing runs with the caller's GitHub token and selects a runner using the caller's repository visibility. The published workflow and version command work without access to the private marketplace.
