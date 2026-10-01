# Local performance laboratory

Run `node scripts/performance/run.mjs --label baseline` once, then use a unique label such as `round-01` after a change. All HTTP requests target an ephemeral loopback listener. The suite never calls Vercel, tunnels or the live user store.

Generate the comparison with `node scripts/performance/compare.mjs logs/performance-20261001 round-01`. It checks identical fixtures and sample counts and saves a table beside the raw data.

The fixed fixture contains 2,480 design layers, 18 additional catalog boards, twelve saved history entries and a flow with 240 linked steps and 478 transitions. Each run copies the original fixture into a fresh directory, so save/history workloads stay comparable. The baseline JSON is immutable. Reports include median/p95 latency, request/response bytes, cold startup, storage size and process RSS. RSS is diagnostic, not an isolated memory comparison.

For browser checks, preserve the baseline build in `logs/performance-20261001/baseline-build` and start `node scripts/performance/serve.mjs` in its own terminal. It listens only on `127.0.0.1:4338`, with synthetic data under `browser-data`. Navigate using IDs from `fixture/fixture.json`. Use the same viewport, scene and gestures each round; separately record load/render readiness, visible DOM size, idle request counts/bytes, gesture saves and request latency. Keep backend and browser measurements separate.

Do not clear user storage, overwrite the baseline or benchmark public origins. Warm latency and cold startup measure different workloads; comparisons should always retain the fixture, sample counts, machine, source commit and whether a browser was idle.

The laboratory build includes a temporary DOM output named `freegma-performance` with browser timings and loopback resource sizes. It is instrumentation for local tests and is never included in the product build. Save its JSON as `browser-baseline-flow.json` and `browser-baseline-design.json`, then use a unique round label for updated runs. Collect browser runs after the backend workload has finished. Preserve the original build and collect the same initial scene at the same viewport; wait until the output covers both the fixed 10–40 second startup window and 3–23 seconds after render readiness. Generate the UI/network table with `node scripts/performance/compare-browser.mjs logs/performance-20261001 round-02`. One render timing per scene is indicative; mounted node and idle request counts are stronger regression signals. A blocked render can suppress polling even after readiness; do not credit that as network savings.

## First measured round · October 1, 2026

On the fixed fixture, median completed design saving fell from 13,355 ms to 5,590 ms, unchanged actions from 15,508 ms to 268 ms, frame previews from 128 ms to 15 ms, and flow saving from 298 ms to 218 ms. The design file after the same action sequence fell from 176.4 MB to 77.8 MB. Unchanged actions no longer write a file or destroy redo history. Atomic fsync, recovery journals, conflict checks and portable undo history remain in use. Full validation passed 161 tests.

The browser code was unchanged in this round. The fitted dashboard still mounts 35,027 DOM nodes, including 32,240 in the layer tree. Single-run dashboard readiness was 8.81 seconds originally and 15.14 seconds in the comparison; this is an unresolved UI bottleneck, not a UI improvement. Flow idle traffic remained 16 requests / 2,406 response bytes in the fixed 30-second window. Do not interpret fewer requests during a blocked initial render as a network optimization. Subsequent rounds should measure steady-state traffic after rendering settles as well as this original startup window.

## Second measured round · October 2, 2026

The hierarchy remains complete in memory, while the sidebar mounts only visible rows with six rows of overscan and retains a focused row during scrolling. Search builds the ancestor lookup once. The fitted 2,480-layer dashboard mounts 3,011 DOM nodes versus 35,027 originally; all 2,480 artwork layers still render. Keyboard End/Home, collapse/expand, rename focus, search after an offscreen selection and focus retention during scrolling were checked in the local lab. Validation passed 166 tests.

This round changes the UI, not the saving backend. The repeated median completed save was 7,231 ms versus the original 13,355 ms; the first optimization round measured 5,590 ms. Report that variation rather than claiming another saving improvement. Round-specific JSON and Markdown reports retain the actual samples. Polling frequency has not yet been optimized.
