# Editing connections

These controls work in both a dashboard's Flow layer and a separate Flows workspace.

- Hover a connection to highlight its source, trigger and destination. Click its **label** to open the details popup.
- Press and drag the **line** to shift its route immediately. Clicking a line selects routing tools without opening details.
- Drag the round **start or end dot** along the frame edge to move that endpoint independently. Endpoint dots take priority over overlapping curve handles.
- Click **Show curve controls** to expose the bend squares and dashed guides. Hide them to return to endpoint editing. Existing bends are preserved either way.
- Use **Add pivot** for extra turning points. Drag diamonds to reposition them; select a diamond and use **Remove pivot** to remove it. **Reset route** restores automatic routing.
- A focused handle also accepts arrow keys: ten design pixels, or one with Shift.
- During a drag, movements are previews. Releasing commits one undoable action; Escape, losing focus or cancelling the pointer discards the preview. Saves run through the existing background batch scheduler.

For performance reports, **Baseline** is the original frozen measurement, **Improved** is the previous verified result, and **Current** is filled only for metrics affected by the latest round. The affected rows are bold. Timing fluctuations in unrelated workloads remain available in the raw benchmark files.
