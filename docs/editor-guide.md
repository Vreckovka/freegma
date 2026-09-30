# Freegma editor guide

Start with [the simple folders, shared components and themes guide](projects-and-themes.md), also available through **Guide** in the editor header. New project offers Empty or a shared Light/Dark starter.

## Files, folders and portability

```text
data/
  freegma.sqlite                         # file-reference index only
  workspaces/
    workspace_<id>/
      workspace_<id>.free                # JSON manifest, library, board/asset references
      b/
        board_<id>.free                  # full scene, CSS, metadata, revision, Undo/Redo history
      Assets/
        asset_<id>.png                   # original imported bytes, MIME-matched extension
```

The URL `/w/workspace_<id>/b/board_<id>` maps directly to `workspaces/workspace_<id>/b/board_<id>.free`. Names are stored in JSON, so renaming preserves paths and links. All geometry, spacing, text, colors, vector paths, image references and layer CSS are in the board file. Linked component/template definitions are in the workspace manifest. The inspector shows the exact saved board path.

Use the workspace menu's **Export workspace .free** or the inspector's **Export board .free**. Downloads are standalone JSON `.free` packages, with the full workspace or selected board, its history/library and base64 asset bytes. Import from **Import .free file** in the workspace menu or the inspector. Workspace packages create a separate workspace; individual boards import into the selected workspace. IDs stay unchanged when available, preserving links on a fresh system. Collisions generate new IDs and rewrite asset/component references; existing designs are never overwritten. Imports validate the entire package before publishing files. Maximum portable package size: 128 MB; each image: 8 MB.

Local manifest/board `.free` files reference separate Assets; for a raw filesystem transfer, copy the **entire workspace folder**, not just its board file. Put it in the target installation's `workspaces` directory and restart Freegma to rebuild the index. The exported portable `.free` download is the alternative that can travel alone. Preserve a complete folder backup taken while the service and MCP editors are stopped. Atomic file replacement and a durable transaction journal recover interrupted multi-file edits; the shared SQLite index serializes browser/MCP writers and enforces revisions. Direct external JSON edits bypass revisions and should be made while editors are stopped.

On first 0.1.4 startup, the old SQLite content is migrated without changing IDs, documents, revisions or history. A consistent `freegma.sqlite.legacy-<timestamp>.sqlite` backup is created **before** migration. Only after all file content has been published does the active index drop its old payload tables. Keep that backup for recovery; it intentionally contains the old design data. The active database can be replaced with an empty index and rebuilt from the folders.

## Design workflow

1. Generate a reference image with your preferred image generation tool, then import or drop its PNG/JPEG/WebP/GIF into the board. Images remain references; Freegma does not automatically reconstruct a screenshot into editable layers.
2. Draw frames, rectangles, ellipses, text, icons and native SVG vectors. Edit layer hierarchy, dimensions, colors, strokes, typography, rotation, margins and padding. Containers support free placement, horizontal/vertical auto layout, gap, alignment, clipping, independent width/height fixed/hug/fill sizing and wrapping. Children may use absolute positioning inside auto layout, and text supports letter spacing. Imported vector geometry and strokes are editable in the inspector.
3. Save a selection as a linked component or independent template. Update a component master to propagate changes across boards while preserving instance property overrides. Detach an instance for independent edits.
4. Generate React from the selected layer or whole board. JSX is a separate visual scaffold: the implementation agent adds behavior, application data and responsive rules. Download referenced image assets from their `/assets/<id>` URLs into the implementation; exported code lists the required assets.

Pan with H or Space, zoom with Ctrl+scroll, fit all with Shift+1 and zoom to selection with Shift+2 or a double-click in the layer tree. V/F/R/O/T select the corresponding tool. Shift selects several layers; Ctrl+D duplicates, Ctrl+C/V copies/pastes inside the studio, Delete removes, arrows nudge, Ctrl+Z and Ctrl+Shift+Z undo/redo. Property fields save on blur or Enter. Layer history is persisted and shared by all editors of a board. Publishing a library definition and updating instances are separate saved operations; board undo does not roll back the workspace library.

