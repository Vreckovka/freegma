# Large flow navigation

The Steps and Transitions sections share the existing sidebar scrollbar. Their full data and scroll heights remain available; only the visible rows and a small overscan window are mounted. Rows holding keyboard focus stay mounted when scrolled out of view.

Each item is still a button. Arrow Up/Down, Home/End and Tab/Shift+Tab move through the complete section, revealing a row before focusing it. Enter or Space performs the original selection action. Selecting a step or transition on the canvas reveals its sidebar row. The board list, headings, counts, master-reference indicators and transition source/target titles are preserved.

Transition labels use an indexed node-title lookup. Row layout uses the existing 39-pixel single-line and 56-pixel subtitle heights. Variable heights preserve live-reference subtitles and transition context; panel resizing recalculates the visible window.

The local browser baseline uses the same isolated 1,000-step / 3,000-transition fixture as route-culling tests. v0.1.44 mounts all 4,000 navigation buttons. The comparison records DOM counts at the same initial scroll position and tests keyboard navigation to the final step and transition. DOM counts are not browser latency or Vercel traffic measurements.
