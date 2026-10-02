# Private React export transforms

React export starts with the independent document returned by getBoard. Semantic color resolution and schematic generation now reuse that private copy. Default public color APIs continue cloning inputs. JSX/CSS, component-derived and explicit filenames, literal colors, generated schematic-node selection and API metadata are preserved. Exports remain read-only and uncached; later master and parent-palette changes remain visible.

Frozen v0.1.65 and candidate alternate across 15 samples per version after three warm-ups each. Workloads exercise actual store.export, including board retrieval, palettes, component metadata and code generation. This measures local API preparation CPU, excluding HTTP, UI and Vercel. Complete replies and normalized byte counts match; only the generated version comment is normalized. Source documents remain unchanged. Compatibility snapshots also preserve exact JSX/CSS and names for a rich board, native frame and generated swatch, and HTTP/MCP contracts are tested.

| Workload | Frozen v0.1.65 | Candidate | Change |
| --- | ---: | ---: | ---: |
| design2480 | 148.91 ms | 114.84 ms | -22.9% |
| selectedComponent | 70.72 ms | 35.18 ms | -50.3% |
| design9920 | 729.22 ms | 544.85 ms | -25.3% |
| richSchematic | 5.21 ms | 5.05 ms | -3.0% |
| generatedSwatch | 2.82 ms | 2.61 ms | -7.5% |

Acceptance requires at least 10% lower median for the two large boards and selected component, with no workload regression above 5%.
