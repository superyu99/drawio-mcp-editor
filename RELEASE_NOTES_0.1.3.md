# v0.1.3 — MCP App export result hotfix (2026-10-18)

- Addresses the embedded PNG and Save .drawio error `Export did not return an absolute file path` when the MCP host wraps a successful result instead of exposing its direct path.
- Parse plain and nested MCP `CallToolResult`, JSON-encoded text results, and JSON-RPC style envelopes.
- When the host response cannot be verified, show a capped diagnostic response in the canvas; do not claim the file was saved.
- No changes to exported bytes, destination rules, snapshot rendering, formula handling, official Editor, imported document semantics, or core diagram tools.
- Keeps original official Skill text unchanged; only local extension instructions are updated.

## Limitation

The precise Cursor response shape was not available from the user's report; tests cover standard and wrapped variants. A Cursor integration check is still required. If the host returns an empty tool result, the new error displays that condition explicitly.
