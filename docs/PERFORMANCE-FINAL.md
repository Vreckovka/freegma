# Freegma final optimization report — v0.1.69

Optimization ended at the user's request on 2026-10-02. The final application source is 566d8dbdf3d2de3bd6f77605d45558ddcee3f498. This publication adds the final report without changing the validated application. The release passed 309 tests and a production build. Local and Vercel publication receipts are recorded separately by the final release job.

Baseline is the original measurement or the explicitly identified later snapshot. Improved holds the prior verified result; Current contains only the last optimization's values. Its eight rows are bold. Measurements were collected locally on fixed synthetic fixtures. CPU measurements exclude rendering/disk/network unless their row and detailed method explicitly include them. Encoded body bytes exclude HTTP headers. Token counts use a fixed tokenizer and are estimates, not billing. Size and older performance snapshots are historical measurements, not freshly rerun metrics for every version. Rejected experiments remain identified and were not deployed.

The subsequent project-color save task (DASH-778) was withdrawn when optimization ended. Its native six-state design, linked components and local frozen baseline are preserved. No implementation from that task is included in this release, and its unoptimized baseline is not counted as a performance improvement.

## Full comparison

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Cold startup | 2,941.26 ms | 244.72 ms |  |
| Design read · median | 85.16 ms | 35.79 ms |  |
| Design read · p95 | 166.5 ms | 79.47 ms |  |
| Design read · response | 1,588,721 B | 1,588,740 B |  |
| Unchanged board status · median | 17.68 ms | 13.35 ms |  |
| Unchanged board status · p95 | 85.97 ms | 26.77 ms |  |
| Unchanged board status · response | 151 B | 151 B |  |
| Workspace list · median | 23.17 ms | 16.96 ms |  |
| Workspace list · p95 | 75.65 ms | 33.96 ms |  |
| Workspace list · response | 2,527 B | 2,679 B |  |
| Board list · median | 13.53 ms | 14.22 ms |  |
| Board list · p95 | 22.56 ms | 18.41 ms |  |
| Board list · response | 359 B | 378 B |  |
| Frame preview · median | 127.88 ms | 17.52 ms |  |
| Frame preview · p95 | 172.58 ms | 24.89 ms |  |
| Frame preview · response | 39,696 B | 39,696 B |  |
| Flow read · median | 14.13 ms | 13.44 ms |  |
| Flow read · p95 | 35.6 ms | 60.05 ms |  |
| Flow read · response | 145,998 B | 146,017 B |  |
| Completed design save · median | 13,354.71 ms | 3,040.57 ms |  |
| Completed design save · p95 | 19,208.11 ms | 4,320.16 ms |  |
| Completed design save · response | 1,588,701 B | 1,588,720 B |  |
| Unchanged action · median | 15,507.57 ms | 264.82 ms |  |
| Unchanged action · p95 | 16,384.29 ms | 312.99 ms |  |
| Unchanged action · response | 1,588,702 B | 1,588,721 B |  |
| Completed flow save · median | 297.85 ms | 183.72 ms |  |
| Completed flow save · p95 | 395.25 ms | 404.99 ms |  |
| Completed flow save · response | 145,999 B | 146,018 B |  |
| Design file after fixed save sequence | 176,371,354 B | 3,611,036 B |  |
| Initial design .free (size snapshot) | 74,499,616 B | 1,843,944 B |  |
| Initial flow .free (size snapshot) | 512,146 B | 27,702 B |  |
| Workspace .free manifests (size snapshot) | 5,142 B | 3,868 B |  |
| Portable example .free downloads (size snapshot) | 10,958,295 B | 360,721 B |  |
| Original assets (size snapshot) | 11,917,181 B | 11,917,181 B |  |
| SQLite index/WAL (volatile size snapshot) | 5,680,840 B | 3,147,040 B |  |
| Production editor build (size snapshot) | 534,290 B | 590,551 B |  |
| Product source (size snapshot) | 794,173 B | 1,098,775 B |  |
| README media (size snapshot) | 10,660,592 B | 10,662,375 B |  |
| Development dependencies (size snapshot) | 18,332,241 B | 26,469,478 B |  |
| MCP Tool definitions (token snapshot) | 4,373 tokens | 4,930 tokens |  |
| MCP Selected design frame read (token snapshot) | 1,001,014 tokens | 26,216 tokens |  |
| MCP Design edit receipt (token snapshot) | 1,001,008 tokens | 271 tokens |  |
| MCP Selected flow step read (token snapshot) | 81,804 tokens | 716 tokens |  |
| MCP Flow edit receipt (token snapshot) | 81,804 tokens | 261 tokens |  |
| MCP Workflow total (token snapshot) | 2,170,161 tokens | 32,427 tokens |  |
| MCP workflow payload (token snapshot) | 7,553,829 B | 118,545 B |  |
| Encoded HTTP Large design response (v0.1.37 transfer snapshot) | 1,588,727 B | 56,779 B |  |
| Encoded HTTP Large flow response (v0.1.37 transfer snapshot) | 146,004 B | 10,959 B |  |
| Encoded HTTP Workspace catalog (v0.1.37 transfer snapshot) | 2,575 B | 508 B |  |
| Encoded HTTP Editor JavaScript (v0.1.37 transfer snapshot) | 469,308 B | 160,891 B |  |
| Encoded HTTP Editor CSS (v0.1.37 transfer snapshot) | 73,766 B | 16,682 B |  |
| Encoded HTTP JavaScript revisit (v0.1.37 transfer snapshot) | 469,308 B | 0 B |  |
| Encoded HTTP CSS revisit (v0.1.37 transfer snapshot) | 73,766 B | 0 B |  |
| 1000 steps / 3000 arrows · mounted navigation buttons | 4,000 | 17 |  |
| 1000 steps / 3000 arrows · mounted route groups | 3 000 | 16 |  |
| 1000 steps / 3000 arrows · mounted labels | 3 000 | 0 |  |
| 240 steps / 478 arrows · route rebuild | 3.2327 ms | 0.6484 ms |  |
| 240 steps / 478 arrows · unchanged geometry / selection | 3.2327 ms | 0.0046 ms |  |
| 1000 steps / 3000 arrows · route rebuild | 45.1188 ms | 3.2851 ms |  |
| 1000 steps / 3000 arrows · unchanged geometry / selection | 45.1188 ms | 0.01 ms |  |
| 2,480 layers · React/CSS export CPU · median | 524.3 ms | 114.78 ms |  |
| 2,480 layers · React/CSS export CPU · p95 | 1,104.97 ms | 166.37 ms |  |
| 9,920 layers · React/CSS export CPU · median | 7,789.15 ms | 449 ms |  |
| 9,920 layers · React/CSS export CPU · p95 | 9,234.53 ms | 633.66 ms |  |
| Selected frame · React/CSS export CPU · median | 33.81 ms | 26.23 ms |  |
| Selected frame · React/CSS export CPU · p95 | 50.72 ms | 40.83 ms |  |
| 9,920 layers reversed · React/CSS export CPU · median | 9,790.47 ms | 598.61 ms |  |
| 9,920 layers reversed · React/CSS export CPU · p95 | 10,783.81 ms | 710.79 ms |  |
| Completed Undo · median | 2,637.55 ms | 1,828.96 ms |  |
| Completed Undo · p95 | 2,946.43 ms | 1,914.97 ms |  |
| Completed Redo · median | 2,636.43 ms | 1,826.11 ms |  |
| Completed Redo · p95 | 2,701.49 ms | 1,994.68 ms |  |
| 2,480 layers · edit preparation · median | 74.55 ms | 52.64 ms |  |
| 2,480 layers · edit preparation · p95 | 86.16 ms | 69.52 ms |  |
| 9,920 layers · edit preparation · median | 465.74 ms | 221.8 ms |  |
| 9,920 layers · edit preparation · p95 | 510.55 ms | 332.37 ms |  |
| Component references · 22-board scan · median | 582.71 ms | 25.39 ms |  |
| Component references · 22-board scan · p95 | 1,063.49 ms | 29.2 ms |  |
| Shared master update · 22-board scan · median | 848.9 ms | 48.78 ms |  |
| Shared master update · 22-board scan · p95 | 988.71 ms | 59.34 ms |  |
| Shared master Undo · 22-board scan · median | 771.25 ms | 50.76 ms |  |
| Shared master Undo · 22-board scan · p95 | 864.31 ms | 66.61 ms |  |
| Shared master Redo · 22-board scan · median | 767.63 ms | 53.37 ms |  |
| Shared master Redo · 22-board scan · p95 | 1,041.06 ms | 95.3 ms |  |
| 25-action burst · scheduling CPU · median | 3.84 ms | 1.15 ms |  |
| 25-action burst · scheduling CPU · p95 | 11.08 ms | 1.64 ms |  |
| 200-action burst · scheduling CPU · median | 1,696.38 ms | 56.15 ms |  |
| 200-action burst · scheduling CPU · p95 | 1,917.13 ms | 69.17 ms |  |
| Interrupted board-read deadline · v0.1.53 source snapshot | Unbounded | 20 s per read; up to 2 attempts |  |
| Crowded playground · overlapping frame pairs | 5 | 0 |  |
| playground · automatic calculation | Not available | 921.4 ms |  |
| Lazy Alarm copy · automatic calculation | Not available | 890.93 ms |  |
| 240-step / 478-edge stress flow · automatic calculation | Not available | 13,438.26 ms |  |
| 240 steps / 478 arrows · shared / touching / artwork hits / label overlaps | Not measured | 0 / 0 / 0 / 0 |  |
| 240 steps / 478 arrows · crossings | Not measured | 47 |  |
| 240 steps / 478 arrows · main event-loop maximum lag | Not measured | 93.66 ms |  |
| MCP auto-arrange request · fixed tokenizer | Not available | 40 tokens |  |
| MCP auto-arrange receipt · text plus structured content | Not available | 396 tokens |  |
| playground · paired automatic calculation | 539.7 ms | 486.35 ms |  |
| Lazy Alarm copy · paired automatic calculation | 655.15 ms | 664.27 ms |  |
| 240 steps / 478 edges · paired automatic calculation | 9,094.04 ms | 4,130.18 ms |  |
| Idle connector buttons · 240 frames | 960 | 0 |  |
| Full Flow-layer geometry passes · 10 focus changes | 10 | 0 |  |
| Geometry phase time · 10 focus changes | 250.1 ms | 0 ms |  |
| Label placement · 478 labels · full zoom | 1.058 ms | 0.758 ms |  |
| Label placement · 478 labels · fit zoom | 2.280 ms | 0.861 ms |  |
| Label placement · 3,000 labels · spread | 42.685 ms | 5.756 ms |  |
| Label placement · 3,000 labels · overlapping | 4.792 ms | 4.622 ms |  |
| Frame-bound resolver calls · one geometry pass | 1196 | 240 |  |
| DOM rectangle measurements · one geometry pass | 600 | 120 |  |
| Observed geometry phase · median | 21.20 ms | 20.80 ms |  |
| 2,480 layers · closed editor · 100 selections · median | 22.890 ms | 0.006 ms |  |
| 2,480 layers · closed editor · ancestry reads per render | 8600 | 0 |  |
| 9,920 layers · closed editor · 100 selections · median | 223.031 ms | 0.002 ms |  |
| 9,920 layers · closed editor · ancestry reads per render | 34400 | 0 |  |
| 2,480 layers · 1 design action · batch preparation · median | 58.93 ms | 55.41 ms |  |
| 2,480 layers · 25 design actions · batch preparation · median | 1786.93 ms | 1323.31 ms |  |
| 9,920 layers · 10 design actions · batch preparation · median | 2744.42 ms | 2070.34 ms |  |
| 100 identical locked references · preview requests | 100 | 1 |  |
| 100 identical locked references · preview body bytes | 54,600 B | 546 B |  |
| 2,480 source layers / 62 preview layers · preparation median | 2.98 ms | 1.40 ms |  |
| 2,481 source layers / 2,481 preview layers · preparation median | 63.16 ms | 39.24 ms |  |
| 9,921 source layers / 9,921 preview layers · preparation median | 343.15 ms | 178.39 ms |  |
| Borrowed source board reads per preview | 2 | 1 |  |
| Rich color schematic · preparation median | 0.55 ms | 0.34 ms |  |
| Deep copies of each source layer during preview preparation | 3 | 1 |  |
| 2,480-layer whole-board React export · preparation median | 148.91 ms | 114.84 ms |  |
| Selected component React export · preparation median | 70.72 ms | 7.83 ms |  |
| 9,920-layer whole-board React export · preparation median | 729.22 ms | 544.85 ms |  |
| Rich schematic React export · preparation median | 5.21 ms | 4.25 ms |  |
| Generated swatch React export · preparation median | 2.82 ms | 2.61 ms |  |
| Source-layer copies before React code generation | 3 | 1 |  |
| Selected component within 9,920-layer board · export preparation median | 241.58 ms | 11.92 ms |  |
| Native component export · source layers prepared (2,480-layer board) | 2480 | 62 |  |
| Native component export · source layers prepared (9,920-layer board) | 9920 | 62 |  |
| 2,480 layers · 12 metadata updates | 390.79 ms | Unchanged; rejected candidate 0.03 ms |  |
| 2,480 layers · 12 design edits | 446.09 ms | Unchanged; rejected candidate 511.68 ms |  |
| 2,480 layers · 12 color edits | 447.20 ms | Unchanged; rejected candidate 512.17 ms |  |
| 2,480-layer design · 12 completed edits · preparation median | 984.95 ms | 866.48 ms |  |
| 9,920-layer design · 12 completed edits · preparation median | 4949.94 ms | 4126.41 ms |  |
| 2,480-layer design overlay · 12 symbol moves · preparation median | 1006.48 ms | 815.95 ms |  |
| 750-step / 1,498-edge flow · 12 completed moves · preparation median | 237.62 ms | 214.05 ms |  |
| 2,480-layer design · 12 completed edits · whole-document serialization passes | 37 | 24 |  |
| 9,920-layer design · 12 completed edits · whole-document serialization passes | 37 | 24 |  |
| 2,480-layer design overlay · 12 symbol moves · whole-document serialization passes | 37 | 24 |  |
| 750-step / 1,498-edge flow · 12 completed moves · whole-document serialization passes | 37 | 24 |  |
| **2,480-layer board · 12 initial activations · CPU median** | **477.48 ms** |  | **255.90 ms** |
| **9,920-layer board · 12 initial activations · CPU median** | **2065.10 ms** |  | **756.70 ms** |
| **750-step / 1,498-edge flow · 12 initial activations · CPU median** | **121.96 ms** |  | **42.45 ms** |
| **9,920-layer board · 12 saved-envelope acceptances · CPU median** | **2332.74 ms** |  | **1093.44 ms** |
| **2,480-layer board · 12 initial activations · envelope serialization passes** | **24** |  | **12** |
| **9,920-layer board · 12 initial activations · envelope serialization passes** | **24** |  | **12** |
| **750-step / 1,498-edge flow · 12 initial activations · envelope serialization passes** | **24** |  | **12** |
| **9,920-layer board · 12 saved-envelope acceptances · envelope serialization passes** | **24** |  | **12** |

