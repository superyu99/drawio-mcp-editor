# drawio-mcp-editor-snapshot-0.0.2

Based on the existing `0.0.1` source package. No further browser editing features were added.

## Changed

- **Edit** button has a high-contrast blue treatment, remains readable in compact toolbar mode, and becomes **Finish editing** after Editor initialization.
- Removed the manual **Snapshot** button.
- **get_snapshot** triggers a new full-diagram PNG capture *when called*, waits for the live MCP App canvas to render and save it, then returns **only** the generated absolute path, e.g. `/tmp/drawio-<UUID>.png`.
- Images are never captured automatically on initial render, graph changes, or Finish editing, nor loaded from a prior screenshot file.
- The viewer exports all cells independently from the current zoom/pan; in Edit mode the official Editor's PNG export is requested.
- Internally, the canvas polls `poll_snapshot` for pending requests, then uploads only that specific render through `submit_snapshot`. `poll_snapshot` and `submit_snapshot` are hidden from the model (MCP Apps `visibility: ["app"]`).
- Failures or missing active canvas report errors instead of returning an outdated PNG path. Screenshot time-out is 20 seconds.

## Local install

Extract the ZIP and in `mcp-app-server/` run `npm ci --omit=dev` (Node.js 18+). Configure Cursor stdio MCP to run `node <absolute-path>/mcp-app-server/src/index.js --stdio`, and reload the Cursor window. `DRAWIO_EDITOR_DIR` still needs to point to locally available draw.io Editor web assets if automatic discovery fails; this behavior is unchanged from v0.0.1.

## Tests

Run: `cd mcp-app-server && node --test test/snapshot-on-demand.test.js test/snapshot-ui-contract.test.js test/editor-ui-contract.test.js test/editor-host.test.js test/local-tool-registration.test.js`

The local source checks, bridge tests, and editor static-host tests have passed. An end-to-end test inside Cursor's MCP Apps sandbox has **not** been run here. In particular, simultaneous model `get_snapshot` and canvas `app.callServerTool` behavior must be verified in Cursor itself. A live rendered canvas is required; no canvas/sandbox communication results in a clear error, not a fake image.
