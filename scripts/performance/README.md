# Local performance laboratory

Run `node scripts/performance/run.mjs --label baseline` once, then use a unique label such as `round-01` after a change. All HTTP requests target an ephemeral loopback listener. The suite never calls Vercel, tunnels or the live user store.

Generate the comparison with `node scripts/performance/compare.mjs logs/performance-20261001 round-01`. It checks identical fixtures and sample counts and saves a table beside the raw data.

The fixed fixture contains 2,480 design layers, 18 additional catalog boards, twelve saved history entries and a flow with 240 linked steps and 478 transitions. Each run copies the original fixture into a fresh directory, so save/history workloads stay comparable. The baseline JSON is immutable. Reports include median/p95 latency, request/response bytes, cold startup, storage size and process RSS. RSS is diagnostic, not an isolated memory comparison.

For browser checks, preserve the baseline build in `logs/performance-20261001/baseline-build` and start `node scripts/performance/serve.mjs` in its own terminal. It listens only on `127.0.0.1:4338`, with synthetic data under `browser-data`. Navigate using IDs from `fixture/fixture.json`. Use the same viewport, scene and gestures each round; separately record load/render readiness, visible DOM size, idle request counts/bytes, gesture saves and request latency. Keep backend and browser measurements separate.

Do not clear user storage, overwrite the baseline or benchmark public origins. Warm latency and cold startup measure different workloads; comparisons should always retain the fixture, sample counts, machine, source commit and whether a browser was idle.

The laboratory build includes a temporary DOM output named `freegma-performance` with browser timings and loopback resource sizes. It is instrumentation for local tests and is never included in the product build. Save its JSON as `browser-baseline-flow.json` and `browser-baseline-design.json`, then `browser-round-01-flow.json` and `browser-round-01-design.json` for the updated run. Collect browser runs after the backend workload has finished. Preserve the original build and collect the same initial scene at the same viewport; wait until the output covers the fixed 10–40 second idle window. Generate the UI/network table with `node scripts/performance/compare-browser.mjs logs/performance-20261001 round-01`. One render timing per scene is indicative; mounted node and idle request counts are stronger regression signals.

## First measured round · October 1, 2026

On the fixed fixture, median completed design saving fell from 13,355 ms to 5,590 ms, unchanged actions from 15,508 ms to 268 ms, frame previews from 128 ms to 15 ms, and flow saving from 298 ms to 218 ms. The design file after the same action sequence fell from 176.4 MB to 77.8 MB. Unchanged actions no longer write a file or destroy redo history. Atomic fsync, recovery journals, conflict checks and portable undo history remain in use. Full validation passed 161 tests.

The browser code was unchanged in this round. The fitted dashboard still mounts 35,027 DOM nodes, including 32,240 in the layer tree. Single-run dashboard readiness was 8.81 seconds originally and 15.14 seconds in the comparison; this is an unresolved UI bottleneck, not a UI improvement. Flow idle traffic remained 16 requests / 2,406 response bytes in the fixed 30-second window. Do not interpret fewer requests during a blocked initial render as a network optimization. Subsequent rounds should measure steady-state traffic after rendering settles as well as this original startup window.
