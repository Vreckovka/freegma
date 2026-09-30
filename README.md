<div align="center">

<img src="docs/media/mark.svg" width="64" alt="Freegma" />

# Freegma

**Your designs. Your files. Your workflow.**

Editable canvas · Components · Real CSS · Portable workspaces · MCP

**Reference image → Editable design → React implementation**

<img src="docs/media/hero.gif" width="100%" alt="Freegma designing Freegma: studio designs in the real editor" />

</div>

## Quick start

Install **Node.js 24.14 or newer** and Yarn. Node includes the SQLite runtime; no separate database server is required.

```sh
git clone https://github.com/Vreckovka/freegma.git
cd freegma
corepack enable
yarn install
yarn build
yarn start
```

Open **http://127.0.0.1:4330**. After installation the workflow is **`yarn build` → `yarn start`**. The server runs in your terminal; Ctrl+C stops it. `yarn test` checks editor/storage/export/comments/colors/MCP. Yarn and dependencies are pinned in `package.json` and `yarn.lock`. This private repository requires access to clone.

Freegma runs independently of task dashboards, worker clients and external accounts.

## Feature tour

### Live colors, one Undo step

Drag, type HEX/RGB, or use the system picker. The open board previews locally; closing the picker or changing workspace saves one action. Escape cancels. Shared schematic roles and themes inherit through folders, while original local colors remain available.

![Live palette preview and Undo](docs/media/colors.gif)

### Layers, spacing, and real CSS

Edit native layers through the canvas or tree. Change text, geometry, padding, margins, gap, alignment, fixed/hug/fill sizing. Generate JSX + CSS, edit CSS and apply it back to the design. Copy or download files named after the component.

![Native layers, spacing and generated CSS](docs/media/layout-css.gif)

### Feedback on the canvas

Pin comments or drag a region. Reply, react, resolve, search, filter and copy thread links. Anchored pins follow their frame and stay readable while zooming. Comments survive design Undo.

![Canvas comments and replies](docs/media/comments.gif)

| Design | Organize | Hand off |
| --- | --- | --- |
| Frames, shapes, text, icons, vectors, images | Parent folders, workspaces, boards | JSX and CSS copy/download |
| Auto layout, padding, gap, margins, guides | Linked components and independent templates | Portable `.free` packages with assets |
| Local colors and themed roles | Persistent Undo/Redo and stable links | MCP reads, guarded edits and exports |
| Light and dark appearance | Pinned comments and region feedback | Optional task ID/URL reference |

Animations show the actual editor working with its own studio designs. Generated React is a visual scaffold; implementation adds behavior and application data.

Undo design edits with **Ctrl+Z** (or **Cmd+Z** on macOS), including property fields and color edits. Redo with **Ctrl+Shift+Z** or **Ctrl+Y**. Text, CSS and comment editors keep their normal text Undo.

## Editable examples

[**Freegma-Studio.free**](examples/Freegma-Studio.free) includes **22 native design boards**, Light Mode and Dark Mode, palettes, components and templates. Import it from the workspace menu or run:

```sh
yarn examples
yarn start
```

Overview, inspector/spacing, React/CSS, components, folders, dialogs/history, foundations and portable/import views are all editable. `yarn examples` preserves existing example edits. `node scripts/export-examples.mjs` rebuilds the distributable example from native design sources.

## Files belong to you

```text
freegma/
  client/                  React editor
  server/                  HTTP + MCP + storage
  shared/                  Scene, CSS, colors, comments, templates
  dist/                    Built editor (ignored)
  data/                    Private local storage (ignored)
    freegma.sqlite         Rebuildable file-reference index
    workspaces/
      workspace_ID/
        workspace_ID.free  Palette, library, references
        b/board_ID.free     Layout, styles, history, comments
        Assets/            Original images
```

SQLite stores references, not design documents. `/w/workspace_ID/b/board_ID` maps to its `.free` file. Portable exports bundle assets, library and settings so they can travel alone. For a filesystem move, stop editors and copy the entire workspace folder. IDs and URLs survive a move; import collisions generate new IDs without overwriting designs. See the [editor guide](docs/editor-guide.md).

## MCP

Use `yarn mcp` or configure your agent with an absolute Node executable and `server/mcp.mjs`. HTTP and MCP share storage and optimistic revisions.

```json
{"mcpServers":{"freegma":{"command":"/absolute/path/to/node","args":["/absolute/path/to/freegma/server/mcp.mjs"]}}}
```

There are **26 tools** for workspaces, boards, deletion previews, operations, components, images, CSS/React, portable files, colors, comments, task references and Undo/Redo. Read current revisions before editing. Logs use stderr; stdout remains JSON-RPC.

Delete a board from its **⋯** menu in the Boards list. To delete a project/workspace, open the workspace dropdown and choose **Delete workspace…**. The confirmation shows the scope and requires the exact name. Deleting a parent includes its children; deleting a board keeps shared library components and assets. Changed designs invalidate old confirmations.

Deleted files are retained in `data/workspaces/.trash/deletion_ID/`, including a `deletion.json` inventory. To recover, stop all Freegma HTTP/MCP clients and copy the archived files back to their original relative paths; for an individual board, add its `{id,path:"b/board_ID.free"}` reference to the workspace manifest. Avoid overwriting newer files. Restart Freegma to rebuild the SQLite index. Deletion is separate from canvas Undo.

## Configuration and embedding

Defaults need no configuration. Set variables in your shell/service; `.env.example` documents them but is not loaded automatically.

| Variable | Default / purpose |
| --- | --- |
| `FREEGMA_PORT` | `4330` |
| `FREEGMA_DATA_DIR` | `<repository>/data` |
| `FREEGMA_DB` | `<data>/freegma.sqlite` |
| `FREEGMA_WORKSPACES` | `workspaces` beside the index |
| `FREEGMA_BUILD` | `<repository>/dist` |
| `FREEGMA_ORIGIN` | Base URL for MCP links |
| `FREEGMA_EMBED_ORIGINS` | Comma-separated frame origins; default local ports 4320/4318 |

Embed by iframe in a permitted host. Navigation sends `{type:"freegma:navigate",path:"/w/…/b/…"}` to the referrer's origin; hosts check sender origin and iframe window. A task reference is plain optional metadata.

The server binds to loopback and checks API origins. Comment identities are local display labels. Remote multi-user hosting requires authentication and persistent storage; a static-only site cannot host this SQLite server.
