# Navigation-cache byte accounting

Each completed board acceptance measures the final whole envelope once. Entry initialization no longer serializes it before the queue accepts it. Saved-state callbacks skip a duplicate sizing pass only while acceptance is on the stack; a depth counter handles reentrant callbacks. Ordinary asynchronous acknowledgements still count bytes afresh.

There is no persistent byte-weight or JSON cache. Replacement objects and modified envelopes are freshly measured, including comments, palettes, Unicode and metadata. Count, byte, expiry and dirty-board limits remain in effect, as do per-board acknowledgement streams. The byte budget describes serialized UTF-8 data, not actual heap usage.

Measurements isolate browser-side navigation-cache preparation CPU with private large design and flow fixtures. This change does not reduce request payloads, disk files or Vercel traffic, and does not claim end-to-end loading or rendering improvements.
