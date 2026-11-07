---
name: drawio
description: Use for draw.io MCP diagrams in Cursor: discuss, inspect, revise the existing named canvas, explicitly create a new canvas, load saved .drawio, export, or perform visual QA. MCP tools take priority over any desktop CLI workflow.
---

# draw.io MCP — collaborative diagramming

**Default: preserve the existing diagram.** This is a named, interactive MCP canvas workflow, **not** the desktop `drawio` CLI or a `.mmd → .drawio → PNG` file pipeline. Never require a desktop binary or intermediate file when MCP tools are connected. Keep labels in the user's language.

## Intent gate (critical — before any write tool)

| User intent | Action |
|---|---|
| Discuss, critique, propose, explain an existing diagram | **Answer only. Do not mutate or create.** |
| Explicitly apply a change to the existing diagram | `get_current_diagram(name)` → modify its XML → **`update_diagram({name,xml})`** |
| Explicitly request a **new** diagram/canvas or an independent copy | `create_diagram({name,xml/mermaid})` |
| Continue editing an existing saved `.drawio` path | `load_diagram({path})` → get its assigned name → edit via `update_diagram` |
| Ambiguous target | `list_diagrams()`; if still ambiguous ask which diagram. **Never create a replacement.** |

A new name, a redesigned layout, or feedback about the diagram is **not** permission to create another canvas. Same-name `create_diagram` also makes a new suffixed canvas; never use it to overwrite. Do not silently modify on a suggestion-only turn.

## Human–Agent collaboration loop (core design)

**User requirement → Agent draws or revises → Agent inspects PNG and repairs → Human reviews → repeat.** The human can give feedback **or edit the same canvas directly**. Neither path starts a replacement diagram.

1. **Human requests.** First apply the intent gate: discussion means discussion; explicit edit means edit the existing diagram; only an explicit request for a new independent diagram means create.
2. **Agent implements and self-checks.** Use MCP to create/update, call `get_snapshot(name)`, **actually open/read the PNG**, and fix visual or mathematical defects before inviting human review. Repeat until the hard checklist below passes.
3. **Human reviews.** Show/identify the current named canvas and summarize what changed. The human may propose further corrections or use **Edit → Finish editing** to adjust nodes, routes, text or formulas personally.
4. **Agent resumes without erasing human work.** For verbal corrections, read current XML and update **in place**. After human edits, first call `get_diagram_changes(name)` to understand the edits, then `get_current_diagram(name)` to obtain the **latest** XML; preserve the person's changes and cell IDs. If intent is unclear, discuss/ask rather than overwrite.
5. **Loop.** After every Agent revision, take a **fresh** snapshot, inspect and repair, and offer the **same canvas** back to the human. No silent new canvases or unreviewed delivery.

## MCP workflow (existing diagram first)

1. **Locate**: use the exact known `name`; otherwise `list_diagrams()`. Tool names are scoped to the current MCP process and do not automatically survive restarts.
2. **Read**: `get_current_diagram({name})` is authoritative. Read `get_diagram_changes({name})` if the user edited via **Edit → Finish editing**; preserve those changes and stable cell IDs. If the user supplied a persisted file after restart, use `load_diagram({path})`, not `create_diagram`.
3. **Revise**: change only requested content/geometry. For an existing diagram, **always** `update_diagram({name,xml})`; keep the same name, pages, unaffected nodes, relationships and human layout. Do not recreate everything unless requested.
4. **New diagrams only**: choose Mermaid for straightforward standard flows; choose draw.io XML for precise layout, formulas, complex routes, grouping or fine control. `create_diagram` requires a semantic English kebab-case `name` and **exactly one** `xml` or `mermaid`. Use the assigned name in subsequent calls. `get_drawio_reference({format})` is an **on-demand syntax reference**, not a mandatory preflight for each edit. `search_shapes` only for required specialized icons.
5. **Visual QA is mandatory after a drawing change**: `get_snapshot({name})` → **open the returned PNG with an available image/Read tool and actually view it** → fix defects with `update_diagram` → re-snapshot. A path alone is not visual inspection. Do not reuse an old PNG or report success without checking. If image viewing is unavailable, disclose that QA is incomplete; never claim you inspected it.
6. **Deliver**: summarize the change to the **same named canvas**. `export_diagram({name,format:"png"|"drawio"})` only when a persistent file is requested. `get_snapshot` produces a fresh QA PNG path on the MCP machine. Do not invent paths. Viewer **Edit** commits human changes; **Open in draw.io** is an optional user-clicked online editor, separate from offline MCP collaboration.

## Visual composition (non-negotiable)

**Causality** — A processing node must have a meaningful source and an outgoing consumer, except intentional inputs/outputs. Show where values are produced. Put operations and equations inside the result node; edge labels name the transmitted data. Do not invent missing edges just to fill space: preserve the user's semantics.

