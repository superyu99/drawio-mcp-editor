import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTagMap,
  searchShapes,
  searchShapesWithMeta,
} from "../../shared/shape-search.js";

const SHAPE_INDEX =
[
  { style: "image;html=1;image=img/lib/clip_art/general/Battery_100_128x128.png", w: 128, h: 128, title: "Battery 100", tags: "battery charge power clip art" },
  { style: "image;html=1;image=/img/clipart/Gear_128x128.png", w: 128, h: 128, title: "Gear", tags: "gear settings clip art" },
  { style: "shape=image;imageAspect=0;image=https://example.com/abs.png", w: 40, h: 40, title: "Absolute", tags: "absolute remote" },
  { style: "shape=image;image=data:image/png,iVBORw0KGgo=", w: 40, h: 40, title: "Data URI", tags: "embedded inline" },
  { style: "rounded=1;whiteSpace=wrap;html=1;", w: 120, h: 60, title: "Box", tags: "box rectangle" },
];
const TAG_MAP = buildTagMap(SHAPE_INDEX);

function styleOf(query)
{
  const results = searchShapes(SHAPE_INDEX, TAG_MAP, query, 5);

  assert.equal(results.length, 1, "expected exactly one result for " + query);

  return results[0].style;
}

test("relative image paths are rewritten to absolute app.diagrams.net URLs", function ()
{
  assert.equal(styleOf("battery"),
    "image;html=1;image=https://app.diagrams.net/img/lib/clip_art/general/Battery_100_128x128.png");
  assert.equal(styleOf("gear"),
    "image;html=1;image=https://app.diagrams.net/img/clipart/Gear_128x128.png");
});

test("absolute, data URI, and non-image styles are left untouched", function ()
{
  assert.equal(styleOf("absolute"), "shape=image;imageAspect=0;image=https://example.com/abs.png");
  assert.equal(styleOf("embedded"), "shape=image;image=data:image/png,iVBORw0KGgo=");
  assert.equal(styleOf("box"), "rounded=1;whiteSpace=wrap;html=1;");
});

test("strong flag reflects exact full-term coverage", function ()
{
  // Every term exact-matched by the best result
  assert.equal(searchShapesWithMeta(SHAPE_INDEX, TAG_MAP, "clip art", 5).strong, true);

  // "panel" hits nothing, "battery" is exact — OR fallback, not strong
  assert.equal(searchShapesWithMeta(SHAPE_INDEX, TAG_MAP, "solar battery", 5).strong, false);

  // Soundex-only match ("botery" ~ "battery") is not strong
  assert.equal(searchShapesWithMeta(SHAPE_INDEX, TAG_MAP, "botery", 5).strong, false);

  // No match at all
  assert.equal(searchShapesWithMeta(SHAPE_INDEX, TAG_MAP, "zzzz", 5).strong, false);
});
