# Bundled draw.io Editor

The local stdio MCP serves the **official complete draw.io Web Editor** from
`mcp-app-server/vendor/drawio-webapp/` on a loopback port (ephemeral for MCP snapshots; a separate local asset host can use a fixed port). The
Editor static webapp is distinct from `viewer-static.min.js` and is not supplied
by the VS Code extension alone.

To create a portable package on a network-connected build machine:

```bash
bash scripts/bundle-editor.sh
```

The script checks out the pinned upstream `jgraph/drawio` revision, includes its
license/version information, and creates `drawio-mcp-editor-snapshot-0.1.10.zip`
next to the repository folder. Verify that the output contains
`mcp-app-server/vendor/drawio-webapp/index.html` and `js/app.min.js`.

npm dependencies must still be installed (`npm ci --omit=dev`) or provided by an
authorized offline mirror. No `DRAWIO_EDITOR_DIR` environment setting or
`hediet.vscode-drawio` extension is required when the webapp is bundled.

Bundling assets fixes *missing Editor files*, not the separate question of
whether a specific Cursor MCP Apps sandbox allows loading the nested localhost
Editor. Validate Edit → Finish editing in your Cursor version.

For complete installation instructions and release notes, see [README.md](README.md).

For v0.1.5, math typesetting in the inline Viewer loads the official math bundle
from the same local resource host: `math4/es5/drawio-mathjax.min.js`.
Verify this file exists alongside `index.html` and `js/app.min.js`.


## Strict offline deployment (v0.1.8)

Node MCP defaults to `DRAWIO_OFFLINE=1`. **No public CDN scripts are used** for
Viewer, ELK, Mermaid or libavoid; the assets must be included in the locally
installed official Editor directory. Startup fails with `DRAWIO_OFFLINE: ...` if
any bundle is missing. The icon search network service is disabled and CDN ETag
checks are skipped. `get_snapshot` uses the remote/local Editor and headless
Chrome on the **same machine**, without any outside network access.

For Remote SSH (v0.1.10), use **client-local** official Editor assets for
Viewer/MathJax/Edit. Start one client-local resource host with
`node mcp-app-server/src/serve-local-editor.js` (default 127.0.0.1:41391),
configure the **remote MCP process** with
`DRAWIO_VIEWER_EDITOR_URL=http://127.0.0.1:41391` and **unset** the old
`DRAWIO_EDITOR_PORT=41391`. The remote MCP snapshot host uses an ephemeral port,
so multiple Cursor processes can coexist. No SSH port forwarding and no Internet.

Keep the local resource host running and ensure its `vendor/drawio-webapp`
assets are present. The local resource host serves only official assets; it
stores no user diagrams and is not an MCP server. `get_snapshot` remains fully
on the remote host and does not talk to the local resource host. Both computers
need their own copy of the offline Editor assets.

Existing diagrams containing external HTTP(S) images/fonts may still need those
external assets; replace them with bundled shapes/data URIs for fully offline
rendering. `Open in draw.io` URLs are optional external links, not required for
Viewer, Edit, or PNG export.