## Measurement methods and paired controls

Local-only performance comparison · round-49

Baseline: 97814a3ba5a4895689deecc10f45c97de173aa6a. Current: working-tree. Fixed fixture and sample counts verified. Negative percentages indicate reductions. File-size rows marked “size snapshot” use the separately captured 0.1.31 baseline because they were absent from the original 0.1.26 run. MCP rows use the frozen local v0.1.35 snapshot and fixed o200k_base tokenizer; text plus structured content is counted, so client rendering and actual billing may differ. They compare the same task using full board reads/receipts before and scoped reads/compact receipts after. HTTP body bytes exclude headers; browser idle traffic is recorded separately. Local absolute file-path metadata varies with the benchmark output directory; tiny response-size differences from those paths do not represent design-content growth. Warm reads and cold startup are separate workloads.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Cold startup | 2,941.26 ms | 244.72 ms |  |
| Design read · median | 85.16 ms | 35.79 ms |  |
| Design read · p95 | 166.5 ms | 79.47 ms |  |
| Design read · response | 1,588,721 B | 1,588,740 B |  |
| Unchanged board status · median | 17.68 ms | 13.35 ms |  |
| Unchanged board status · p95 | 85.97 ms | 26.77 ms |  |
| Unchanged board status · response | 151 B | 151 B |  |
| Workspace list · median | 23.17 ms | 16.96 ms |  |
| Workspace list · p95 | 75.65 ms | 33.96 ms |  |
| Workspace list · response | 2,527 B | 2,679 B |  |
| Board list · median | 13.53 ms | 14.22 ms |  |
| Board list · p95 | 22.56 ms | 18.41 ms |  |
| Board list · response | 359 B | 378 B |  |
| Frame preview · median | 127.88 ms | 17.52 ms |  |
| Frame preview · p95 | 172.58 ms | 24.89 ms |  |
| Frame preview · response | 39,696 B | 39,696 B |  |
| Flow read · median | 14.13 ms | 13.44 ms |  |
| Flow read · p95 | 35.6 ms | 60.05 ms |  |
| Flow read · response | 145,998 B | 146,017 B |  |
| Completed design save · median | 13,354.71 ms | 3,040.57 ms |  |
| Completed design save · p95 | 19,208.11 ms | 4,320.16 ms |  |
| Completed design save · response | 1,588,701 B | 1,588,720 B |  |
| Unchanged action · median | 15,507.57 ms | 264.82 ms |  |
| Unchanged action · p95 | 16,384.29 ms | 312.99 ms |  |
| Unchanged action · response | 1,588,702 B | 1,588,721 B |  |
| Completed flow save · median | 297.85 ms | 183.72 ms |  |
| Completed flow save · p95 | 395.25 ms | 404.99 ms |  |
| Completed flow save · response | 145,999 B | 146,018 B |  |
| Design file after fixed save sequence | 176,371,354 B | 3,611,036 B |  |
| Initial design .free (size snapshot) | 74,499,616 B | 1,843,944 B |  |
| Initial flow .free (size snapshot) | 512,146 B | 27,702 B |  |
| Workspace .free manifests (size snapshot) | 5,142 B | 3,868 B |  |
| Portable example .free downloads (size snapshot) | 10,958,295 B | 360,721 B |  |
| Original assets (size snapshot) | 11,917,181 B | 11,917,181 B |  |
| SQLite index/WAL (volatile size snapshot) | 5,680,840 B | 3,147,040 B |  |
| Production editor build (size snapshot) | 534,290 B | 590,551 B |  |
| Product source (size snapshot) | 794,173 B | 1,098,775 B |  |
| README media (size snapshot) | 10,660,592 B | 10,662,375 B |  |
| Development dependencies (size snapshot) | 18,332,241 B | 26,469,478 B |  |
| MCP Tool definitions (token snapshot) | 4,373 tokens | 4,930 tokens |  |
| MCP Selected design frame read (token snapshot) | 1,001,014 tokens | 26,216 tokens |  |
| MCP Design edit receipt (token snapshot) | 1,001,008 tokens | 271 tokens |  |
| MCP Selected flow step read (token snapshot) | 81,804 tokens | 716 tokens |  |
| MCP Flow edit receipt (token snapshot) | 81,804 tokens | 261 tokens |  |
| MCP Workflow total (token snapshot) | 2,170,161 tokens | 32,427 tokens |  |
| MCP workflow payload (token snapshot) | 7,553,829 B | 118,545 B |  |
| Encoded HTTP Large design response (v0.1.37 transfer snapshot) | 1,588,727 B | 56,779 B |  |
| Encoded HTTP Large flow response (v0.1.37 transfer snapshot) | 146,004 B | 10,959 B |  |
| Encoded HTTP Workspace catalog (v0.1.37 transfer snapshot) | 2,575 B | 508 B |  |
| Encoded HTTP Editor JavaScript (v0.1.37 transfer snapshot) | 469,308 B | 160,891 B |  |
| Encoded HTTP Editor CSS (v0.1.37 transfer snapshot) | 73,766 B | 16,682 B |  |
| Encoded HTTP JavaScript revisit (v0.1.37 transfer snapshot) | 469,308 B | 0 B |  |
| Encoded HTTP CSS revisit (v0.1.37 transfer snapshot) | 73,766 B | 0 B |  |

