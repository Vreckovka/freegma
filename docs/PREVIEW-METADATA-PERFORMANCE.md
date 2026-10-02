# Frame preview preparation

Frame previews reuse source-frame validation without building source-picker descendant metadata. One borrowed board read replaces two; source pickers and trigger checks keep their full metadata. There is no new result cache. Later source and palette updates remain visible.

The frozen v0.1.63 benchmark uses three validated local documents, three warm-ups and 21 alternating samples per version. Medians measure preview preparation, including subtree cloning and color resolution, excluding storage reads, HTTP transfer, browser rendering and Vercel. Output documents, catalog metadata, errors and input immutability match the frozen implementation.

| Local workload | Baseline | Candidate | Change |
| --- | ---: | ---: | ---: |
| 2480 source layers / 62 preview layers | 2.98 ms | 2.78 ms | -6.7% |
| 2481 source layers / 2481 preview layers | 63.16 ms | 69.23 ms | 9.6% |
| 9921 source layers / 9921 preview layers | 343.15 ms | 338.58 ms | -1.3% |

The acceptance gate requires at least 5% reduction for a small frame in the large document and no median regression above 10% for the full-document previews. These are local measurements rather than end-to-end UI or billing estimates.
