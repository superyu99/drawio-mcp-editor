# v0.0.9 — Full-diagram PNG snapshot correctness

## Root cause (v0.0.8)

The viewer incorrectly called `Graph.getSvg(null, 1, '#ffffff', 8)`.
The official draw.io signature is `getSvg(background, scale, border, nocrop)`.
Passing `'#ffffff'` as the numeric `border` produces invalid (`NaN`)
SVG dimensions, and Chromium can silently use its intrinsic 300×150 size.
Agent screenshot tools then read a valid but cropped/misleading PNG.

## Fixes

- Call `graph.getSvg('#ffffff', 1, 8, false)` — native draw.io full-diagram export; independent of the chat iframe's pan/zoom and 300×150 fallback viewport.
- Reject SVGs with absent/non-numeric dimensions and exports whose dimensions do not cover the visible cell model, before any PNG is generated.
- Use explicit SVG export dimensions rather than the browser's `image.naturalWidth` fallback; reject unexpected rasterization dimensions.
- Cap canvas to 8192 per side / 32 million pixels while retaining the whole content; never crop silently.
- On `submit_snapshot` pass raster dimensions, verify the PNG IHDR dimensions match on the MCP server before writing a UUID file. The human `PNG` export uses the same corrected frontend function; PNG file helpers validate IHDR dimensions in both cases.
- Update MCP tool description, original-official-plus-local Skill, and README: Agents must report any snapshot error rather than searching old files or switching to Chrome/Puppeteer/CDN without explicit instructions.

## Tests and limitations

- Added `snapshot-full-diagram-regression.test.js` to catch the wrong argument order, `NaN` SVG, false 300×150 outputs, incomplete content bounds, and incorrect PNG headers. A mocked frontend export verifies it requests full 1140×940 output rather than the chat viewport.
- Optional real Chromium browser smoke test: `DRAWIO_BROWSER_TEST=1 node --test test/snapshot-full-diagram-regression.test.js`. In the packaging environment `/usr/bin/chromium` failed to start within the timeout, so this is **not** claimed as passing.
- Real Cursor MCP App iframe/CSP full-diagram export still needs user-side validation; screenshot errors continue to be surfaced explicitly, not worked around.
- As before the source ZIP omits the complete draw.io Editor assets; preserve an existing `vendor/drawio-webapp` or run `scripts/bundle-editor.sh` on a network-connected builder.
