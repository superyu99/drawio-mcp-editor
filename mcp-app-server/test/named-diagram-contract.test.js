import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
test('create_diagram requires a semantic name, allocates an ID and sends it back to UI',()=>{
  assert.match(src,/name: z\.string\(\)\.regex\(/);
  assert.match(src,/var assignedName = diagrams\.create\(name\)/);
  assert.match(src,/var assignedName = diagrams\.create\(name,normalizedXml\)/);
  assert.match(src,/var xmlPayload = \{ name: assignedName/);
  assert.match(src,/var mermaidPayload = \{ name: assignedName/);
  assert.match(src,/setDiagramName\(parsed\.name\)/);
  assert.match(src,/id="diagram-name"/);
});
test('all diagram-level tools use names, not browser-generated timestamp IDs',()=>{
  assert.doesNotMatch(src,/snapshotCanvasId|canvas-['"] \+ Date\.now/);
  for(const tool of ['save_diagram','get_current_diagram','get_snapshot']){
    const start=src.indexOf(`registerAppTool(server, "${tool}",`);
    assert.ok(start>=0);
    const input=src.slice(start,src.indexOf('}, async',start));
    assert.match(input,/inputSchema:\s*\{name:/);
    assert.doesNotMatch(input,/canvasId/);
  }
  assert.doesNotMatch(src,/pollSnapshotRequests|poll_snapshot/);
});
