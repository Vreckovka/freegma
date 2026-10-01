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

### Trace every shared component

Layers label **Master** and **Instance**. Select an instance or its child to see the owning project, stable component ID and linked usages. **Go to main component** jumps to its source. Saved master edits update uses across boards and theme folders automatically, while local overrides stay yours. Instances are read-only until you click a property’s lock to enable its local override. An orange warning and Reset control show which values are preserved. Browse layers freely; use All property overrides for individual native properties or CSS declarations. The starter template includes two linked Cards and Buttons to try this.

1. Insert from **Assets → Components** to create a linked use.
2. Select it in Layers: the lock means inherited properties are read-only. **Go to main component** opens the source.
3. Edit the master once; linked uses update automatically across boards and theme folders.
4. Click a property’s lock to enable only that local override. The orange warning means it is kept on master updates. **Reset** follows the latest master again.

![Inspect a linked instance, edit its master, override one property and reset](docs/media/components.gif)

The editable Freegma Studio example shares its controls and preview cards from a parent library. [Folders, themes and component guide](docs/projects-and-themes.md).


### Color roles: change text and borders together

A **schematic** is the project’s list of named color roles, such as Background, Text, Border and Accent. Each **theme** supplies a value for every role. Parent projects share their schematic and themes with child folders.

Choose a layer property’s **Color role** to link it, or keep **Local color** for an independent value. One role can feed several properties: in this demo, **Text** drives both primary text and the preview card’s outline. Changing Text turns both mint green; the background and muted text stay unchanged.

Open **Colors**, pick the role’s swatch, then drag or enter HEX/RGB. The open board previews locally; **Save color**, closing the picker or changing workspace accepts one action. Escape cancels. **Ctrl+Z** restores the accepted color in one step. Other boards resolve saved roles when opened. Switching **Design theme** changes the same components without duplicating them.

![The Text role changes primary text and a bound card border, then Undo restores both](docs/media/colors.gif)

![The same linked layout switches between Light and Dark design themes](docs/media/themes.gif)

Both side panels collapse with their corner chevron. Drag the inner edge to resize, or focus the divider and use arrow keys. Layers has a 200 px minimum and the inspector 248 px; double-click resets its width. Widths and collapse preferences are saved locally, independently of designs. Narrow windows temporarily fold panels to preserve canvas space.

### Layers, spacing, and real CSS

Edit native layers through the canvas or tree. Change text, geometry, padding, margins, gap, alignment and sizing. For a shared component, edit the **master**, or explicitly override the instance property first. Generate JSX + CSS, edit CSS and apply it back to the design; the same property locks apply. Copy or download files named after the component. The recording edits master CSS so linked uses inherit the change.

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

Animations are captioned snapshots of real editor edits in an isolated copy of its studio designs. Captions identify the component, role or CSS operation being demonstrated. Generated React is a visual scaffold; implementation adds behavior and application data.

Undo design edits with **Ctrl+Z** (or **Cmd+Z** on macOS), including property fields and color edits. Redo with **Ctrl+Shift+Z** or **Ctrl+Y**. Text, CSS and comment editors keep their normal text Undo.

## Editable examples

Open **Guide** in the editor for a short folders/components/color-themes walkthrough with an interactive example. **Workspace menu → New project** offers Empty or a Light & Dark template: one shared Button/Card library, example boards, both palettes and optional theme folders. Parent components are available in children; theme-only extras stay local. See [projects and themes](docs/projects-and-themes.md).

[**Freegma-Studio.free**](examples/Freegma-Studio.free) is a portable example project containing **editable designs of Freegma itself**. A board is one canvas document; “native” means its text, frames, icons and layout are separate Freegma layers you can select and inspect.

It contains **11 screen examples**, each shown in Light Mode and Dark Mode: **22 screen boards**, plus **Shared studio components**—**23 boards in total**. The parent library has **14 shared component masters** used by those screens. The file also carries their color roles, themes and independent starting templates.

```text
Freegma Example Studio
  Shared studio components     masters reused by the screens
  Light Mode                   11 screen examples
  Dark Mode                    the same 11 examples in dark colors
```

These two sets are visual reference examples. For your own product, keep one set of shared components and boards, and switch their **Design theme**; use theme folders only for special extras.

Import the `.free` file from the workspace menu, or run:

```sh
yarn examples
yarn start
```

Overview, inspector/spacing, React/CSS, components, folders, dialogs/history, foundations and portable/import views are all editable. `yarn examples` preserves existing example edits. `node scripts/export-examples.mjs` rebuilds the distributable example from native design sources.

For a smaller hands-on tutorial, import [**Freegma-Feature-Tour.free**](examples/Freegma-Feature-Tour.free). It has **four boards**: Start here, Shared studio components, and one inspector screen in each theme folder. The card outline is deliberately bound to **Text**, so you can repeat the text-and-border color demo. Master edits and property overrides work as shown in the recordings.