Baseline is the frozen original capture. Improved is the previous verified result. Current is populated only for metrics affected by this round; those rows are bold. Unrelated benchmark fluctuations remain in the raw measurement JSON.
Local flow-sidebar DOM comparison · v0.1.45

Separate frozen v0.1.44 browser snapshot. Same isolated 1000-step / 3000-transition board, 1280×720 browser viewport, 230×658 sidebar and initial scroll position. Current count matches the window function. Original first-row position and height, mounted arrows and labels are unchanged. DOM counts measure drawing work, not browser latency or Vercel usage.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 1000 steps / 3000 arrows · mounted navigation buttons | 4,000 | 17 |  |

Previous verified flow results (unchanged by sidebar virtualization):

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 1000 steps / 3000 arrows · mounted route groups | 3 000 | 16 |  |
| 1000 steps / 3000 arrows · mounted labels | 3 000 | 0 |  |
| 240 steps / 478 arrows · route rebuild | 3.2327 ms | 0.6484 ms |  |
| 240 steps / 478 arrows · unchanged geometry / selection | 3.2327 ms | 0.0046 ms |  |
| 1000 steps / 3000 arrows · route rebuild | 45.1188 ms | 3.2851 ms |  |
| 1000 steps / 3000 arrows · unchanged geometry / selection | 45.1188 ms | 0.01 ms |  |
| 2,480 layers · React/CSS export CPU · median | 524.3 ms | 114.78 ms |  |
| 2,480 layers · React/CSS export CPU · p95 | 1,104.97 ms | 166.37 ms |  |
| 9,920 layers · React/CSS export CPU · median | 7,789.15 ms | 449 ms |  |
| 9,920 layers · React/CSS export CPU · p95 | 9,234.53 ms | 633.66 ms |  |
| Selected frame · React/CSS export CPU · median | 33.81 ms | 26.23 ms |  |
| Selected frame · React/CSS export CPU · p95 | 50.72 ms | 40.83 ms |  |
| 9,920 layers reversed · React/CSS export CPU · median | 9,790.47 ms | 598.61 ms |  |
| 9,920 layers reversed · React/CSS export CPU · p95 | 10,783.81 ms | 710.79 ms |  |

