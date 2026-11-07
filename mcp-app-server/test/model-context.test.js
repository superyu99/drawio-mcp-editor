import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The viewer tells the model what the diagram looks like when that differs
// from what the model sent: Mermaid converted to XML, a layout or routing
// pass, later changes. modelContextText decides whether and what. Its code
// runs in the app's HTML, so it is taken from the source of the template,
// with the template's doubled backslashes undone as the template does.

const source = readFileSync(new URL("../src/shared.js", import.meta.url), "utf-8");
const fn = source.match(/\nfunction modelContextText\([^)]*\)\n\{\n[\s\S]*?\n\}\n/);

assert.ok(fn, "modelContextText not found in src/shared.js");

const modelContextText = new Function(fn[0].replace(/\\\\/g, "\\") + "\nreturn modelContextText;")();

const xml = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
const mermaid = "flowchart TD\n  A --> B";

test("plain XML shown as sent is not repeated", function()
{
  assert.equal(modelContextText(xml, null, "none", false, false, 60000), null);
});

test("once sent, every later state is sent, as authored too", function()
{
  const text = modelContextText(xml, null, "none", false, true, 60000);

  assert.ok(text.endsWith("\n\n" + xml), text);
  assert.doesNotMatch(text, /laid out/);
});

test("Mermaid is sent as converted XML; revisions update the same named diagram", function()
{
  const text = modelContextText(xml, mermaid, "none", false, false, 60000);

  assert.match(text, /your Mermaid diagram converted to draw.io XML\)/);
  assert.match(text, /update_diagram\(\{name,xml\}\)/);
  assert.doesNotMatch(text, /pass it to create_diagram/);
  assert.ok(text.endsWith("\n\n" + xml));
});

test("a layout pass is named with its direction; revisions target current canvas", function()
{
  assert.match(modelContextText(xml, null, "horizontal", false, false, 60000), /laid out left to right\)/);

  const text = modelContextText(xml, null, "vertical", false, false, 60000);

  assert.match(text, /laid out top to bottom\)/);
  assert.match(text, /update_diagram\(\{name,xml\}\)/);
  assert.match(text, /Preserve other nodes and positions/);
});

test("a routing pass is named", function()
{
  assert.match(modelContextText(xml, null, "none", true, false, 60000), /with the connectors routed around the shapes\)/);
});

test("a diagram above the size limit is not sent", function()
{
  assert.equal(modelContextText(xml, mermaid, "none", false, false, xml.length - 1), null);
  assert.notEqual(modelContextText(xml, mermaid, "none", false, false, xml.length), null);
});
