# QA screenshots: integ-1915 (6056b17), phone 390 px

Taken 2026-11-15 20:0x KST with headless Chromium, iPhone 13 emulation (390 x 664 CSS px, 3x), WebGL off for the About shots, first visit (fresh profile). Served locally from `web/` of branch `integ-1915`. Not real iPhone Safari.

| File | What it shows | Result |
|---|---|---|
| about390_top.png | About, #abScroll at the top | Arrow button (bottom right) sits at the end of "...and compare the alternatives." |
| about390_mid.png | About, #abScroll at 50 % | **Still there:** the arrow covers "not meet the sunlit condition." in "Longest dark period" |
| about390_bottom.png | About, #abScroll at the end | Arrow turns to back-to-top; nothing covered |
| iphone_main.png | Main view, WebGL on | **New:** the minimap (222 x 228 px) covers most of the 3D Moon and the zoom-in (+) button underneath, so + cannot be tapped |

- Picture caption "Illustration only, not to scale" floating above the title: **fixed** (no caption on About any more). The small "LUNA SIGHT" label now sits under the big title; check whether that order is intended.
- Re-check: same result on a second capture and at 390 x 844.
- Screenshots only; nothing in the app was changed.
