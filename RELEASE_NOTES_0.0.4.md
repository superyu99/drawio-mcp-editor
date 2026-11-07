# drawio-mcp-editor-snapshot-0.0.4

## Multi-window isolation

- Editor static server continues to bind a **different ephemeral loopback port per process**, and now calls `server.unref()` so it cannot keep an orphaned stdio process alive on its own.
- Removed the shared `/tmp/drawio-latest.drawio` write target. Each MCP process uses a private `/tmp/drawio-mcp-XXXXXX/` directory; each canvas has its own `.drawio` file.
- `get_current_diagram` reads the sole saved diagram by default, or accepts optional `canvasId`. Multiple saved diagrams now produce an explicit ambiguity error rather than returning another canvas's XML.
- `get_snapshot` keeps **on-demand fresh rendering** and unique PNG filenames. If multiple live canvases exist in one MCP process, pass `canvasId`; otherwise the tool refuses to guess.
- Added `list_diagrams` to list live canvas IDs and saved file paths in the current MCP process. `save_diagram` is still app-only and now sends its `canvasId`.
- Snapshot polling claims each request once, preventing duplicate UI work during concurrent polls.

## No unwanted workflow changes

- Edit/Finish editing toggling is unchanged. Snapshot toolbar button remains absent.
- `get_snapshot` still returns **only the path** after a successful new capture; it does not cache, auto-refresh or reuse images.
- No additional manual startup step: Cursor still launches the `--stdio` server automatically.

## Known limitations

- A stdio MCP connection does not intrinsically identify which Cursor window invoked a model tool. If Cursor shares one server among multiple windows, the Agent must specify `canvasId` when more than one canvas is active. This patch prevents silent wrong-canvas selection; it cannot magically infer the calling window.
- In-memory canvas registrations survive only while the MCP process is running. Temporary diagram files remain on disk in the returned per-process directory but are not automatically registered after restart.
- The **complete draw.io Editor web assets are not included** in this source package; the 0.0.3 `scripts/bundle-editor.sh` flow still applies. Browser iframe/CSP compatibility requires Cursor verification.
- The build environment has incomplete npm dependencies: targeted Node tests run, but full integration tests require `npm ci` on a connected machine.

## Tests

`cd mcp-app-server && node --test test/multi-window.test.js test/snapshot-on-demand.test.js test/local-tool-registration.test.js test/editor-host.test.js test/editor-ui-contract.test.js test/snapshot-ui-contract.test.js`
