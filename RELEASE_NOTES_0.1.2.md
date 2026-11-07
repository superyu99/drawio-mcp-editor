# v0.1.2 — Load Diagram (2026-10-18)

- Adds `load_diagram({path})` to recover saved `.drawio` files in a new interactive MCP App card. Path must be absolute and the file ≤5 MB.
- Import creates a temporary named canvas; collisions use `-2`, `-3`. Agent receives compact metadata, Viewer calls `get_current_diagram` for original XML.
- Original XML (including all pages, formula settings and compressed pages) is preserved byte-for-byte in the current session work file.
- Import and Finish editing never modify the source file. Explicit Save .drawio / `export_diagram(format: "drawio")` writes back to the original path only when its content fingerprint has not changed externally; atomic overwrite, no versions.
- PNG export and `get_snapshot` keep v0.1.1 behavior. Imported source file metadata is scoped to the current MCP process; no automatic recovery, history, database, or workspace manager.
- Official Cursor Skill kept intact; only the local extension section is amended.
- v0.1.1's Viewer, math rendering and Edit subsystem is not replaced.

## Verification

- Local import, name collision, no-change-on-load, overwrite-on-explicit-export, external-modification protection, and full multi-page content tests.
- Full Cursor MCP App UI integration must be verified in Cursor (historical card is intentionally not revived; tool creates a new card).
- Complete Editor assets are not bundled in the source-only ZIP; retain existing resources or run `scripts/bundle-editor.sh` on a connected build machine.
