# Folders, components and themes

Open **Guide** in the editor header for the simple guide and an interactive Light/Dark example. Its address is `/guide`. The example changes only its preview, not your saved designs.

## Start a project

Open the workspace menu → **New project**. Choose:

- **Light & Dark template**: one shared Button and Card library, Shared components, Example dashboard and guide boards, two color themes, and Light Mode / Dark Mode folders for optional extras.
- **Empty project**: one blank board, no library components and no child folders. The original local-color workflow stays available.

Each project gets new IDs and its own portable `.free` documents. Existing workspaces stay intact.

```text
My project
  Shared library: Button, Card, Navigation
  Shared boards: Dashboard, Settings
  Light Mode                 optional extra boards/components
  Dark Mode                  optional extra boards/components
```

The library belongs to a workspace; it does not need a Components subfolder. Parent components appear in the **Assets** tab of every child, labeled “Shared from My project”. Child components stay in that child and its descendants. A Dark Mode glow effect is a good child-only extra; the same Button in different colors is a shared component.

Open **Shared components**, edit a master. Every saved edit publishes automatically. Its instances update across the project’s boards and child folders. Instance overrides are preserved. Update a shared master from its owning project; use Save component in a child to create a separate theme-specific extra.

## One schematic, several palettes

The **schematic** is the list of semantic roles. A **theme** supplies a color value for every role.

| Role | Light Mode | Dark Mode |
| --- | --- | --- |
| Background | `#F3F3F7` | `#101219` |
| Surface | `#FFFFFF` | `#1B1E27` |
| Text | `#30313B` | `#E8EAF3` |
| Accent | `#7864FF` | `#AE9BFF` |

Select a layer → find its Fill, Stroke or Text color → choose **Color role**. For example, bind a Card fill to Surface and its title to Text. Open **Colors → Design theme** and switch Light Mode / Dark Mode: the same component and layout use the selected palette.

Keep **Local color** for an exact color that should stay unchanged, such as a logo or the example board’s pink dot. Changing a literal color detaches that property’s role binding.

Children inherit the parent’s role structure and palettes. Their active theme can differ: the starter’s Light Mode folder uses Light, and Dark Mode uses Dark. Shared parent boards can switch between both. The editor’s header Dark / Light switch changes editor appearance; it is separate from artwork themes.

Use **Colors** to add/remove roles, copy a new theme, rename themes or edit values. New themes copy the full current schematic and values. Adding a role makes it available in every theme. Removing a role preserves existing artwork by detaching its current colors. Insert **Color schematic** from Assets to show clickable theme swatches on a board.

Color picker dragging previews the open design. Closing it, saving or changing workspace accepts one action; Escape cancels. Ctrl+Z undoes the accepted color action.

## A small example

1. Create “My product” with the Light & Dark template.
2. Open **Example dashboard**. Its Card and Button are instances from the shared parent library.
3. Select **Colors → Light Mode**, then **Dark Mode**. Geometry and components stay the same; role-linked colors change. The local pink dot stays pink.
4. Open **Shared components**, change the Card radius. The example Card and any child instances update.
5. Open Dark Mode, create a board and save a glow or other theme-only component there. Light Mode keeps the common parent library without that extra.

Use **New workspace** to add a child to an existing folder. Use **New parent folder** and **Move workspace to folder** to organize existing workspaces. A workspace’s own existing palette takes precedence over inherited colors; moving an old independent project does not silently replace its colors or library.

## Share and move

**Copy link** points to an exact workspace and board. Renaming preserves the link. Export the **parent workspace .free** to include shared definitions, assets and all child folders. Exporting a child or one board separately includes snapshots of inherited definitions and colors so the file can travel alone. Importing that standalone file creates an independent library; import the whole parent when you want to retain shared parent/child relationships.

Files stay under `data/workspaces/workspace_ID/`, with `workspace_ID.free`, `b/board_ID.free` and `Assets/`. SQLite holds only file references. For a manual filesystem move, stop the server/MCP editors and copy every project/child directory together. Portable export is simpler for migrating a complete hierarchy.

## Find and verify a shared component

Layers show **Master** for a source and **Instance** for a linked use. Selecting a child text/icon also resolves to its enclosing component. The inspector’s **Component reference** shows the name, owner, stable component ID, local overrides and counts of linked uses and boards.

Use **Go to main component** to open and select the source. **Show linked usages** lets you navigate to each instance. Change the master’s padding or radius: all non-overridden uses update automatically. Undo/redo on the master propagates too. Editing an instance’s label creates a local override; master changes preserve it. Detach an instance to make it independent.

The Light & Dark starter has two linked Cards and Buttons in the same example so you can verify one source changes both. Parent Assets are shared by child folders; theme colors resolve where each instance is used. Templates create independent copies; they do not update with their source.


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
