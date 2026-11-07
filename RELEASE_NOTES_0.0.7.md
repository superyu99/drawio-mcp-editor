# v0.0.7

- Full-view PNG export / editable `.drawio` export via host download when available, local file fallback. No Clipboard API.
- Saving Editor changes atomically replaces the one current XML document. Remove user-facing per-diagram revision metadata. Viewer re-initialized with edited XML; old chat UI requests latest stored XML instead of blindly replaying old tool result.
- `get_snapshot` waits for a briefly suspended viewer instead of returning `Active: none` prematurely; SVG Image onerror reports a diagnostic Error rather than `[object Event]`. PNG saved only after new successful render, with unique filename.
- Skill preserves official contents, edits only enhanced MCP section.

Limitations: Browser/Editor may still be blocked by Cursor sandbox. Full integration with live Cursor MCP Apps not tested in the packaging environment.
