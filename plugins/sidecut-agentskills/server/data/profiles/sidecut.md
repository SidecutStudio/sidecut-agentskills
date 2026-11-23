## Sidecut profile

These rules apply only to repos made with the `sidecut` profile, Sidecut Studio's own setup. They add to the house style; anyone else can ignore this section.

| Setting | Value |
| --- | --- |
| Owner | `SidecutStudio` |
| Author | Sidecut Studio, `https://sidecut.dev` |
| Prefix | `sidecut-` |
| Marketplace | `SidecutStudio/sidecut-plugins`, private |
| CI mode | `sidecut`: the runner picker from `SidecutStudio/sidecut-ops` |
| Brand color | `#FF6B00` |
| Workflow | `solo`: Sidecut Solo |

A repo with no answers file whose manifest points at a `SidecutStudio` repo is checked with this profile.

### Sidecut Solo

| Item | Rule | Checked |
| --- | --- | --- |
| `solo-workflow.toml` | At the repo root; `required_checks` is the merge gate, includes `check`, and the release script reads it. `solo-workflow.local.toml` is ignored | yes |
| AGENTS.md | Ends with the Sidecut Solo markers; the generator writes them empty, `solo-configure-project` fills them, and the checker skips the text between them | yes |
| Merging | Through `solo-finish-change`, once the required checks pass on the latest commit | review |
| Review level | The level `solo-review-change` reports, with `review_model` from the Solo settings | review |

### CI

| Item | Rule | Checked |
| --- | --- | --- |
| Private repo | `check.yml` copies the runner-picker pattern from sidecut-ops, whose budget guard stops hosted jobs near the monthly credit | yes |
| Tools | Pinned builds and checksums come from sidecut-ops' `tools.json`; its `setup-ci-tools` action runs on Bun | yes |
| Public repo | Every job on `ubuntu-24.04`, with no sidecut-ops action | yes |

### Marketplace

`sidecut-plugins` is private, so it bundles a copy of each plugin folder for the owner's installs: a release tag for a plugin in its own repo, or one merge commit of `main` for a plugin inside a product repo. Its own README and scripts say how to bundle, check and merge a new version; never edit a bundled copy by hand. A public repo still installs from its own marketplace files, and no public install step names `sidecut-plugins`. A rename is searched for in both of its marketplace files as well as the other repos.
