# Scope native React exports

Native layer exports independently copy their subtree before resolving project colors, materializing schematic rows and generating JSX/CSS. Whole-board exports and selections of generated schematic children retain full-document preparation. Export borrows the validated stored board only for reading, and obtains the current palette and component name. No completed-result cache is introduced.

Frozen v0.1.66 and candidate alternate across 15 samples per version after three warm-ups each, using identical isolated persisted stores. This measures warm store.export preparation CPU, including palette/component lookup and generation, excluding HTTP, UI and Vercel. Complete replies and bytes match after normalizing only the generated version comment; raw boards remain unchanged. The 62-layer selection is tested within both 2,480- and 9,920-layer source boards.

| Workload | Frozen v0.1.66 | Candidate | Change |
| --- | ---: | ---: | ---: |
| design2480 | 107.62 ms | 109.49 ms | 1.7% |
| selectedComponent | 47.58 ms | 7.83 ms | -83.5% |
| design9920 | 729.83 ms | 704.03 ms | -3.5% |
| richSchematic | 4.16 ms | 4.25 ms | 2.1% |
| generatedSwatch | 1.89 ms | 1.85 ms | -2.1% |
| selectedMaximum | 241.58 ms | 11.92 ms | -95.1% |

Acceptance requires at least 20% lower median for both large-board native selections, with no workload regression above 5%. Whole-board and generated-swatch workloads are controls. Separate frozen JSX/CSS snapshots preserve nested flex layout, explicit root coordinates, percentage sizing, selected assets, vector styles and generated schematic children. Tests also verify fresh inherited palettes, component/default/explicit names, metadata, source isolation, failures and HTTP/MCP contracts.

Only selected native layer preparation is attributed to scoping; control timing changes are not claimed as improvements. No public performance tests or new Vercel deployment.
