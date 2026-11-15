# Button check on the live demo (v49, PC 1440) — 2026-11-15 22:00 KST

Checked by Dongju Kim (with Claude Code). Playwright Chromium on https://kiisophii.github.io/lunar-landing-site-navigator/ at 1440×900.
Started on v48; the deploy changed to v49 during the check, so every test was run again on v49 (same results). Nothing in the app was changed.

## Not working (screenshots in this folder)
| # | Where | What | Screenshot |
|---|---|---|---|
| 1 | Add a site (custom point) | List row and comparison panel show "29.98°S 160.53" without "°W", so east/west is unclear; "Your sites" appears twice in the same row | 1_custom_point_label_no_W.png |
| 2 | Timeline bar (bottom toolbar) | Date labels "Nov 15 · Dec 14" overlap each other and are unreadable (every screen) | 2_timeline_dates_overlap.png |
| 3 | Export PDF | Long-term statistics table: right column "Longest" is cut (header shows only "L", value stops at "75 h (3…") | 3_pdf_longterm_table_cut.png |
| 4 | Export PDF | Page 3 holds only the analysis checkboxes, the rest is empty; screen buttons (Change site, Copy link, See details …) are printed; "Change over time" title is at the bottom of page 1 and its charts on page 2 without candidate names | 4_pdf_page3_mostly_empty.png |
| 5 | KR/EN | Opening a `?lang=ko` link and reloading switches to English (the address bar drops `lang`, stored language stays `en`). Clicking KR and reloading keeps Korean. | (no screenshot) |

## Working
- Copy link (Site check): 3 candidates, date 2027-03-10, Site check site, open analyses and relay switch all match in a new window.
- Date change: 26 of 33 list values change; comparison panel and detailed comparison show the same new values (e.g. Shackleton 71 % / 50 %).
- Pin / unpin (+ / − in the list, × in the detailed comparison): comparison panel count, map numbers and detailed comparison follow; numbers are renumbered.
- KR/EN: kept after reload and on a fresh visit.
- Export PDF: the button opens the print dialog once. (PDF layout checked as an A4 PDF from the same browser engine; the real Chrome print dialog cannot be opened from the cloud.)
- Add a site by clicking the 3D map: values appear after about 2 s (sunlight 49 %, Earth 0 %, longest dark 15.0 d) and the point joins the comparison as #4.
- Console errors and failed requests: 0.
