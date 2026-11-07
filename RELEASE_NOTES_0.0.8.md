# v0.0.8 — Human edits and named-canvas collaboration

- Every changed human **Finish editing** appends exactly one event to per-diagram `.changes.jsonl`; `get_diagram_changes({name})` returns ordered events, never merging or clearing them.
- Lightweight `mxCell` ID-based diff: added, removed, modified labels, positions, sizes, style, parent, source/target and geometry. Compressed and uncompressed `.drawio` pages supported. No full XML diff/history.
- Agent `update_diagram({name,xml})` updates the same named file. App-only `poll_diagram` reloads the viewer when the file changes.
- Saving human edits optionally submits a concise change summary via `app.updateModelContext`, and requires the original document hash so a concurrent Agent update cannot be overwritten.
- Official Skill original content is retained; only the local extension section is updated.
- Full Editor must be separately bundled by `scripts/bundle-editor.sh` unless already present under `vendor/drawio-webapp`.
