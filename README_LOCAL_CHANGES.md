# v0.1.8 — Offline by default / Remote SSH forwarding

See `RELEASE_NOTES_0.1.8.md` for offline assets and fixed port forwarding.

# Local Editor + Snapshot experiment

This is the official `jgraph/drawio-mcp` source with an experimental Cursor MCP App Editor bridge.

## Behavior

- Existing local **stdio** transport remains unchanged (`node mcp-app-server/src/index.js --stdio`).
- The **Edit** toolbar button switches the MCP App from the existing Viewer into the **official draw.io Editor** (not a custom mini editor).
- Click **Finish editing** (the same button) to export current XML once, persist it as `/tmp/drawio-latest.drawio`, and return to Viewer.
- During editing no diagram XML is sent to `updateModelContext`. On commit, only a short pointer to the saved file is sent. The model can call `get_current_diagram` for the authoritative XML.
- A best-effort PNG export at Finish saves `/tmp/drawio-latest.png`. Alternatively the existing **Snapshot** button captures the Viewer. `get_snapshot` returns ONLY the absolute PNG path, never base64 or the image bytes.
- `get_snapshot` is a *last-captured* result; it does not remotely trigger a screenshot inside the live Cursor iframe.

## Editor assets

The MCP server does not contain the full draw.io Editor. At startup it looks for an installed **Draw.io Integration** (`hediet.vscode-drawio`) extension in `~/.cursor/extensions`, `~/.vscode/extensions`, and VS Code/Cursor server extension directories. The extension bundles a built offline editor under `drawio/src/main/webapp`.

For a custom location, set `DRAWIO_EDITOR_DIR` to a **built** draw.io `src/main/webapp` folder (must contain `index.html` and `js/app.min.js`). Its assets are served on an ephemeral **127.0.0.1** port by the same stdio process: no additional daemon needed.

Example Cursor MCP entry:

```json
{
  "mcpServers": {
    "drawio": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/drawio-mcp-main/mcp-app-server/src/index.js", "--stdio"],
      "env": {
        "VIEWER_PATH": "/ABSOLUTE/PATH/viewer-static.min.js",
        "DRAWIO_ICON_SERVICE_URL": "off"
      }
    }
  }
}
```

`VIEWER_PATH` is optional if your existing Viewer already works. It is shown above only if your environment requires a fully offline Viewer. Existing npm dependencies still need to be installed (`npm install` in `mcp-app-server`), just as for the original server. No *additional* npm dependencies are introduced.

## Tests / limitations

- `node --check mcp-app-server/src/{index,shared,editor-host}.js` (run each file separately)
- `node --test mcp-app-server/test/editor-host.test.js`
- The complete edit loop still **needs to be tested in your Cursor**: MCP Apps iframe nested-frame permissions/CSP and the offline Editor's sandbox behavior vary with the host. If blocked, Edit shows **Editor blocked · Close** after 10 seconds; click to leave without changing the original Viewer.
- This integration is for **stdio Node.js on the local machine**; other deployment modes without a local Editor continue to work in Viewer-only mode.
- The only files intentionally persisted by this feature are `/tmp/drawio-latest.drawio` and `/tmp/drawio-latest.png`; they are per-process-global rather than multi-document storage.
