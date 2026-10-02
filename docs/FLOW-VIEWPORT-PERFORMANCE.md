# Visible flow routes

Separate Flow boards and dashboard Flow layers keep the complete route model, while mounting only arrows and labels that can intersect the canvas. Pan, zoom and canvas resizing recalculate visibility. Selected, hovered and open-detail routes remain mounted, preserving pointer capture while a line is dragged beyond the viewport.

Visibility uses the hull of curve controls or polyline vertices, including repeat bends and pivots. This deliberately retains some offscreen routes rather than hiding a route crossing the viewport. Labels are checked independently, with conservative space for long titles and event badges. Weak geometry keys cache bounds without retaining older boards.

Fit, route handles, connector targets, editing history, saving and export continue to use all routes. Nothing is removed from a `.free` file. Existing connector and frame culling is unchanged. A resize observer tracks the separate Flow canvas, including panel collapse and resizing.

The local browser baseline is a synthetic 1,000-step / 3,000-transition board in the isolated performance store. At a 1280×720 browser viewport and initial 100% zoom, v0.1.43 mounted all 3,000 arrow groups and 3,000 labels. The before/after report records mounted DOM counts, not end-to-end latency or Vercel traffic. Full backend, file size and transfer results retain their separately frozen baselines.