Local Undo/Redo store comparison · six Undo then six Redo actions. Separate frozen v0.1.48 baseline, 2,480 layers and 12 history entries, warm board. Each action publishes a durable local file. Browser latency and Vercel are not measured. Full history and document digests match. The rejected export-style-reuse candidate was not deployed and does not replace Improved values.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Completed Undo · median | 2,637.55 ms | 1,828.96 ms |  |
| Completed Undo · p95 | 2,946.43 ms | 1,914.97 ms |  |
| Completed Redo · median | 2,636.43 ms | 1,826.11 ms |  |
| Completed Redo · p95 | 2,701.49 ms | 1,994.68 ms |  |

Local single-edit preparation CPU comparison · separate frozen v0.1.49 baseline. Same edit and exact result hashes, three warmups and 25/15 measured samples for 2,480/9,920 layers. CPU timing excludes file saving and browser latency. Full HTTP completed-save metrics above use the original fixed fixture and counts. All tests and benchmarks are local; no Vercel load.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 2,480 layers · edit preparation · median | 74.55 ms | 52.64 ms |  |
| 2,480 layers · edit preparation · p95 | 86.16 ms | 69.52 ms |  |
| 9,920 layers · edit preparation · median | 465.74 ms | 221.8 ms |  |
| 9,920 layers · edit preparation · p95 | 510.55 ms | 332.37 ms |  |

