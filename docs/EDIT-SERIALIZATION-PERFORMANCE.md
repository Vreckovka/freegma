# Completed edit serialization

The browser save queue applies and validates an edit before comparing the previous and next documents. A no-op still produces no save or undo step. Changed edits already have both JSON strings available from this comparison, so the queue lends those strings to the bounded step cache when it calculates UTF-8 snapshot weights.

The step cache retains only numeric weights in its WeakMap and the existing immutable snapshot references. It does not store JSON strings. Direct callers that omit the optional serialization still get the original sizing behavior. Memory limits, twenty-step limit, five-minute expiry, redo invalidation and eviction use the same UTF-8 byte counts, including Unicode and escaped text.

This reduces completed-action preparation on the browser thread. It does not alter requests, batching delays, completed action boundaries, disk format, server transactions or save acknowledgement replay. Undo/Redo still verifies snapshot freshness before applying a cached step. No intermediate pointer or color-picker state is recorded.

Local frozen-baseline evidence lives in `logs/edit-serialization-20261002`. CPU timings include actual optimistic operation validation, comparison, history recording and queue scheduling on large designs and flows. Flush, hashing, request checks and separate serialization-count instrumentation are outside timing. This benchmark does not measure rendering, network or disk latency.
