# Visual reports

Read this when plugin comparisons, workflow designs, reviews or research become clearer when people can see the work.

## Choose the format

Default to an HTML report for substantial design comparisons, blind bakeoffs and visual design reports. Use HTML for plugin work when a diagram, comparison or illustrated finding helps someone decide.

Use it for other work when a visual makes a decision or relationship easier to understand. Keep a short factual answer in chat.

Honor a requested format or a text-only preference. Don't create an empty dashboard, decorative chart or a page that repeats a short answer.

Read this file from the loaded plugin's `server/data/` folder. The sibling `visual-report.html` and `visual-report.css` provide an adaptable layout and tokens. Bundled Latin Geist fonts keep typography available offline.

## Build the report

1. Lead with the answer or recommendation and its reason. For blind bakeoffs, lead with the brief and ranking instructions without revealing a favorite.
2. Choose a composition from the table below. Adapt the example's sections to the material; don't keep its instructional copy or illustrative drafts.
3. Use real screenshots, crops, diagrams or data where available. Caption observed screens, proposed designs and illustrative examples accurately.
4. Put useful material above the fold: the decision, a readable comparison or the most important finding. Avoid a cover screen with no work visible.
5. Keep each claim near its source. Preserve versions, observation dates, units, sample counts, uncertainty and untested states when relevant.
6. Keep implementation details in native disclosures. Leave decisions, severity, blockers and essential limitations visible.
7. Save a standalone HTML file in the host's artifact folder or a task-owned output folder. For read-only work, save artifacts outside the reviewed repository and leave its files unchanged.
8. Inline the stylesheet and embed required images. Embed the bundled Geist fonts as data URLs and preserve their accompanying license notices in the HTML source.
9. Make the report useful without scripts, storage or network access. Add interaction only when it helps compare, inspect or understand the material.
10. Render the saved file before sharing it. Check narrow, tablet and desktop layouts, both themes, keyboard focus, zoom and print output.
11. Check every interaction, source link and image. Reload the file to check that required content survives; avoid relying on browser storage.
12. Return a clickable report link with a short chat answer. Use the host's HTML preview when available. If rendering is unavailable, name that gap.

## Apply it to agent tooling

| Work | Useful visual |
| --- | --- |
| Plugin or tool approaches | Source-linked options matrix and a labeled architecture diagram |
| Workflow design | Event, decision and action flow, with roles, permission boundaries and failure paths |
| Plugin review | Prioritized findings with file locations and observed examples; screenshots when reviewing rendered views |
| Plugin rebuild | Before-and-after parity matrix for skills, tools, hard rules, hooks and checks |
| Skill evaluation | Expected versus observed behavior, case groups and measured outcomes with sample counts |
| MCP view design | Matched proposed layouts or captured views, with a readable text fallback |
| Research | Source-linked comparisons, relevant diagrams and practical implications |

Keep the owning skill's review groups, severity, parity checks and verification requirements. Distinguish proposed behavior from observed results.

A clean validator result or a short status answer doesn't need an HTML page. Don't turn ordinary tool development into a visual-report task.

A saved HTML report isn't an MCP App. Building a live chat view needs the view procedure in `agentskills-build-mcp-server` and separate host verification.

## Match the material

| Material | Composition |
| --- | --- |
| Design comparison | Equal-scale screenshots in matched frames, concise captions, criteria table and recommendation |
| Blind bakeoff | Neutral lettered entries, equal treatment and realistic contexts, followed by a ranking card with a chat reply example |
| Design review | Overall impression, annotated screenshots or crops, prioritized findings, strengths and fix details |
| Research | Answer, source-linked comparison matrix, relevant diagram or measured chart, implications and unresolved questions |
| Measured experiment | Shared axes, units, sample counts and conditions, outcomes and limits of the comparison |
| Flow or architecture explanation | Labeled diagram with a readable text equivalent and the decisions it explains |

Charts need real values, labeled axes and an accessible table or text equivalent. Never manufacture scores, precision, timings or user results.

For bakeoffs, keep maker identities, filenames, metadata, cost and rankings outside the gallery until the user's ranking is recorded.

Don't style one blind entry as the winner. Keep crops, order, scale and available controls equally fair across entries.

## Use the shared design

The shared design belongs to Sidecut Builder: `src/tailwind.css` owns values and `design.json` mirrors them. Sidecut Studio's `DESIGN.md` adopts that system.

The packaged stylesheet carries those role tokens for installed use. It needs no source checkout or other installed plugin.

When updating the stylesheet, compare those upstream files. Keep original role names and light/dark pairs; don't invent a separate report palette.

Use warm paper, ink, restrained orange, fine rules and generous space. Geist is the main face; Geist Mono labels sources and metadata.

Use orange for an accent or focus, not paragraphs or tiny low-contrast labels. Use accent ink for text and inverse ink for primary actions.

Use a strong heading, a readable lede and varied sections. Cards need meaningful grouping; don't turn every paragraph into a tile.

Avoid gradients, glows, ornamental charts, stock dashboard chrome and giant empty hero areas. Let screenshots and diagrams occupy meaningful space.

Keep the report frame in Sidecut's design. Preserve the reviewed product's own tokens, voice and original screenshots inside it.

Support device theme preference and reduced motion. Give images useful alternative text, tables headers and controls visible keyboard focus.

For print, keep required content visible, including disclosure contents. Ensure long labels wrap and only wide tables scroll horizontally.

## Use the shared voice

Use the Plainspoken Editorial section of Builder's `VOICE.md`, as adopted by Sidecut Studio. Follow the house style's Wording rules for agent instructions.

Lead with what someone can decide or do. Be direct, human and quietly confident. Let specific work earn the conclusion.

Write descriptive headings and short sentences. Explain technical terms when the reader needs them. Buttons name what happens.

Don't add slogans, hype, stock phrases, fragment pairs or a studio "we". Don't impersonate the owner or invent quotes.

State a necessary limitation once beside the affected claim. Don't bury it in fine print or stack disclaimers at the bottom.

## Verify the result

A finished report has readable visuals, working links, honest claims and a clear next action. A page existing on disk isn't a visual check.

Use the owning skill's method to validate the underlying work. A beautiful report doesn't replace research, functional checks or design observation.
