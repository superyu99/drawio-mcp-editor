# drawio-mcp-editor-snapshot v0.0.5 — Named Diagrams

Based on v0.0.4 (local stdio MCP App, on-demand full-diagram PNG snapshots, experimental embedded Editor).

## Changes

- `create_diagram(name, xml|mermaid)` now **requires** an English kebab-case semantic name (1–64 chars, e.g. `dit-architecture`). Its response carries the **assigned** name.
- Duplicate names **within the same MCP process** are allocated `-2`, `-3`, etc. The original diagram is not overwritten.
- A name is registered when the tool creates the diagram. XML diagrams are saved immediately; Mermaid diagrams register immediately and save the converted XML when the browser finishes conversion.
- Canvas toolbar displays the assigned semantic name. No random frontend canvas ID.
- `list_diagrams()` lists `{name, path, revision}` for every registered diagram, even before an edit.
- `get_current_diagram(name)` retrieves saved XML. `save_diagram(name,xml)` is an internal UI tool.
- `get_snapshot(name)` triggers a fresh full-diagram capture of the **currently live** named canvas, returning only its unique PNG path; no cache or manual Snapshot button. An omitted name is accepted only when exactly one active canvas exists.
- Distinct Cursor stdio processes use separate private temp directories. The same name in a different process does not collide.

## Upgrade warning (tool signature change)

MCP API changes from `canvasId` to `name`; `create_diagram` additionally requires `name`. Older chats/widgets from v0.0.4 are not compatible with the new tool argument names. Reload Cursor, start a **new chat**, and create a **new diagram** to test. Existing named diagrams in the previous process are not migrated automatically.

## Installation

Extract this ZIP over a copy of your existing `drawio-mcp-main` folder. Run `npm ci --omit=dev` in `mcp-app-server` if dependencies are missing, and reload Cursor. The plugin's stdio entry point is unchanged: `node /absolute/path/drawio-mcp-main/mcp-app-server/src/index.js --stdio`.

## Scope and limitations

- Names are unique only **within one MCP process**, not across all Cursor processes. No cross-window shared registry was added.
- In-process registry is lost after process restart. Stored XML stays in a per-process `/tmp/drawio-mcp-*` directory until the OS removes it, but this version does not reload old registries.
- A snapshot requires a live MCP App UI that can answer the on-demand request; an inactive/closed canvas is reported as an error, not a stale picture.
- The base v0.0.4 ZIP does not include the complete official draw.io Editor assets. As before, use `scripts/bundle-editor.sh` when you want the experimental Editor to work, then distribute the newly generated package. The Cursor iframe/editor bridge is not fully end-to-end verified here.
- Node syntax and focused unit/contract tests passed. Full MCP integration tests require the npm dependencies not present in this build environment.