Earlier change: validated read-only component scans. Separate frozen v0.1.50 component baseline; 22 boards, including the original 2,480-layer dashboard with 12 history entries, a two-layer master, and one live instance. Ten warm reference inspections and six master save/Undo/Redo samples per operation. Exact reference metadata, untouched large-board history, final master/instance documents and normalized master history hashes match. The rejected validation-depth candidate (round-28) was not deployed and is excluded from Improved. Original HTTP benchmark round-29 remains available as raw evidence; unrelated timing fluctuations are not changes from this implementation. All tests and benchmarks local; no Vercel load.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Component references · 22-board scan · median | 582.71 ms | 25.39 ms |  |
| Component references · 22-board scan · p95 | 1,063.49 ms | 29.2 ms |  |
| Shared master update · 22-board scan · median | 848.9 ms | 48.78 ms |  |
| Shared master update · 22-board scan · p95 | 988.71 ms | 59.34 ms |  |
| Shared master Undo · 22-board scan · median | 771.25 ms | 50.76 ms |  |
| Shared master Undo · 22-board scan · p95 | 864.31 ms | 66.61 ms |  |
| Shared master Redo · 22-board scan · median | 767.63 ms | 53.37 ms |  |
| Shared master Redo · 22-board scan · p95 | 1,041.06 ms | 95.3 ms |  |

Earlier change: reuse owned completed-action byte sizes while scheduling saves. Separate frozen v0.1.51 client-queue baseline with 25 smaller / 200 larger synthetic actions; three warmups and 25/15 samples. Timing is local enqueue/scheduling CPU and excludes rendering, flushing, disk and network. Exact outgoing batch hashes, final documents, action counts, revision sequences and wire bytes match. The original local HTTP round-30 remains raw evidence; its unrelated timing fluctuations are not attributed to this client-only change. No Vercel tests or deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 25-action burst · scheduling CPU · median | 3.84 ms | 1.15 ms |  |
| 25-action burst · scheduling CPU · p95 | 11.08 ms | 1.64 ms |  |
| 200-action burst · scheduling CPU · median | 1,696.38 ms | 56.15 ms |  |
| 200-action burst · scheduling CPU · p95 | 1,917.13 ms | 69.17 ms |  |

Earlier update: user-requested draggable boards/layers divider. Native design first, browser proof verifies pointer drag, keyboard limits, reset, reload persistence and sidebar collapse. Pointer movement changes only the sidebar DOM height; completed preference changes write local browser storage. No board saves are introduced. This is a feature addition; bundle/source costs above are reported honestly. Original local HTTP round-31 remains raw evidence; unrelated timing changes are not attributed to this feature. No Vercel testing or deployment.

Earlier change: bounded board-read recovery. This is a reliability change, not a claim of faster normal reads. Header and body deadlines are each covered by one 20-second read deadline; at most one automatic transient retry is allowed per uncached board load. Local fault-server proof injected two 503 failures, then the same URL recovered through Retry loading and reloaded correctly with all 2,480 layers. No board writes occurred. Existing cache/draft safety tests remain intact. The original stuck public tab could not be inspected because browser controls timed out; fresh public reload succeeded, so its exact root cause remains unconfirmed. Local tests and benchmarks only; no Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Interrupted board-read deadline · v0.1.53 source snapshot | Unbounded | 20 s per read; up to 2 attempts |  |

Auto arrange flow · v0.1.55. New capability; no algorithm existed in the original baseline. Timings below are single local geometry calculations on fixed isolated copies, excluding saves except the MCP receipt row. The main event-loop sampler runs during both the first and determinism-check calculations; maximum lag is not browser latency. Repeated arrangement was verified not to drift. No public/Vercel benchmark was used. ELK stays in the server worker; its installed dependency adds disk space, while the editor bundle only adds button/dialog code. Unaffected timing fluctuations remain in round-49.json. Source footprint uses the final size capture after live-reference safety validation.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Crowded playground · overlapping frame pairs | 5 | 0 |  |
| playground · automatic calculation | Not available | 921.4 ms |  |
| Lazy Alarm copy · automatic calculation | Not available | 890.93 ms |  |
| 240-step / 478-edge stress flow · automatic calculation | Not available | 13,438.26 ms |  |
| 240 steps / 478 arrows · shared / touching / artwork hits / label overlaps | Not measured | 0 / 0 / 0 / 0 |  |
| 240 steps / 478 arrows · crossings | Not measured | 47 |  |
| 240 steps / 478 arrows · main event-loop maximum lag | Not measured | 93.66 ms |  |
| MCP auto-arrange request · fixed tokenizer | Not available | 40 tokens |  |
| MCP auto-arrange receipt · text plus structured content | Not available | 396 tokens |  |

