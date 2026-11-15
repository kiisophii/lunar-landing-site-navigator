# Detail visibility follow-up

Base: started on main v45 e40961f; merged main v46 758c15e when it landed during this task. The current comparison table, icons, fixed elevation grid, map button and newly available PSR/obstacle analyses are retained.

## Changes
- The detailed table's See details action uses a 10% white fill, 28% border and font weight 600. Existing focus/navigation and map actions are preserved.
- Elevation charts have hourly Sunlit (yellow) and Earth in view (blue hatch) rows. Curves and the 2.5 px selected-time line use the same hourly-bin centers as the strips. No power/communication claims.
- Site check lists available analysis items. Missing analysis products move into a muted, keyboard-accessible disclosure with the requested count text and an explicit no-data explanation (missing data does not establish that an analysis is unnecessary). Global station data stays available even for terrain-pending user points.
- Relay and station cards include a separate chronological gray-hatched Earth-hidden-by-terrain strip. Relay paths may remain available during those direct-view gaps. Station aggregate bars are explicitly distinguished from chronological strips; station visibility requires Moon elevation >=10 degrees as before.
- Missing relay files are no longer requested for non-indexed user points. Small-screen period text wraps instead of widening the document.

## Verification
Serve web/ on port 8021, then run:

```sh
python pipeline/verify_detail_visibility.py
python pipeline/verify_detail_pending.py
```

Six 1440/1280/390 EN/KR cases check zero page/console errors and no document horizontal overflow, real SVG run-hour totals against existing hourBits, both gray strips against Earth-hidden hours, hidden-item disclosure and graph rendering. The pending-point test uses a test-only point with a pending horizon (never displayed as a real computed result) to verify only the independent station analysis remains available, and verifies selected-time alignment at hour +100. Production datasets/scientific computations are unchanged. Screenshots and JSON evidence are in this directory.

Independent review corrections: distinguish aggregate station hours from chronological gray hatching, and retain the global station data for terrain-pending sites.

The v46 verification exercises the new detail-table charts, preserves its map action, and checks missing-item disclosure on Apollo 17 (polar-only products are absent). The user-point fixture also verifies no request is made for a nonexistent precomputed terrain file.

Integration repair: closed an unterminated 1280–1439 px media rule inherited from v46 layout.css. Without it, subsequent minimap and detail styles were incorrectly limited to that breakpoint. Final checks additionally assert the computed primary-button fill, flex legend and separation between legend and readout. Tests use the supported nointro=1 URL to capture the detail UI directly.
