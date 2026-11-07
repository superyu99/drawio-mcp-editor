# v0.1.0 — Local Export

## Changes

- The inline **PNG** button renders the full named diagram and saves it to the local MCP process's default `~/drawio-exports/<name>.png`; **Save .drawio** exports the authoritative single current XML document to `<name>.drawio` in the same directory.
- No browser download, Clipboard API, or modal `alert()` in the new export flow. The embedded card reports the **actual absolute path** after the server confirms the atomic write, or a clear inline error if export fails.
- `DRAWIO_EXPORT_DIR` optionally overrides the default. The directory is created when first needed. Exporting the same name/format replaces the same destination file without retaining history.
- New model tool `export_diagram({name,format:"png"|"drawio"})` exports directly and returns the path. PNG requires a responsive MCP App canvas and a fresh verified render; drawio XML does not require an active canvas.
- `get_snapshot({name})` is unchanged: fresh on-demand, complete-drawing PNG under a unique random `/tmp/` path for Agent QA. It never silently returns the persistent exported PNG.
- README, complete official Skill with additive local protocol section, and release bundling script updated. Original official Skill body is not trimmed.

## Important distinctions

- The export directory is **on the computer running the stdio MCP Node.js server**. It is not the sandbox/browser's Downloads directory.
- Named diagrams remain isolated between distinct MCP processes, but **the persistent export directory is shared by default**. Two processes explicitly exporting the same semantic name will overwrite the same output path. Set different `DRAWIO_EXPORT_DIR` values to avoid this.
- This source-only archive does not include the complete official Editor web resources; reuse an existing `vendor/drawio-webapp` or build them with `scripts/bundle-editor.sh`.
- Browser/UI-end-to-end behavior must still be verified in the user's Cursor version.