A captured pre-cache candidate took 17,295.11 ms on the same 240-step graph; the retained cached router took 13,438.26 ms. These single samples show the observed change, not a statistical speedup. The new tool definition adds 170 tokens to the previous tool catalog. Tokenizer estimates are not billing. Dense diagrams may retain crossings; a timeout or failed separation check leaves the board unchanged. All changes save atomically and can be undone in one step.

Router calculation · paired frozen v0.1.55 baseline. Five worker calculations per version and fixture, alternating order. Median includes worker startup. Each plan digest includes every position, anchor, pivot, label, extent and quality count; all plans match exactly. Separately, 24 reachable and 24 blocked seeded router cases retain identical routes or errors. These local calculations exclude saving and browser latency. Unrelated benchmark fluctuations remain in raw round-49.json. No Vercel testing or deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| playground · paired automatic calculation | 539.7 ms | 486.35 ms |  |
| Lazy Alarm copy · paired automatic calculation | 655.15 ms | 664.27 ms |  |
| 240 steps / 478 edges · paired automatic calculation | 9,094.04 ms | 4,130.18 ms |  |

Earlier change: index row/column obstacle candidates only on busy routes, and use numeric keys for adjacent grid segments. Cache lifetime remains one route calculation, so no board or source state is reused between actions. Geometry and safety thresholds are unchanged. Small-board startup timing is reported even where it does not improve.

Earlier change: contextual connector visibility, measured against the immediately preceding v0.1.56 source on the same 240-owner canvas. Counts come from the actual shared React connector output; this measures markup, not browser frame time. Browser interaction checks also cover native design and live-reference flow canvases. Hover/focus is local UI state with no save or network action.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Idle connector buttons · 240 frames | 960 | 0 |  |

A single focused frame renders four dots; one focused arrow renders only its two endpoint frames (eight dots). While drafting, unrelated selection/focus is excluded and only source/target ports remain.

Earlier change: reuse Flow-layer geometry across highlight/focus and native layer selection. The isolated 240-frame, 478-transition browser fixture focused ten different arrows through the same highlight handler used by hover. All SVG paths and label positions matched exactly. Highlighted source, trigger and target remained visible. Selection performed no extra geometry pass; zoom, native frame drag and endpoint edit all correctly recalculated paths. Timings below measure the cumulative synchronous geometry phase for these ten focus changes, not total interaction latency or startup. One browser sequence per version; count-based avoidance is deterministic, timings are machine-specific.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Full Flow-layer geometry passes · 10 focus changes | 10 | 0 |  |
| Geometry phase time · 10 focus changes | 250.1 ms | 0 ms |  |


Earlier change: use a per-pass spatial label lookup on spread-out flows, preserving the original early-exit scan for small and tightly clustered labels. All candidate ordering, collision thresholds and fallback positions are unchanged. Local paired medians use 21 alternating samples per version, each averaging ten placements after warm-up; these measure label placement only, excluding path construction, rendering, network and saving. Exact placements match for all fixtures; three additional tests cover 4,000 seeded entries, strict boundaries and expansion from dense to spread labels. Unaffected metrics remain in raw round-49.json; no public performance tests.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Label placement · 478 labels · full zoom | 1.058 ms | 0.758 ms |  |
| Label placement · 478 labels · fit zoom | 2.280 ms | 0.861 ms |  |
| Label placement · 3,000 labels · spread | 42.685 ms | 5.756 ms |  |
| Label placement · 3,000 labels · overlapping | 4.792 ms | 4.622 ms |  |


Earlier change: measure each frame once within a Flow-layer geometry pass, then reuse its bounds for incident arrows. This cache is discarded before the next pass. The local 240-frame, 478-transition browser fixture retains all 122 visible paths and 191 label positions at 25% zoom. Changing frame position refreshed the routes and Undo restored the original path. Nine zoom cycles per version were recorded; the first two are warm-up, leaving seven observations. Counts are deterministic for this view. Observed geometry-phase timings are sequential browser samples and the small timing difference is not a statistical or total UI latency claim. No public performance tests or new Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Frame-bound resolver calls · one geometry pass | 1196 | 240 |  |
| DOM rectangle measurements · one geometry pass | 600 | 120 |  |
| Observed geometry phase · median | 21.20 ms | 20.80 ms |  |


Earlier change: skip native trigger-node selection while the transition editor is closed and memoize choices while nodes, source and linked-source elements are unchanged. Exact source membership and ordering are preserved for open-editor fixtures. The scoped local benchmark executes the original selection expression and the guarded selector 100 times per sample, with three warm-ups and 21 samples per fixture. This measures only selector CPU; it excludes React reconciliation, drawing, saves and network. Open-source control measurements remain in raw JSON; memoization benefits are not claimed from that control. No public performance testing or new Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 2,480 layers · closed editor · 100 selections · median | 22.890 ms | 0.006 ms |  |
| 2,480 layers · closed editor · ancestry reads per render | 8600 | 0 |  |
| 9,920 layers · closed editor · 100 selections · median | 223.031 ms | 0.002 ms |  |
| 9,920 layers · closed editor · ancestry reads per render | 34400 | 0 |  |


Earlier change: batchDocument now guarantees a validated document. Design actions already validate every operation through lockedOperations; flow/overlay actions validate once inside batchDocument. The handler reuses this result, keeping asset validation, component locks, intermediate-operation rejection and transactional rollback. Nine local samples per fixture follow two warm-ups, comparing frozen v0.1.61 action preparation with the candidate; all resulting document digests match. This measures preparation CPU only, excluding assets, history encoding, file writes, UI and network. Unrelated measurements remain raw evidence; no public performance tests or new Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 2,480 layers · 1 design action · batch preparation · median | 58.93 ms | 55.41 ms |  |
| 2,480 layers · 25 design actions · batch preparation · median | 1786.93 ms | 1323.31 ms |  |
| 9,920 layers · 10 design actions · batch preparation · median | 2744.42 ms | 2070.34 ms |  |


