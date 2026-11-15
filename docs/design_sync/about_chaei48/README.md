# About alignment — Chaei48

Based on integ-1915 at 6056b17. Only web/css/about_layout.css changes production behavior. About copy, hero module, 30% band, shared stylesheet and index.html are unchanged.

- Shared rounded 4vw gutter (58/51/16 px at 1440/1280/390), with 4vw fallback.
- Desktop section columns: floor(width / 3 - 16px), 24 px gap, remaining content. Existing mobile stacking preserved.
- Shared 1 px rgba(255,255,255,.08) separators/borders; first section has no top rule.
- 30 px/600/44 px h2 for every section including CTA; role-specific integer line heights from reference.md.
- Same-row cards stretch equally. CSS subgrid aligns body starts across wrapped titles; flex is retained as the fallback.

## Verification
Serve web/ on http://127.0.0.1:8021 and run `python pipeline/verify_about_chaei48.py` (Python Playwright). The script serves baseline CSS from 6056b17 for before/after checks.

All six 1440/1280/390 EN/KR cases pass: zero page/console errors, no document or internal content horizontal overflow (including all disclosure panels open), unchanged About text and hero height, shared hero/body left edge, exact gutters and headings, uniform separator colors, equal same-row card heights and aligned card body starts. Screenshots and checks.json are alongside this document.
