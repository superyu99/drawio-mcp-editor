# v0.1.1 — Viewer Math Rendering

## Fixes

- Restore `math="1"` semantics on **every** standalone-Viewer `mxGraphModel` merge. Also detect explicit TeX delimiters in generated cell/wrapper labels when the upstream model omits the flag.
- Add a lazy MathJax runtime using the official `math4/es5/drawio-mathjax.min.js` and font assets from the Editor's existing loopback static host. Only use the official viewer CDN when no local Editor exists. Extend MCP App resource CSP domains for the local Editor host.
- Debounce streaming formula rendering, then force MathJax to finish before full-diagram screenshot and persistent PNG export. The exported SVG is independently typeset before rasterization, not just the on-screen labels.
- If MathJax cannot load or the exported SVG still contains unrendered TeX, return a diagnostic error **without reporting a successful PNG**. Editable `.drawio` XML export is unaffected.
- Add a math-specific test suite covering flags, labels, resource loading, errors, and SVG export safeguards.
- Update root README, full original Cursor Skill with a small additive enhancement section, version metadata, and release scripts.

## Operational notes

- Runtime with the bundled official Editor requires `vendor/drawio-webapp/math4/es5/drawio-mathjax.min.js` in addition to `index.html` and `js/app.min.js`. Existing full Editor bundles normally include it.
- Source ZIP excludes the full official Editor web assets. Run `scripts/bundle-editor.sh` on an authorized network-connected machine to create a portable bundle.
- Browser/Cursor CSP behavior and SVG formula fidelity still require on-device validation; the local tests use mocked MathJax APIs.
- This release does not change tool signatures, diagram naming, unique-current-file persistence, or snapshot UUID semantics.
