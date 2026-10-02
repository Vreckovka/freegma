# Save performance

After a file is atomically published, Freegma can retain the decoded snapshot already validated for those exact staged bytes. This avoids decompressing and validating the same history again on the next read. The file format, recovery journal, saved history and SQLite file references stay unchanged.

Promotion requires identical staged/published bytes and a completed validation. Recovery writes, restaged bytes without validation and external file changes use the normal read path. Cached validation is tied to its validator function as well as the file metadata signature. Public reads keep returning copies. The existing 32-entry / 96 MiB decoded-size cache limits still apply.

Focused checks cover copy isolation, undo/redo, external history corruption, different validators, unvalidated restages, mismatched publish bytes and recovery after an injected commit failure. All fixtures are disposable local stores.

```powershell
node scripts/performance/profile-save.mjs round-01
node scripts/performance/compare-save-profile.mjs round-01
```

The baseline profile was added at v0.1.38. It measures three completed edits to the same large synthetic board as the HTTP suite. Method durations are inclusive and overlap: do not sum them. The original HTTP suite still measures user-facing request latency separately. No profile or benchmark sends requests to Vercel.
