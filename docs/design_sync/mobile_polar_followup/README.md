# Mobile comparison and polar site selection

Based on main v45 (`e40961f`).

## Behavior
- Nearby projected sites form a +N button. Its keyboard-accessible list selects each real catalogue site through the existing siteclick flow; Escape closes the list. Clusters split as the projected points separate on zoom.
- Names that collide are suppressed while their dots remain at their actual screen position. Sun/Earth edge chips avoid the new controls.
- At <=899 px, comparison Item is 64 px wide with wrapping. The remaining visible width fits two candidate columns, including wrapping sublabels.
- The mobile minimap occupies a separate row below the globe; desktop sizing restores correctly after resizing the viewport.

## Verification
Run a quiet local web server on port 8021 with a request queue of at least 128, then:

```sh
python pipeline/verify_mobile_polar.py
python pipeline/verify_polar_zoom.py
```

The first script covers 390/768/1440/1280 EN/KR, actual cluster selection and Escape, comparison geometry, console/page errors and document horizontal overflow. The second checks expanded 768-to-390 resizing, desktop size restoration, and real-camera cluster splitting (6000 km to 300 km). Screenshots and JSON are alongside this document. An initial default Python server refused bursts of local requests; the verification server uses a larger accept queue without suppressing application errors.

Independent review identified viewport restoration, canvas resize and dot-position issues; all three were corrected before final verification.

## Integration with #118 and #101
This branch deliberately starts from main v45 as requested. PR118 separately contains the redesigned minimap plus the same mobile placement fix and its review corrections. When combining, retain PR118's minimap implementation and mobile rules; do not replace it with this branch's legacy-main implementation. Retain this branch's globe selection and compact comparison rules when combining with PR101. No index.html or science/data changes.

Final results: all eight viewport/language cases passed with zero console/page errors and no document horizontal overflow. At 390 px the Item column is 64 px, both candidate columns are 151 px, and the second candidate ends at x=378. At 6000 km one polar cluster was visible; at 300 km it split into individual labels (nine visible in the viewport). Desktop 1440/1280 comparison Item width remains 148 px.
