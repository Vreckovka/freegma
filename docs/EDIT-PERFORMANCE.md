# Edit preparation performance

Ordinary edits already create an independent, validated document in `applyOperations`. The instance-lock preparation layer borrows the original until that copy exists, avoiding an extra full-document clone. It still checks every operation against the component locks at that step.

Resetting a component override can expand a legacy whole-property override into individual properties. That preparation step receives an owned document before it changes any layer. Failed compound actions cannot modify the original board, and persistence retains its existing atomic transaction and history checks.

Run the fixed local CPU comparison with:

```sh
node scripts/performance/edit-preparation.mjs --output logs/edit-preparation-20261002/current.json
```

The same single text edit runs against synthetic documents with 2,480 and 9,920 layers, after three warmups and with 25/15 measured samples respectively. Input immutability and exact result hashes are checked. Use `--module` for a frozen `server/instance-locks-store.mjs` snapshot and `--baseline` to verify matching outputs. Existing measurement files are never overwritten.

The benchmark measures edit preparation with instance-lock checks. It excludes file saving, network transfer, browser latency and Vercel.
