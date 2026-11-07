# drawio-mcp-editor-snapshot-0.1.13

- Restored **Open in draw.io** as an explicitly user-triggered link to the official online `https://app.diagrams.net` editor. Core local/Remote SSH Viewer, Edit, MathJax and PNG remain offline.
- Details in `RELEASE_NOTES_0.1.13.md`.

# drawio-mcp-editor-snapshot-0.1.12

- Fixed `Open in draw.io` to open the bundled **client-local** official Editor in offline Node/Remote SSH mode rather than hardcoded `https://app.diagrams.net`.
- Exposes a link and Copy URL fallback when Cursor blocks or ignores external browser opening, with direct errors for unavailable Editor origin.
- Keeps all existing Viewer/Edit and server-side official PNG export behavior. Details: `RELEASE_NOTES_0.1.12.md`.

# drawio-mcp-editor-snapshot-0.1.9

见 `RELEASE_NOTES_0.1.9.md`：保留官方编辑器与离线截图，增强 Finish 失败原因、暗色工具栏可读性，修复截图公式环境重复计数，补充简洁的绘图/编辑 Agent 约束。

# drawio-mcp-editor-snapshot-0.1.7

## Fixes

- Fixed raw TeX in official Editor PNG snapshots: `load` the XML first, wait for local MathJax typesetting, then `export` without resending XML.
- Detect failed or incomplete formula output and return `MATHJAX_RENDER_FAILED` instead of saving a broken PNG.
- Retains v0.1.6 spinner fix and prior Viewer/Edit functionality.

# drawio-mcp-editor-snapshot-0.1.6

## Fixes

- Fixed official Editor snapshot/export hang in v0.1.5 by removing the erroneous `spin:false` field from the export `postMessage` payload generated in `mcp-app-server/src/editor-host.js`.
- This restores the official `action:"export"` flow used by `get_snapshot` and `export_diagram(format:"png")`.
- Updated tests and version strings to `0.1.6`.

## Notes

- No change to Viewer/Edit collaboration flow.
- No return to Viewer polling snapshots.
- Still relies on the existing bundled official Editor assets and a local Chrome/Edge/Chromium executable for hidden export.

# drawio-mcp-editor-snapshot-0.0.1

## Fixes

- Corrected `_meta.ui` for `get_current_diagram`, `submit_snapshot`, and `get_snapshot` in `mcp-app-server/src/shared.js`; preserves `save_diagram` visibility.
- Added `mcp-app-server/test/local-tool-registration.test.js` to catch this registration error in future edits.

## Known limitation

- `Editor assets not found` is **not** a fatal MCP error but the full Editor will not work until `DRAWIO_EDITOR_DIR` points to a **built** draw.io webapp containing `index.html` and `js/app.min.js` (or Draw.io Integration's installed assets are found).
- Cursor MCP Apps sandbox compatibility of the embedded Editor remains unverified on the user's machine.
- `get_snapshot` returns a local image path only after a snapshot was created successfully.

## Install / diagnostic

1. Extract this ZIP into a new directory (avoid mixing with an old source tree), then install dependencies inside `mcp-app-server` with `npm ci --omit=dev`.
2. Point Cursor's stdio MCP configuration at the new absolute `mcp-app-server/src/index.js` path and reload the window.
3. Verify the metadata before reload with `node --test mcp-app-server/test/local-tool-registration.test.js`.
4. If the editor assets warning appears, find the Draw.io Integration extension's `drawio/src/main/webapp` directory and configure `DRAWIO_EDITOR_DIR` in Cursor's MCP `env`.

## Tests run here

- JavaScript syntax checks for server source and the new test.
- Dependency-free registration regression test (four tools).
- Editor host unit test (Node local loopback).

The complete MCP stdio startup with npm dependencies and the embedded Cursor Editor were not verified in this runtime.
