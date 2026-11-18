# Releasing Agentskills

Update the version, manifests, marketplace metadata, and changelog together. Run npm ci, npm run build, and npm run check. Test the packaged plugin from a clean folder and check the npm CLI entry points. Commit generated files with their sources.

A version bump on main triggers the release workflow after the required Check jobs pass. The workflow verifies the checked commit and publishes the tagged ZIP and SHA-256 checksum. Do not publish from a local checkout or replace an existing release. Confirm the release assets and install or update from the marketplace on each supported host. Treat a host that has not been tested as unverified.

Consumers pin the released Agentskills version and run the installed sidecut-sync. There is no implicit upgrade.
