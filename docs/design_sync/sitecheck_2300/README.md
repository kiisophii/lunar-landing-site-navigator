# Site check layout — Chaei 23:00 request

Base: main 2bf6197 (v52); target: integ-1915. Production change is CSS only, scoped to #ls-brief. Detailed comparison, copy, calculations, data, graph axes and selection logic are unchanged.

- Centered Site check container, max 1392px; text remains left-aligned.
- Default two equal columns, 16px gap and 20px padding. Time, terrain/science tables, routes/maps, seasons and validation cards span both columns. Nearby/date and relay/ground stations stay paired. Ordinary odd cards stay half-width.
- <=760px: one column with 16px card padding.
- Relay/local map internal columns stack within their half-width cards; tables scroll internally. No fixed card heights or content clipping.
- Text paragraphs use the body font; numeric values retain their numeric font. Name 24/32px, card title 16/24px, summary 24/30px, KPI 26/32px; compact table rows.
- This section alone compensates for the existing lower shell's asymmetric 16px/60px padding at 701–1499px; shared comparison styles are untouched.

## Checks

Serve web/ on port 8021, then run:

```
python verification/sitecheck_layout_2300.py
python verification/sitecheck_layout_extra.py
```

1440/1280 EN/KR plus 390 EN and 1920 EN: no page errors, page overflow or overflow outside cards; nearby/date and relay/ground-station rows align. 1920 container reaches 1392px. Extra check covers 390 KR, odd half-width card and removing a selected card through the real control without leaving a gap. Captures and machine-readable results are in this folder. Tables may scroll inside their card, as requested.
