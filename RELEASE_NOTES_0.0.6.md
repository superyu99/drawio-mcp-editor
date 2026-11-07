# v0.0.6 — Documentation, Cursor Skill, process identity logs

- Rewrote the root README in Chinese with a release history (v0.0.1–v0.0.6), first install, offline editor bundling, upgrades, Cursor stdio configuration, Skill installation, multi-window diagnostics, and limitations.
- Kept the official Cursor `drawio` Skill body unchanged; prepended an additive local-MCP section documenting named diagrams, `get_snapshot` on-demand, reading images, list/read operations, and Edit / Finish editing.
- Printed structured `[drawio-mcp]` lifecycle logs to **stderr only**: `start`, `ready`, `signal`, `exit`, `fatal`. Each includes package `version`, OS `pid`, `ppid`, unique `instance` UUID, `mode`, `entry` absolute path, `buildId`, timestamp, and relevant event details.
- Emphasized that a Cursor Shared MCP process may be used by multiple Cursor windows: PID/instance identify the MCP process, not the window/chat.
- Updated bundled Editor release script version to `0.0.6`.

Validation: `node --check src/index.js`; `node --test test/runtime-identity.test.js`; additional relevant dependency-free tests. Full stdio/MCP integration needs installed npm dependencies and a running Cursor host.

**Packaging:** source ZIP does not include the official Editor static webapp because upstream network download is unavailable in this build environment. On a network-enabled build machine, run `bash scripts/bundle-editor.sh` to emit a self-contained v0.0.6 ZIP with the editor included.
