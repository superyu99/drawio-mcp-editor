# v0.1.4 — Snapshot Reliability (2026-10-19)

Based on **v0.1.3**, preserving draw.io Viewer/Editor/MathJax, named diagrams, `load_diagram`, human-edit changes, and both local export buttons.

## Behavior

- Screenshot capture is still **strictly on demand**; successful `get_snapshot` returns **only** a brand-new random absolute PNG path after validation and disk write. Never return a stale image.
- Default overall timeout raised from 20,000 to **90,000 ms**, claim timeout **25,000 ms**, active heartbeat TTL **15,000 ms**. Configurable using `DRAWIO_SNAPSHOT_TIMEOUT_MS`, `DRAWIO_SNAPSHOT_CLAIM_TIMEOUT_MS`, and `DRAWIO_CANVAS_TTL_MS` in MCP env.
- The Viewer reports which rendering stage it reached through a new app-only `snapshot_progress` tool: refreshing XML, preparing render, MathJax typesetting, exporting SVG, rasterizing SVG, encoding PNG, submitting PNG.
- Capture errors are machine-readable JSON text with reason code (`CANVAS_NOT_RESPONDING`, `SNAPSHOT_TIMEOUT`, `SNAPSHOT_RENDER_FAILED`, `SNAPSHOT_INVALID_PNG`, `DIAGRAM_RESOLUTION_FAILED`), name, UUID, status, stage, timings, stage timeline, heartbeat and actionable next step.
- Server logs `[drawio-snapshot]` structured events to stderr (`requested`, `claimed`, `progress`, `saved`, `failed`). This preserves evidence if a Cursor client disconnects before the result is delivered.
- No extra browser/CLI fallback, no automatic snapshots and no history files. The internal progress mechanism is best effort; if MCP Apps blocks a new progress tool, the screenshot still proceeds, and the diagnostics fall back to the latest observed stage.

## Caveat

Cursor can abort its tool call earlier than the server's 90s timeout. In that case the model may not receive the structured error. Use the stderr logs or reduce the server timeout below the host timeout. Full real Cursor MCP App rendering cannot be verified in the packaging environment.

## Tests

Run `cd mcp-app-server && node --test test/snapshot-reliability.test.js test/snapshot-on-demand.test.js test/snapshot-ui-contract.test.js test/snapshot-full-diagram-regression.test.js`.
