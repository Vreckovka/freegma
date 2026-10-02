React and CSS exports index layer IDs, roots and child lists once per export. Root and sibling order still follow the document's stored order; selected exports retain their existing subtree rules. This avoids repeatedly scanning every layer while rendering each JSX element and CSS rule.

The JSX pass that uses CSS classes skips inline style calculations because it never includes those objects in its output. Inline JSX and the separate stylesheet still calculate and retain their full styles.

The local benchmark uses the original 2,480-layer design fixture, a 9,920-layer copy, reversed storage order, a selected frame and an empty board. It preserves exact output hashes, including filenames, inline JSX, separate CSS, asset references and text. Only the generated version comment is normalized when comparing releases.

To compare against a frozen source directory:

```powershell
node scripts/performance/react-export.mjs --module logs/react-export-20261002/baseline/shared/design.mjs --output logs/react-export-20261002/baseline.json
node scripts/performance/react-export.mjs --module shared/design.mjs --output logs/react-export-20261002/current.json --baseline logs/react-export-20261002/baseline.json
```

Existing output files are never overwritten. Ordinary cases use three warmups and 15 measured samples. The near-limit 9,920-layer cases use one warmup and five samples in both versions to keep the old quadratic baseline bounded. These measurements describe local generation CPU time, not browser latency or Vercel traffic. No files or history in the user's design storage are changed by the benchmark.