**Geometry** — Use one dominant direction (usually top → bottom). Keep sequential stages on one axis, same-stage exchanges level, and merges centered on a single trunk. Align corresponding centers within **8 px** where feasible. Default starting sizes: ordinary boxes **160–220 × 60–90 px**, decision boxes **160–200 × 90–120 px**; scale with actual text/formulas. Typical clear gap between boxes **32–64 px** and between parallel lanes **48–96 px**; avoid long, empty connector runs. These are practical defaults, **not fixed grids**.

**Edges** — Connect to sensible side midpoints; prefer clean orthogonal routes, typically **0–2 bends**, short segments and unobstructed labels. Never let a line traverse an unrelated node, cut through text, leave its intended container unexpectedly, or join separate causal paths ambiguously. Prefer built-in routing / `routing:"libavoid"` or ELK when appropriate; **manually adjust exit/entry anchors or waypoints if automatic routing fails**. Preserve positions when using routing-only passes; ELK repositions nodes and must be rechecked. Draw.io does not guarantee obstacle-free routing by itself.

**Hierarchy** — Consistent typography (normally **13–16 px** body), readable contrast, clear text padding and 2–4 brief lines per node where practical. Restrict semantic accent colors to roughly **2–4 roles** plus neutrals; arrows, not color, determine reading order. Keep whitespace balanced and diagrams compact without crushing nodes.

**Visual acceptance gate (hard fail if any is present)** — Inspect the **actual newly generated PNG** at readable zoom; do not infer success from an XML or tool response:

- [ ] No unintended edge **passes through a node interior**, and arrows do not obscure node text or sit visibly on top of unrelated borders.
- [ ] No confusing **edge-edge crossings**, parallel edges merged into one indistinguishable path, or ambiguous joins/arrow directions. Legitimate intersections must remain visually distinguishable.
- [ ] Edges **inside a dashed/swimlane container** stay appropriately inside it; crossings at intended interfaces are deliberate, short and do not detour through unrelated groups.
- [ ] No labels collide with edges, other labels, borders or arrowheads; no text is **overflowing, clipped or unreadable**.
- [ ] No formula appears as **raw TeX/delimiters, error-colored output, clipped symbols, missing strokes or incorrect layout**; inspect appearance, not just whether MathJax returned successfully.
- [ ] Same-layer nodes are not misaligned (aim within **8 px** where appropriate), peer sizes and gaps are consistent, branches/merges are legible, and connectors are not needlessly long.
- [ ] Causal inputs, outputs and downstream consumers are represented; no accidental dead ends or visually detached calculation results.

**Fail → fix with `update_diagram` on the same canvas → fresh `get_snapshot` → inspect again.** If several local corrections cannot solve a topology issue, revise the overall layout, grouping or flow direction instead of endlessly nudging coordinates. If PNG cannot be viewed or a defect remains, state that limitation plainly; **do not mark visual QA as passed**.

## Math authoring (general rules)

- For draw.io XML with formulas, enable `<mxGraphModel math="1" ...>` and use `html=1;whiteSpace=wrap;` for the relevant labels. Correctly XML-escape attribute text (`&amp;`, `&lt;`, `&gt;`, quotes where needed). Preserve the intended mathematical meaning.
- Use `\(...\)` for inline math, `\[...\]` or `$$...$$` for standalone display math; **do not use single-dollar delimiters**. Maintain balanced delimiters and valid LaTeX environment structure. Do not impose obsolete bans on valid nested environments.
- Avoid Markdown backticks inside math-enabled labels (they can trigger AsciiMath). For literal code styling use XML-escaped HTML markup rather than math syntax.
- **Prefer short inline formulas in compact nodes**. Display formulas, multiline equations and tall expressions require explicitly larger boxes and extra padding; draw.io does not reliably auto-grow their height. Keep equations from colliding with borders or other labels.
- MathJax support does not prove every expression renders correctly in PNG. **Inspect the actual snapshot** for raw source, error styling, clipped glyphs, missing strokes or symbols, and bad spacing. If rendering differs, simplify layout or isolate the expression **without changing its meaning**, then recheck. A successful tool return is not a visual pass.

## Technical reference and execution boundary

- Use `get_drawio_reference({format:"xml"|"mermaid"})` **only when syntax/layout details are needed**. For concise XML patterns see `references/xml-essentials.md` alongside this Skill. The reference is guidance, not a prohibition on post-render QA or necessary custom edge routing.
- Existing `update_diagram` accepts the complete revised **XML**, not a Mermaid patch. Preserve valid graph structure (`mxCell` IDs and `mxGeometry`) and other pages.
- Core MCP functions are offline using bundled draw.io assets. `get_snapshot` uses the **official Editor** through the MCP server's own local headless browser, not the Cursor Viewer. Remote Cursor may use a client-local Editor asset host for Viewer/Edit; it does not affect server-side screenshots.
- The original desktop/CLI tutorial is archived in `references/desktop-cli-legacy.md` for explicitly requested non-MCP workflows. **Do not load or follow it in MCP sessions.**
