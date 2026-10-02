# Shared-component scan performance

Component references and master propagation inspect validated board snapshots without making copies of each board's document and complete Undo history. They also inspect workspace board lists through validated read-only manifests. Only boards with matching instances need independent before/after documents for propagation. The before snapshot stays separate so change detection and Undo work normally.

Borrowed snapshots are never modified. Reference responses contain newly constructed location objects and override lists, so callers cannot mutate cached state through an inspector response. Publishing a master still stages its independent owning manifest, updates the affected boards, preserves per-property overrides, and commits through the existing atomic storage transaction. Same-board master/instance updates retain their separate owned-copy path.

Run the local benchmark after preparing a frozen fixture:

```sh
node scripts/performance/component-scans.mjs --output logs/component-scans-20261002/current.json --baseline logs/component-scans-20261002/baseline.json
```

The fixture adds a two-layer shared master and an instance to the existing local 2,480-layer, 12-history-entry dashboard/catalog/flow fixture. It measures ten warm component-reference inspections, six master edits, six Undo actions and six Redo actions. Exact reference metadata, untouched large-board history, final master/instance documents and normalized master history must match the frozen previous implementation. The baseline is separately captured from v0.1.50; these metrics were absent from the original performance baseline. Tests and timings never use Vercel.
