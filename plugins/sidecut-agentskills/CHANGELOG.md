# Changelog

## [0.1.2] - 2026-11-13

### Added

- Every plugin repo builds with `scripts/build-server.ts`, which also writes `server/THIRD_PARTY_LICENSES.txt` with the licence of each package the bundle inlines. The checker requires both.

### Fixed

- Display names keep acronyms in capitals, so `sidecut-ci` is `Sidecut CI`.
- The template server finds its manifest from its source as well as its bundle.
- The checker's public-repo CI rule no longer skips a job that has no `runs-on`, and its runner hint fits public repos.
- `publish-plugin`'s marketplace reference uses the HTTPS URL, which Claude Code can clone without SSH keys.

## [0.1.1] - 2026-11-13

### Changed

- The checker accepts a public repo's CI when every job runs on `ubuntu-24.04`, and the house style says so.

## [0.1.0] - 2026-11-12

### Added

- `build-mcp-server` skill.
- `create-plugin` skill.
- `design-workflow` skill.
- `publish-plugin` skill.
- `rebuild-plugin` skill.
- `review-plugin` skill.
- `start` skill.
- `write-skill` skill.
- `get_house_style`, `get_patterns`, `check_plugin`, `scaffold_plugin` and `add_skill` tools.
- Plugin and repo templates, and the `sidecut-check` command that other plugin repos run as `bun run style`.
- Local usage log, off unless `SIDECUT_SKILL_LOG=1` is set.
