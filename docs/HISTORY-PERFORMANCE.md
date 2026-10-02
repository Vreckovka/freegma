# Undo and redo performance

Freegma restores recent browser history immediately and saves completed actions in the background. The server still verifies revisions, component updates, comments and complete persisted history before publishing an atomic `.free` file.

Undo and redo borrow immutable document snapshots from the validated file cache. They copy the board metadata, comments and history list; Undo replaces the one history entry whose timestamp changes. They do not clone every historical layer. Failed saves cannot alter the cached original, and response documents remain independent copies.

Run the fixed local benchmark with:

```sh
node scripts/performance/history-travel.mjs --output logs/history-travel-20261002/current.json
```

It uses the existing synthetic 2,480-layer dashboard with 12 history entries, then performs six Undo and six Redo actions in a separate database and workspace directory. It checks every restored document and verifies that the full history and final canvas are unchanged. Run against frozen `server/store.mjs` with `--module` and compare exact document/history digests using `--baseline`. Output paths are unique and never overwritten.

These measurements include synchronous store processing and durable local writes. They do not measure browser latency, network transfer or Vercel performance.
