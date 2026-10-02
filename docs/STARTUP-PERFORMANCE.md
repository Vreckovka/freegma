# Startup performance

Cold startup indexes validated workspace manifests and safe board file references without decoding unopened boards. References must point to existing regular files within the workspace, with unique IDs and exact board paths. SQLite continues to hold file references only.

Opening a board validates its entire document, comments and history, including its identity. A selected workspace's board catalog validates only that workspace's boards. Unopened corrupt board content can therefore be reported later, when accessed; missing files and unsafe references still fail startup. Explicit reindex, imports and recovery retain full validation. Recovery validates published data before accepting a new operation, even during startup.

```powershell
node scripts/performance/startup.mjs round-01
node scripts/performance/compare-startup.mjs round-01
```

The frozen v0.1.40 profile uses three fresh copies of the large synthetic fixture. It reports cold indexing, first design view, their combined time, first flow view and the number of distinct decoded boards. A first view includes catalogs and the actual board read, so deferred work is counted. Content digests must match the baseline. File copies are excluded from timing; all requests and stores are local. The original HTTP suite remains a separate comparison, including the newly cold first board request.
