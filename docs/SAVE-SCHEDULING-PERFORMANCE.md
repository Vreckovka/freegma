# Save scheduling CPU

The client save queue counts each independently owned completed action's wire bytes once. Subsequent backlog limits, scheduling and prefix selection reuse that measurement. Array byte counts add the exact JSON brackets and commas, retaining UTF-8 encoding and escaping for Unicode, quotes, newlines and lone surrogates. The existing conservative prefix separator rule is unchanged.

The cache belongs to one queue and uses weak keys. Caller actions are cloned before entering the pending list; exported drafts are cloned. Cached local Undo snapshots are excluded from wire sizes, as before. Acknowledgements still remove only their ordered prefix and rebase newer edits before publication. Retry identity, quiet/max-wait scheduling, action/operation limits and rejection behavior stay unchanged.

```sh
node scripts/performance/save-scheduling.mjs --output logs/save-scheduling-20261002/current.json --baseline logs/save-scheduling-20261002/baseline.json
```

This benchmark isolates enqueue/scheduling CPU with 25 smaller actions and 200 larger actions containing multibyte Unicode and JSON escaping. It uses three warmups and 25/15 measured samples against frozen v0.1.51 queue modules. Exact outgoing batch hashes, final documents, action counts, revision sequences and wire byte totals must match. Flushing and hash checks are excluded from timing. It is not a browser-rendering, network or storage measurement and sends no requests to Vercel.
