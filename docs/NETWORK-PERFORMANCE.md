# Network performance

Large API responses and generated source downloads use gzip when the client accepts it and compression reduces their size. Compression runs asynchronously; the JSON content and save revisions stay exact. API responses remain `no-store`, including saves and errors.

Repeated board GETs can reuse an immutable serialized response and its gzip result in the local server. Each request still reads the validated file snapshot and exact effective palette. Changes to design, comments, history, ancestor colors, theme, external file metadata or a recovery publication produce a new response. Corrupt or missing files still fail. The LRU holds at most 16 boards and 16 MiB of JSON plus palette keys; compressed bodies add at most another 16 MiB. Weak source references avoid retaining full undo histories beyond the existing file cache. Saves and MCP object reads use their existing fresh paths. This server cache does not enable browser or Vercel API caching.

The editor HTML, JavaScript and CSS use representation-specific ETags and `no-cache`. Browsers check freshness on revisits and receive a bodyless `304` for unchanged files. Changes to file metadata invalidate the server cache, including same-length build replacements. Encodings are separated with `Vary: Accept-Encoding`. The build cache covers four files with an 8 MiB per-file retention limit. Original images and the existing brand asset policy stay intact.

The proxy configuration separates `/app.js`, `/app.css` and `/theme.js` into a `no-cache` route, while HTML/API forwarding stays `no-store`. This allows browsers to keep those assets and send conditional requests on the next authorized Vercel deployment. Conditional requests still reach the local server; their response bodies can be empty. The measurements do not claim to eliminate requests or quantify billing. Updating the local server alone does not publish a new proxy configuration.

Run local transfer measurements against the frozen synthetic project:

```powershell
node scripts/performance/transfer.mjs round-01
node scripts/performance/compare-transfer.mjs logs/http-transfer-20261002 round-01
```

Measurements create an isolated file store and loopback HTTP server. They never contact Vercel. Encoded response-body bytes are reported separately from decoded JSON bytes in the original benchmark. The transfer baseline was added at v0.1.37; it is preserved separately from the original performance baseline. Five samples measure each read/asset median; conditional revisits use one request. Header, TLS and proxy overhead are excluded.
