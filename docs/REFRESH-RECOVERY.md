# Same-board refresh recovery — 0.1.70

A pending board read used to be shared by every request to reopen that board. Retry was only available after the read deadline and transient retry finished. Now Retry is available while loading: it cancels the previous read and starts an independent request immediately. Navigation also cancels obsolete reads. Each attempt uses a unique read URL and explicitly bypasses browser caching. Editor JavaScript, CSS and theme bootstrap URLs include the release version.

Cancellation settles even if a transport ignores AbortSignal. A late old response cannot remove the new pending read. Existing navigation tickets and per-board save queues continue to protect the active canvas and unsaved edits; writes keep their original timeout and retry policy.

Validation uses local tests and a read-only local proxy that deliberately leaves the same-board GET unanswered. Refresh enters Loading board; clicking Retry aborts the stalled request and renders the same 359-layer board. Browser errors were empty. Normal local and public reloads are also checked for the published release.

The original older in-app browser tabs could not be inspected: their controller commands timed out. Fresh tabs loaded correctly. This repair verifies application read recovery and cache isolation; it does not identify a browser-renderer hang as an application defect.

Native design reused: `board_f216a7783d44428a` — Board loading / recover interrupted reads. General optimization remains stopped.