The layer tree and canvas share selection and hover highlights. Selecting a nested canvas object expands its parents and scrolls its tree row into view. Selecting an off-screen layer recenters the canvas without changing zoom. Focus a tree row and use Up/Down, Home/End, and Left/Right to navigate or collapse/expand; F2 focuses its name for renaming. Search reveals matching descendants even under collapsed parents. Breadcrumbs select enclosing frames.

Auto-layout padding has a four-sided diagram, paired horizontal/vertical fields and an optional link-all setting. Enable spacing guides to see padding bands and measured spaces between visible children; click a guide's value to edit the corresponding padding or gap field. Measured spaces include margins and distributed justification, so they can differ from the configured gap. Guides are omitted for rotated frames or ancestors. Layout values remain the same editable properties exposed through MCP and generated React. Padding and gaps must be nonnegative; margins may be negative.


## MCP

The stdio server is `freegma/server/mcp.mjs`. It uses the same file store and reference index as the browser. It exposes 27 tools for workspaces, boards, edits, components, images, React/CSS, portable files, project colors, comments, task references and undo/redo. `freegma://board/<id>` resources expose complete editable documents.

Register using your Node 24 executable and absolute paths:

```powershell
```

Register the standalone server with your agent, then reconnect MCP to load its tools. MCP logs go to stderr; stdout contains only newline-delimited JSON-RPC. See [official Codex MCP configuration](https://developers.openai.com/codex/mcp/).

Read `freegma_get_board` first, then supply its current `revision` as `expectedRevision`. Stale writes fail instead of overwriting the user's edits. A batch is atomic and becomes one history entry. Add operations receive defaults; use stable IDs to build hierarchy:

```json
{"boardId":"board_ID","expectedRevision":3,"label":"Build card","operations":[
  {"op":"add","node":{"id":"card","type":"frame","x":100,"y":100,"width":320,"height":180,"layout":"vertical","paddingLeft":24,"paddingTop":24,"gap":12,"fill":"#111827","radius":12}},
  {"op":"add","node":{"id":"title","type":"text","parentId":"card","text":"New idea","color":"#ffffff","width":260,"height":36,"fontSize":24}}
]}
```

The browser observes agent edits automatically. On a revision conflict, read the latest board and reconcile before retrying. Image import accepts base64 bytes up to 8 MB and validates MIME signatures. Assets and components are scoped to their workspace and inherited from parents; sibling-local extras remain separate.

## Architecture and validation

- `shared/design.mjs`: validated scene model, layout styles, atomic operations and React generation.
- `server/store.mjs`: file-reference index, legacy migration, optimistic revisions, components and portable packages.
- `server/files.mjs`: validated `.free` files, asset bytes, atomic writes and recovery journal.
- `server/http.mjs`: local-only web API and editor assets; rejects foreign origins and hostnames.
- `server/mcp.mjs`: agent transport. No arbitrary code execution or filesystem tools.
- `client`: React drawing board, layers/library/history and property inspectors.

```powershell
node scripts/build.mjs
node --test tests/*.test.mjs
```

Figma's [frame model](https://help.figma.com/hc/en-us/articles/360041539473-Frames-in-Figma-Design) informed the workspace organization. This first release supports the image → editable design → implementation workflow. Advanced vector path editing, multiplayer cursors, constraints, prototype animations and automatic image-to-layer reconstruction are outside this release.

Runtime settings: `FREEGMA_DB` (index), `FREEGMA_WORKSPACES` (optional workspace directory; defaults to `workspaces` beside the index), `FREEGMA_BUILD`, `FREEGMA_PORT` (default 4330), and `FREEGMA_ORIGIN` for MCP links. The dashboard integration currently points to the local service on 4330; direct links require this local studio to be running. Hosting the shared SQLite studio remotely needs a persistent server and authentication; a static Vercel deployment alone cannot host it.

## Import a complete project through MCP

`node scripts/import-project.mjs MANIFEST.json STATE.json` validates every document before creating a workspace, then creates boards, links the task and publishes components/templates through the real stdio MCP transport. The manifest has `name`, optional `taskRef`, `boards: [{key,name,document}]` and optional `components: [{key,boardKey,nodeId,name,kind}]`. Keep manifests and checkpoint state in your private data folder. The state records each successful creation immediately; resuming skips existing boards and preserves later user edits. A changed manifest requires a new state file. Search boards in the left panel; editing a board preserves its original position in the list.


## Edit CSS back into the drawing

Generate React opens the Code panel with **CSS** and **React** tabs. CSS is editable; React shows the companion JSX importing the generated stylesheet. Download both files. Layer selectors `.fg-<stable node ID>` map the exported rules back to the board. Edit a value, then **Apply CSS to design** (Ctrl+Enter). Changes are saved atomically as one history step and can be undone. Blank drafts never delete layers; omitted selectors are left alone, while deleting a declaration resets that property to CSS `initial`.

Pixel geometry, spacing, typography and supported color values update native inspector fields. Other supported declarations, such as gradients, shadows, grid, percentages and `calc()`, are persisted as layer CSS and render in the canvas and exports. Editing the corresponding native inspector field clears its CSS override. Linked instance edits require explicit property overrides and stay local. Saved components carry their CSS. Layout guides describe native spacing; CSS-only geometry may differ.

CSS is scoped to explicitly generated layer selectors. External URLs, at-rules, nested selectors, custom properties and `!important` are rejected with an error; no JSX is executed or imported. Invalid declarations are rejected in the browser before saving. If the board changes after generation, the draft is preserved and Apply is disabled until regeneration. Copy your draft before regenerating. MCP clients can use `freegma_export_react` (returns `code` for legacy inline JSX, `jsxCode` for companion CSS JSX, `css`, `cssFilename`, `nodeId`, `revision`) and `freegma_apply_css` with the exported revision and optional nodeId scope.

MCP portability tools: `freegma_export_file {id, kind: "workspace" | "board"}` returns `{filename, package}`. `freegma_import_file {package, workspaceId?}` validates and imports that package atomically. Existing create/edit tools automatically write `.free` files. `freegma_get_board` and workspace listings expose `filePath` for locating saved designs. Agents may generate a complete JSON package, then import it; no database payload writes are required.

Generated source has Copy JSX / Download JSX and Copy CSS / Download CSS beside its filename. Component library names, selected layer names, or the board name determine PascalCase filenames and the React function name (for example, Task card → TaskCard.jsx and TaskCard.css). Downloads contain the exact displayed generation and current CSS draft, even if the canvas has since changed. Downloads use local HTTP attachments; temporary source snapshots expire after five minutes.

Workspace folders: create a parent folder, create child workspaces with a parent, or move an existing workspace from the menu. The workspace tree and breadcrumbs navigate the hierarchy. Parenting is saved as parentId in the workspace .free manifest; canonical workspace-ID paths and URLs stay stable. Exporting a parent includes nested child packages. Importing a child alone detaches its outside parent; importing the parent rebuilds the complete hierarchy.

## Editor appearance

Freegma starts in dark mode. Use the Dark/Light button in the header to switch. The preference is saved in this browser and synchronized between Freegma tabs. With unavailable browser storage the editor still switches for the current page and defaults to dark on a new visit. Editor chrome uses the same tokens as the native Light Mode and Dark Mode design boards; artwork, board history and React/CSS exports keep their saved colors.

## Project color schematics and design themes

Color pickers preview locally on the open board while you drag or type. Close, Save color, click outside, or switch boards/workspaces to accept the latest valid value once. Escape or Cancel restores the original appearance without saving. Undo/Redo includes accepted project color edits alongside design edits; one picker session creates one history entry. Literal/local color editing and role bindings remain available. Project colors are saved in the parent manifest; other boards resolve the saved value when loaded, without rewriting every board. Unchanged files use a bounded validated cache that detects writes from other editors.

Open the **Colors** inspector to edit the project's named color roles (schematic) and all their theme values. Parent folders share this color system automatically with child workspaces. Each workspace can select a theme; descendants inherit the nearest selection. Creating a theme copies every role from the selected theme. Adding a role adds it to all themes; renaming and removing roles update the shared schematic. Removing a role freezes its current appearance on affected layers, histories and saved library definitions. Keep at least one theme.

The existing color picker and text entry remain available. A property can be **Local color** or linked to a named **Color role**. Editing a local value detaches that property; other color bindings remain. Choosing Local color from a linked role keeps its currently displayed value. New drawings keep their original local colors until you link them. Editor Dark/Light appearance is separate from these design themes.

Insert **Color schematic** from Assets or Colors. This movable frame displays the active theme's roles and values on the board. Its dot opens a color picker directly; clicking the name opens that role in the Colors panel. New and removed roles automatically appear in all schematic instances. Existing boards, component definitions and Undo history are migrated without changing their geometry, asset bytes or initial appearance.

Palettes live in the parent `workspace_ID.free` as `colorSystem` (revision, schematic, themes, defaultTheme); child theme choices use `colorTheme`. Layer `colorBindings` contain `{path,token,source}` for fill/color/stroke, vector path colors and CSS color literals. Literal source colors remain portable fallbacks. SQLite continues to hold only file references. Parent exports preserve inheritance; exporting a child or board alone includes the effective palette. Importing a board into another project remaps conflicting roles while preserving its appearance.

MCP: `freegma_get_colors {workspaceId}`, `freegma_update_colors {workspaceId,expectedRevision,operation}`, `freegma_insert_color_schematic {boardId,expectedRevision,x?,y?}` and `freegma_migrate_colors {}`. Color operations include setColor/addColor/removeColor/renameColor, createTheme/removeTheme/renameTheme, setTheme, setDefaultTheme and palette undo/redo. Board `freegma_undo` / `freegma_redo` accepts `expectedPaletteRevision` from the latest board alongside `expectedRevision`; supply both when traversing shared color history. Back up portable parent packages before invoking the one-time migration. Exported React/CSS resolves the current design theme and includes paletteRevision, themeId and colors metadata. For linked designs, `freegma_apply_css` also requires `expectedPaletteRevision` and `expectedThemeId` from the export; stale palette drafts are preserved and rejected.

## Component references

The Layers tree labels main components **Master** and their linked uses **Instance**. Select any layer inside one to see its **Component reference** near the top of the inspector: name, owner, component ID, source board, usage counts and overrides. **Go to main component** opens and selects the source; **Show linked usages** navigates to each reuse. Every saved master edit propagates automatically, including master Undo/Redo. Explicit instance overrides remain local; detaching makes a copy independent.

Freegma's Light/Dark studio designs share Button variants, property fields, board/layer rows and drawing controls from the parent **Shared studio components** board. Geometry and content remain editable native layers.


## Locked instances and independent overrides

A linked instance shows a lock in Layers. You can select and expand all its layers and inspect parameters. Inherited properties are read-only: edit the master with **Go to main component**, or click the lock beside one property to enable a local override. Other properties keep following the master. The orange warning means the local value is kept on master updates. **Reset** restores that property from the latest master and locks it again. Existing overrides remain editable.

For example, override **Text content** on one Button to say “Save”, while its padding and colors still come from the shared Button master. Override **Corner** independently if this use needs rounded corners. Reset Corner to follow future master changes again; the Save label remains local. **All property overrides** exposes every native editable property and each CSS declaration, such as `cssOverrides.box-shadow`. CSS application respects these same locks. Structural layer additions/removals belong in the master; detach the whole instance for independent structure.

Agents use `freegma_apply_operations` with an explicit permission operation before updating an instance. Both can be one atomic, undoable batch:

```json
{
  "boardId": "board_ID", "expectedRevision": 3,
  "operations": [
    {"op": "override", "id": "instance_label_ID", "property": "text", "enabled": true},
    {"op": "update", "id": "instance_label_ID", "patch": {"text": "Save"}}
  ]
}
```

Use the same `override` operation with `enabled: false` to reset from the current master. Locked edits fail with HTTP 423 without saving partial changes. `freegma_component_reference` locates the master and usages.