Earlier change: coalesce concurrent preview reads for the same source frame and API client. Pending results are evicted on success or failure; subsequent reads fetch fresh source data. Separate clients, boards and frames remain independent. Local browser baseline and candidate each mounted 100 locked references to the same existing master; all initial geometry, styles and text match. Editing the master refreshed all 100 references through one additional preview read. Counts measure actual encoded HTTP response bodies from the isolated local servers, excluding headers and status polling; this single mount comparison makes no browser-latency or billing claim. Four focused tests cover freshness, client/source isolation and asynchronous/synchronous failures. No public performance tests or new Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 100 identical locked references · preview requests | 100 | 1 |  |
| 100 identical locked references · preview body bytes | 54,600 B | 546 B |  |


Earlier change: skip discarded descendant picker metadata when preparing a frame preview, reusing the same source guards and one borrowed board read. Source catalogs and trigger validation remain complete. Frozen v0.1.63 and candidate alternate across 21 local samples per version after three warm-ups each. Preview documents, source metadata, guard outcomes and untouched input digests match. These rows measure warm preparation CPU, including cloning/color resolution, excluding storage reads, HTTP, UI and Vercel. No new result cache, public performance tests or Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 2,480 source layers / 62 preview layers · preparation median | 2.98 ms | 1.40 ms |  |
| 2,481 source layers / 2,481 preview layers · preparation median | 63.16 ms | 39.24 ms |  |
| 9,921 source layers / 9,921 preview layers · preparation median | 343.15 ms | 178.39 ms |  |
| Borrowed source board reads per preview | 2 | 1 |  |


Earlier change: apply semantic colors and generate schematic labels on the independently owned subtree copy, removing two subsequent deep copies. Public color APIs continue cloning inputs. Nested vector/CSS styles, literal fallbacks, schematic labels, saved masters, separate previews and combined color/design Undo remain intact. Four frozen v0.1.64 fixtures alternate across 21 samples per version after three warm-ups each. Their documents, catalogs, guard outcomes and unchanged source/palette digests match. Existing table baselines retain the historical timings; compare the paired frozen v0.1.64 measurements below to attribute this round. These are warm preparation CPU timings, excluding storage reads, HTTP, UI and Vercel. No public performance tests or new Vercel deployment.

Paired local calibration for this round:

| Workload | Frozen v0.1.64 | Candidate | Change |
| --- | ---: | ---: | ---: |
| 2480_screen | 2.90 ms | 1.40 ms | -51.9% |
| 2481_whole | 117.27 ms | 39.24 ms | -66.5% |
| 9921_whole | 488.73 ms | 178.39 ms | -63.5% |
| rich_schematic | 0.55 ms | 0.34 ms | -38.0% |

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Rich color schematic · preparation median | 0.55 ms | 0.34 ms |  |
| Deep copies of each source layer during preview preparation | 3 | 1 |  |


Earlier change: React export resolves semantic colors and generates schematics on the independent getBoard document, removing two further deep copies. Public color APIs, generated swatch selection, filenames and HTTP/MCP metadata remain unchanged. Frozen v0.1.65 and candidate alternate across 15 local samples per version after three warm-ups each. Complete replies and byte counts match after normalizing only the generated version comment. Frozen code snapshots preserve rich-board/native-root/generated-swatch JSX/CSS. This measures actual store.export preparation CPU, including retrieval, component/palette lookup and generation; excludes HTTP, UI and Vercel. No public performance tests or new Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 2,480-layer whole-board React export · preparation median | 148.91 ms | 114.84 ms |  |
| Selected component React export · preparation median | 70.72 ms | 7.83 ms |  |
| 9,920-layer whole-board React export · preparation median | 729.22 ms | 544.85 ms |  |
| Rich schematic React export · preparation median | 5.21 ms | 4.25 ms |  |
| Generated swatch React export · preparation median | 2.82 ms | 2.61 ms |  |
| Source-layer copies before React code generation | 3 | 1 |  |


Earlier change: scope native React export preparation to the independently copied selected subtree. Whole-board and generated-node fallback exports retain full-document preparation. Nested positions, flex/percentage styling, selected assets, schematic output, filenames, fresh inherited palettes, revision/task metadata and HTTP/MCP replies remain compatible. Frozen v0.1.66 and candidate alternate across 15 local samples after three warm-ups each; complete replies and bytes match after normalizing only the generated version comment. No public performance tests or new Vercel deployment. Existing Baseline/Improved columns retain historical measurements; paired calibration below attributes this round. Control timing changes are not claimed as improvements.

| Workload | Frozen v0.1.66 | Candidate | Change |
| --- | ---: | ---: | ---: |
| design2480 | 107.62 ms | 109.49 ms | 1.7% |
| selectedComponent | 47.58 ms | 7.83 ms | -83.5% |
| design9920 | 729.83 ms | 704.03 ms | -3.5% |
| richSchematic | 4.16 ms | 4.25 ms | 2.1% |
| generatedSwatch | 1.89 ms | 1.85 ms | -2.1% |
| selectedMaximum | 241.58 ms | 11.92 ms | -95.1% |

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| Selected component within 9,920-layer board · export preparation median | 241.58 ms | 11.92 ms |  |
| Native component export · source layers prepared (2,480-layer board) | 2480 | 62 |  |
| Native component export · source layers prepared (9,920-layer board) | 9920 | 62 |  |


