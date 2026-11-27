# Visual reports

Read this before writing the result of a review, audit, rebuild, research question or comparison. It decides whether the result goes in chat or in an HTML report.

## Choose the format

Decide the format before writing the result. Publish an HTML report when the result has any of these:

- 5 or more findings, problems or recommendations
- a comparison of 3 or more options, versions or entries
- a before-and-after or parity table
- a flow, architecture or relationship that a diagram explains
- measured data with more than 10 rows
- a design comparison or blind bakeoff

One of these is enough, even with fewer than 5 findings. With none of them, answer in chat: a short verdict, a clean pass, a status line or one fact. A requested format or a text-only preference wins over this test.

With an HTML report, the chat reply still carries the verdict and the top three items, so nobody has to open the page to learn the answer. Don't create an empty dashboard, decorative chart or a page that repeats a short answer.

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
12. Show the report where the user already is, with a short chat answer. In Claude Code, publish it with the Artifact tool or open it in the desktop app's built-in browser; in Codex, open it in the in-app browser; in Gemini/Antigravity, save it in the artifact directory and share its clickable file link or open it in a browser view. Keep private data, such as usage, in the local browser view unless the user asks to share it. Never hand over a file the user has to download and open. With no view at all, give the path and name that gap.

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

The packaged stylesheet, `visual-report.css`, holds the report's role tokens. It needs no source checkout or other installed plugin.

When updating the stylesheet, keep its role names and light/dark pairs; don't invent a separate report palette.

Use warm paper, ink, restrained orange, fine rules and generous space. Geist is the main face; Geist Mono labels sources and metadata.

Use orange for an accent or focus, not paragraphs or tiny low-contrast labels. Use accent ink for text and inverse ink for primary actions.

Use a strong heading, a readable lede and varied sections. Cards need meaningful grouping; don't turn every paragraph into a tile.

Avoid gradients, glows, ornamental charts, stock dashboard chrome and giant empty hero areas. Let screenshots and diagrams occupy meaningful space.

Keep the report frame in the packaged design. Preserve the reviewed product's own tokens, voice and original screenshots inside it.

Support device theme preference and reduced motion. Give images useful alternative text, tables headers and controls visible keyboard focus.

For print, keep required content visible, including disclosure contents. Ensure long labels wrap and only wide tables scroll horizontally.

## Use the shared voice

Lead with what someone can decide or do. Be direct, human and quietly confident. Let specific work earn the conclusion.

Write descriptive headings and short sentences. Explain technical terms when the reader needs them. Buttons name what happens.

Don't add slogans, hype, stock phrases, fragment pairs or a studio "we". Don't impersonate the user or invent quotes.

State a necessary limitation once beside the affected claim. Don't bury it in fine print or stack disclaimers at the bottom.

## Verify the result

A finished report has readable visuals, working links, honest claims and a clear next action. A page existing on disk isn't a visual check.

Use the owning skill's method to validate the underlying work. A beautiful report doesn't replace research, functional checks or design observation.