The screenshot sources and captions for the README are in `docs/media/source/` and `docs/media/demos.json`. Optional documentation tooling: install Pillow in your Python environment, then run `python scripts/build-readme-media.py` to rebuild the GIFs. This is independent of `yarn build` and `yarn start`.

Project navigation reads lightweight workspace and board names, then loads the selected board. Assets loads the component library when opened. The canvas mounts visible frames with a nearby buffer; offscreen designs remain saved and appear as you pan. External edits use small revision checks and reload the active board only when it changes.

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

There are **31 tools** for projects, workspaces, boards, flows, deletion previews, operations, components, images, CSS/React, portable files, colors, comments, task references and Undo/Redo. Use `freegma_create_project` with `template: "empty"` or `"light-dark"`. Read current revisions before editing. Logs use stderr; stdout remains JSON-RPC.

## Flows: designs plus product logic

Choose **Workspace menu → New Flows workspace**. Add a **Frame** by choosing its design workspace, board and frame. Add **If**, **Repeat** and **End** steps, then select a step, choose **Connect**, and click the next step. Output/input ports also create connections.

[Editable feature mockups](examples/Flows-Feature.free) include the canvas, frame picker and transition inspector as three native design frames. Import this `.free` package to browse or edit the feature designs.

Example: `Home → click Buy → Signed in? → Yes → Checkout → Submit → End: Order confirmed`. A No branch can lead to Sign in; a Repeat arrow returns to Home. Select an arrow to choose Straight / If / Repeat, enter a title and explanation, and pick the exact source button in **Trigger element**. Final states have their own explanation and no outgoing arrows.

Drag steps, pan the empty canvas, zoom with Ctrl+scroll, and undo/redo with Ctrl+Z / Ctrl+Shift+Z. **Open frame** selects the original design layer. Existing components, themes and design workspaces stay intact; nothing is automatically converted into a flow.

Flow workspaces use the same stable `/w/workspace_ID/b/board_ID` links, task references, recoverable deletion and portable `.free` files. The manifest has `type: "flows"`; boards store `document.flow` nodes and edges plus undo history. SQLite still indexes file references only. Frame and trigger references store workspace, board, frame and optional element IDs. Original designs export separately: import those source `.free` workspaces too when moving a flow to another system. Missing sources are reported and can be replaced in the inspector; diagrams remain editable.

MCP: `freegma_create_flow_workspace({name})`, `freegma_flow_sources({boardId,frameId?})`, and `freegma_apply_flow({boardId,expectedRevision,operations})`. Operations add/update/remove nodes or edges atomically. Node kinds: frame / if / repeat / end. Edge actions: straight / if / repeat. Frame nodes require a `reference`; arrow `trigger` elements must belong to their source frame. Use the existing board read, Undo/Redo, export/import and task-link tools. Restart an already-running MCP connection after updating Freegma to discover the new tools.

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

### Flow layer on existing designs

Open any design board → **Flow layer** in the canvas toolbar → **＋ Transition**. Select the existing source frame, its triggering button (or frame state), and the target frame. Choose **Trigger event** (Click, Hover, Double click, Key press, Submit, Value change, Focus, Page load, State change or Timer). A small icon and event label appear beside the arrow title and in its hover details. Set Straight / If / Repeat independently, then add a short title and a longer description. For example: **Hover · Preview details** with an If action. These describe the flow; they do not run the interaction on the design. Saving an event change is one Ctrl+Z action and travels in the .free file. Older arrows infer Click when an element is linked, otherwise State change.

Arrows sit over the actual native frames. Hover an arrow or its title: the exact trigger lifts with a blue outline, and a popup offers the description, **Edit**, and **Remove**. Click its title to keep the popup open. Move frames, pan or zoom and the arrows follow. Turn the layer off to keep designing. Each saved edit is one Ctrl+Z action. The board’s `.free` file carries the flow layer; generated React contains only the artwork.

**Frame reference** adds a full-size linked frame from another workspace/board to this overlay, with a draggable Reference caption and an **Open original** link. Its native layers load only when visible and refresh when the source design or palette changes. Connect native frames and references, including exact source-button triggers. Reference removal leaves the source intact. Board exports store references; source designs travel separately. Separate **Flows workspaces** remain available for abstract charts. Feature mockups live in the Freegma project; this does not automatically map your product’s routes.

Try [Flow-Overlay-Example.free](examples/Flow-Overlay-Example.free): two example boards with actual canvas arrows and a linked source frame. [Flow-Overlay-Feature.free](examples/Flow-Overlay-Feature.free) contains five editable feature mockups: canvas overlay, hover popup, transition editor, cross-board references, and trigger icons/labels.
