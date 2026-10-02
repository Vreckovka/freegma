# MCP without unnecessary board context

Full responses are preserved for existing clients. Agents can explicitly request smaller responses:

1. Discover layers: `freegma_get_board({boardId, view:"outline", limit:50})`.
2. Inspect a frame: `freegma_get_board({boardId, view:"nodes", nodeId:"frame-id", limit:100})`. Properties are complete; only this subtree is returned. On a flow board, `nodeId` selects one step and its connected transitions, or one transition.
3. Continue when `page.hasMore` is true, using `offset:page.nextOffset` and `expectedRevision:revision`. A changed revision rejects the continuation rather than silently mixing board versions. The maximum page size is 200.
4. Edit with atomic operations and `responseMode:"compact"`. The receipt contains the new revision, undo state, palette revision, theme ID, counts and operation targets. Targets refer to IDs supplied by the operation, not an exhaustive list of synchronized or newly generated IDs. Read the relevant outline afterward when discovering generated IDs.
5. Use `view:"summary"` for revision/counts only. Omit `view` and `responseMode` whenever a complete board, palette or comment state is needed. Separate color and comment tools remain available.

MCP text and structured content both retain the requested data for compatibility. Scopes and pagination are explicit; a partial read never claims to be the entire board. This changes response size, not save atomicity, component propagation or revision checks.

## Repeatable local measurement

Create the usual large fixtures first with `yarn perf --label baseline` (use a new label if the immutable baseline already exists). Then capture actual local stdio MCP responses:

```sh
node scripts/performance/mcp.mjs --label baseline
python -m pip install -r scripts/performance/requirements-mcp.txt
python scripts/performance/mcp-tokens.py logs/mcp-tokens-20261002/baseline-payloads.json
node scripts/performance/mcp.mjs --label round-01 --compact
python scripts/performance/mcp-tokens.py logs/mcp-tokens-20261002/round-01-payloads.json
node scripts/performance/compare-mcp.mjs logs/mcp-tokens-20261002 round-01
```

The benchmark copies isolated synthetic data and sends no model requests or Vercel load tests. It compares inspecting one frame and one flow step and editing each. Both runs start from identical fixture files. Existing captures are never overwritten.

The fixed `o200k_base` tokenizer from [OpenAI tiktoken](https://github.com/openai/tiktoken) counts requests, response text plus structured content, and wire JSON separately. The comparison uses response text plus structured content and also records payload bytes. Actual model billing depends on the selected model and which content the MCP client exposes. These are reproducible context-size measurements, not a bill or a promised price.

To include these rows in the overall table, pass the comparison JSON as the fifth argument:

```sh
node scripts/performance/compare.mjs logs/performance-20261001 round-12 logs/file-size-20261002/round-07.json logs/mcp-tokens-20261002/round-01-comparison.json
```
