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
| AGENTS.md | Ends with the Sidecut Solo markers; the generator writes them empty, Solo project setup fills them, and the checker skips the text between them | yes |
| Merging | Ask `solo` to deliver the change once the required checks pass on the latest commit | review |
| Review level | Use the level Solo recommends for code review and `review_model` from the Solo settings | review |

### CI

| Item | Rule | Checked |
| --- | --- | --- |
| Private repo | `check.yml` copies the runner-picker pattern from sidecut-ops, whose budget guard stops hosted jobs near the monthly credit | yes |
| Tools | Pinned builds and checksums come from sidecut-ops' `tools.json`; its `setup-ci-tools` action runs on Bun | yes |
| Public repo | Every job on `ubuntu-24.04`, with no sidecut-ops action | yes |

### Marketplace

`sidecut-plugins` is private, so it bundles a copy of each plugin folder for Sidecut Studio's own installs: a release tag for a plugin in its own repo, or one merge commit of `main` for a plugin inside a product repo. Its own README and scripts say how to bundle, check and merge a new version; never edit a bundled copy by hand. A public repo still installs from its own marketplace files, and no public install step names `sidecut-plugins`. A rename is searched for in both of its marketplace files as well as the other repos.

### Fleet

The repo index and the map of who owns each shared fact live in Sidecut Home, in `plugins/sidecut-home/server/data/repos.toml` and `owners.toml`. The checker reads them from a `sidecut-home` checkout beside the checked repo, or from `SIDECUT_HOME`, and reads each owner's file from that owner's checkout in the same folder, or from `SIDECUT_REPOS`. Where the checkouts aren't there, as in CI, it says which checks it skipped; the pre-push guard and Home's fleet sweep run them on the owner's Mac.

| Item | Rule | Checked |
| --- | --- | --- |
| Kind | A repo's kind is its `kind` in `repos.toml` unless `package.json` declares one | yes |
| Owned facts | `runners`, `ports`, `plugin-pins`, `ci-actions` and `merge-gate` from `owners.toml` are spotted in Markdown; the others are documents, linked rather than copied | yes |
| Retired names | The old studio name and the retired delivery tools, listed with what replaces each in `SIDECUT_RETIRED` in `sidecut-profile.ts`; runtime identifiers that still carry an old name stay until everything that uses them moves together | yes |
| Solo block | The block in `sidecut-profile.ts`, which Solo's own agents-section reference writes word for word | yes |
