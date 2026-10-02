# Auto arrange flow

Open a **Flows board**, or enable **Flow layer** on a design board. Click **Auto arrange flow**, review the confirmation, then choose **Arrange flow**. Cancel leaves the board unchanged. Undo restores the complete previous arrangement in one step.

The same action is available to agents through `freegma_arrange_flow`:

```json
{
  "boardId": "board_example",
  "expectedRevision": 12
}
```

It returns a small revision receipt by default. Agents describe frames, decision points and transitions, then call this tool instead of sending positions and bend points for every object. Use `responseMode: "full"` only when a full board is needed. Ask for arrangement before changing an existing manually composed board.

The layout uses ELK Layered with orthogonal routing in an isolated Node worker. Freegma's policy supplies distinct attachment points, independent routing lanes, room for labels, frame captions, and bottom-to-side return connections. The original frame contents, linked components, triggers, references, themes and descriptions are retained. Live references refresh their stored dimensions from the source frame before calculation. If a source changes during calculation, the plan is rejected. Linked instances receive only the position overrides needed to move them. Unrelated design artwork stays in place. Nearby sibling text captions above a screen move with it; group other annotations with their screen when their relationship is ambiguous.

The engine computes a plan before saving. It does not hold a database transaction during calculation. A second revision and document check rejects the result if another editor changed the board meanwhile. All moves and routes are saved together with one history entry. A timeout or failed quality check leaves the original layout unchanged. Manual route editing remains available after arrangement.

`shared/flow-arrange.mjs` contains the versioned layout policy. `server/arrange-store.mjs` adapts Freegma documents and applies the plan. `shared/flow-layout-quality.mjs` checks for shared tracks, touching wires, artwork intersections and label overlap; ordinary straight-segment crossings are counted separately. Crossings cannot always be removed from arbitrary graphs. Long flows use ELK's graph wrapping. Return connections are routed separately with Freegma's bounded orthogonal A* router in `shared/flow-return-route.mjs`, so loops cannot reverse the main progression. This is an initial layout policy that can be refined with new examples without changing how agents describe a flow.

Frames inside an automatic layout, rotated frames, a component's internal frames, and a connected frame containing another connected frame cannot be repositioned safely as independent screens. Use a live reference on a Flows board or arrange those scopes separately. The action accepts up to 1,000 frames and 3,000 transitions, with at most two concurrent calculations and a 30-second calculation limit. Some unusually dense graphs may require smaller boards.

Routing requirements came from the editable **Flow Design Manual** supplied with the Lazy Alarm designs. The implementation uses [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) and [ELKjs](https://github.com/kieler/elkjs), distributed under EPL-2.0. The dependency is loaded by the server worker, not included in the initial editor bundle. No public layout service receives the design.
