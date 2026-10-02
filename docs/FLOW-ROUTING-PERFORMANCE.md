# Reusing flow routes

Each standalone Flows editor keeps one bounded geometry calculation. Looking up a source or destination uses a node index instead of scanning all steps for every arrow. Hovering, opening transition details and selecting without a route preview reuse the unchanged calculation.

Changing nodes, connector ports, live master dimensions, transitions, or a route preview invalidates the calculation. Input documents are immutable in the editor; the cache compares their exact array and preview identities. It stores one result per editor and has no shared cache between workspaces. Dragging still previews locally and commits once on release.

The local geometry benchmark freezes the existing 240-step/478-arrow fixture and a synthetic 1,000-step/3,000-arrow fixture. It compares thirty indexed rebuilds and thirty unchanged-input hits, checking all returned route data against the original SHA-256 digests. It does not measure complete browser latency, network traffic or Vercel usage. Those remain separate measurements.

The original geometry snapshot is in `logs/flow-layout-20261002/baseline.json`; use `node scripts/performance/flow-routing.mjs round-N` with a fresh round name to retain prior results.

A live-reference drag compares its completed preview against the position captured at pointer-down. The parent can display that preview immediately without causing the child to mistake it for an already saved move.