Earlier experiment: independent-axis style preparation. All three candidates were rejected and the exact released v0.1.67 sizing implementation restored. No new application release or Vercel deployment. The 12 focused checks, including 1,728 frozen layout combinations and prior export/HTTP/MCP compatibility, passed for each candidate. Full tests/build/release stages did not run because performance gates stopped the jobs first. Rejected patches and raw measurements remain in logs/axis-styles-20261002 and attempt-02/attempt-03. No candidate values are promoted to Improved; Current columns above are empty because the runtime remains unchanged.

The third candidate alternated against frozen v0.1.67 over 15 samples/version after three warm-ups. Style rows measure 99,200 calls; export rows measure warm store.export preparation, excluding HTTP, actual UI rendering and Vercel. Output and ordered style digests match. The microbenchmark gain did not justify a slower real export control.

| Measurement | Frozen v0.1.67 | Rejected candidate | Decision |
| --- | ---: | ---: | --- |
| Independent-axis styles · CPU median | 122.91 ms | 94.66 ms | 23.0% faster; insufficient alone |
| Rich schematic export · CPU median | 4.96 ms | 5.64 ms | 13.8% slower; exceeds 10% gate |


Earlier experiment: canvas resolution invalidation. The candidate skipped metadata-only resolution and passed native browser freshness checks, but was rejected after both local paired comparisons failed the predeclared real-edit control limits. v0.1.67 is restored byte for byte. No new deployment. The second comparison used two warmups per workload, seven alternating samples and garbage collection outside the timed region. Exact output digests matched; control regressions remained. Full tests/build did not run because the performance gate stopped validation. Neither candidate timing is promoted to Improved; the Current columns remain empty because the released implementation is unchanged.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 2,480 layers · 12 metadata updates | 390.79 ms | Unchanged; rejected candidate 0.03 ms |  |
| 2,480 layers · 12 design edits | 446.09 ms | Unchanged; rejected candidate 511.68 ms |  |
| 2,480 layers · 12 color edits | 447.20 ms | Unchanged; rejected candidate 512.17 ms |  |


Earlier change: lend the JSON strings already produced by completed-edit no-op comparison to bounded Undo snapshot sizing. Keep only numeric UTF-8 weights and immutable document references, with no retained JSON string cache. Exact documents, request digests, request byte counts, batch counts and memory/expiry behavior are preserved. Paired local CPU tests alternate v0.1.67 and candidate across eleven samples each after two workload warmups. CPU includes actual optimistic apply/validation, comparison, history and scheduling for twelve completed edits. No-op and Undo/Redo controls are reported separately. Serialization instrumentation is an untimed pass; its byte count is temporary encoding work, not file size or network traffic. The first controller reached its time limit before all samples completed. Finished sample files and the 21 focused safety checks were retained; only missing samples continued, after verifying source fingerprints. Sample count, warmups, output checks and acceptance limits stayed unchanged. No Vercel tests or new deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| 2,480-layer design · 12 completed edits · preparation median | 984.95 ms | 866.48 ms |  |
| 9,920-layer design · 12 completed edits · preparation median | 4949.94 ms | 4126.41 ms |  |
| 2,480-layer design overlay · 12 symbol moves · preparation median | 1006.48 ms | 815.95 ms |  |
| 750-step / 1,498-edge flow · 12 completed moves · preparation median | 237.62 ms | 214.05 ms |  |
| 2,480-layer design · 12 completed edits · whole-document serialization passes | 37 | 24 |  |
| 9,920-layer design · 12 completed edits · whole-document serialization passes | 37 | 24 |  |
| 2,480-layer design overlay · 12 symbol moves · whole-document serialization passes | 37 | 24 |  |
| 750-step / 1,498-edge flow · 12 completed moves · whole-document serialization passes | 37 | 24 |  |

| Control | Frozen v0.1.67 | Candidate | Change |
| --- | ---: | ---: | ---: |
| noOp9920 | 3843.31 ms | 3783.97 ms | -1.5% |
| history2480 | 413.75 ms | 389.53 ms | -5.9% |


Latest change: coalesce whole-envelope byte accounting within one completed board acceptance. Initial entry setup and synchronous saved-state callbacks no longer repeat the final sizing pass. A nesting counter covers reentrant acceptance. Ordinary acknowledgements and every subsequent acceptance still measure freshly; no retained JSON/weight cache is introduced. Limits and dirty-board acknowledgement isolation are preserved. Nine alternating local samples per version, three warmups per workload. These are navigation-cache CPU measurements, excluding rendering, disk and HTTP. Byte counts describe temporary encoding work, not saved file sizes or network traffic. Full safety tests and private build passed; local release only, no new Vercel deployment.

| Measurement | Baseline | Improved | Current |
| --- | ---: | ---: | ---: |
| **2,480-layer board · 12 initial activations · CPU median** | **477.48 ms** |  | **255.90 ms** |
| **9,920-layer board · 12 initial activations · CPU median** | **2065.10 ms** |  | **756.70 ms** |
| **750-step / 1,498-edge flow · 12 initial activations · CPU median** | **121.96 ms** |  | **42.45 ms** |
| **9,920-layer board · 12 saved-envelope acceptances · CPU median** | **2332.74 ms** |  | **1093.44 ms** |
| **2,480-layer board · 12 initial activations · envelope serialization passes** | **24** |  | **12** |
| **9,920-layer board · 12 initial activations · envelope serialization passes** | **24** |  | **12** |
| **750-step / 1,498-edge flow · 12 initial activations · envelope serialization passes** | **24** |  | **12** |
| **9,920-layer board · 12 saved-envelope acceptances · envelope serialization passes** | **24** |  | **12** |

| Control | Frozen v0.1.68 | Candidate | Change |
| --- | ---: | ---: | ---: |
| cleanReplace9920 | 1170.693 ms | 1198.584 ms | 2.4% |
| sameSnapshot9920 | 0.042 ms | 0.039 ms | -6.7% |
| ack9920 | 91.954 ms | 87.328 ms | -5.0% |

