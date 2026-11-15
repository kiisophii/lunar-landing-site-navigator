# Final presentation pass — A + C

Base: `integ-1915` `abb09f5` (v49). B was cancelled by Jiyong while work was in progress; comparison hover, timeline behaviour and Site check popover behaviour are not changed.

- A: analysis cards use two equal columns on desktop, one column below 1100 px; contents respond to card width. The second-section information glyph is a circled i. English Site check actions, metadata and analysis labels get spacing/wrapping rules. KR typography stays unchanged. KR/EN controls have equal 4 px top/bottom visual inset.
- C: 390 px EN/KR full scroll through the first screen, comparison, every available analysis and About. Buttons/inputs/selects/summary controls are at least 24 px. Candidate names wrap fully; unpin stays separate. Source footers, long Site check headings and nested raw tables fit the mobile width.
- Overrides live in `web/css/final_ui.css` to avoid concurrent edits to shared design CSS. `compare_view.js` changes only the information SVG; `shell.js` loads the stylesheet. No data, formulas, metric values or `web/index.html` changes.

## Verification

`python verification/final_ui_audit.py http://127.0.0.1:8060 <output-directory>`

Chromium: 1920 / 1440 / 1280 / 1100 / 390 × EN/KR. All 10 cases: console/page errors 0, document horizontal overflow 0, detected clipped/outside controls 0. Both 390 cases: controls under 24 px 0. See `results.json` and the accompanying captures. Screenshots were visually inspected; geometry measurements do not substitute for scientific validation.

JavaScript syntax checks passed for the two changed modules. `git diff --exit-code -- web/data pipeline web/index.html` confirms protected paths are unchanged. B interactions are deliberately excluded from acceptance for this PR. Post-PR D regression is performed separately against the refreshed integration branch; this report describes this PR's branch only.

## Integration refresh

Merged the new integration base `1675728` (version 51) while final regression was running. Preserved both SI log additions. Reran 390/1100 × EN/KR on the combined PR branch: all four cases passed errors, overflow, clipping and outside-control checks; both mobile cases passed the 24 px check. Separately checked that the About disclosure arrows remain visible and the summaries are at least 24 px in EN/KR. See `refreshed-results.json`. The original 10-case evidence above remains labelled with its original base.

## Final D regression

[Integration 1675728 regression results and remaining visual findings](regression.md): all 10 requested viewport/language cases passed console, overflow and navigation checks. Two pre-existing visual findings are documented without application-code fixes.
