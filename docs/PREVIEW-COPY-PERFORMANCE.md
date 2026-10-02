# Owned preview transforms

Frame previews begin with the independently cloned subtree. Color resolution and generated schematic labels now reuse this private document instead of making two additional deep copies. The explicitly named owned helpers mutate only caller-owned scratch documents. Existing public color APIs retain their input-cloning behavior. There is no result cache. Later source and parent-palette changes remain visible, and preview consumers cannot mutate the saved master or another preview.

Frozen v0.1.64 and candidate alternate across 21 local samples per version after three warm-ups each. The fixtures include 62/2481/9921-layer previews and a color schematic with vector-path and CSS-gradient bindings. Output documents, source catalogs, error outcomes and untouched source/palette digests match. Medians cover preview preparation, excluding storage reads, network, UI rendering and Vercel.

| Workload | Frozen v0.1.64 | Candidate | Change |
| --- | ---: | ---: | ---: |
| 2480_screen / 62 rendered layers | 2.90 ms | 1.40 ms | -51.9% |
| 2481_whole / 2481 rendered layers | 117.27 ms | 39.24 ms | -66.5% |
| 9921_whole / 9921 rendered layers | 488.73 ms | 178.39 ms | -63.5% |
| rich_schematic / 25 rendered layers | 0.55 ms | 0.34 ms | -38.0% |

Acceptance requires at least 10% improvement for each larger preview and the 62-layer preview, with no rich-schematic median regression above 5%. Timings from separate historical runs can differ; use these alternating pairs to assess this change.
