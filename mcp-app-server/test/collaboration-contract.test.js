import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
const skill=fs.readFileSync(new URL('../../plugins/cursor/skills/drawio/SKILL.md',import.meta.url),'utf8');
const legacy=fs.readFileSync(new URL('../../plugins/cursor/skills/drawio/references/desktop-cli-legacy.md',import.meta.url),'utf8');

test('Finish editing saves human event once and includes conflict token',()=>{
  assert.match(source,/name:'save_diagram',arguments:\{name:diagramName,xml:nextXml,source:'human',expectedHash:editBaseHash\}/);
  assert.match(source,/get_diagram_changes/);
  assert.match(source,/app\.updateModelContext/);
});
test('update_diagram updates current XML and viewer polls current file',()=>{
  assert.match(source,/registerAppTool\(server, "update_diagram"/);
  assert.match(source,/registerAppTool\(server, "poll_diagram"/);
  assert.match(source,/function pollDiagramChanges\(\)/); // async function declaration follows
  assert.match(source,/pollDiagramChanges\(\);/);
});
test('MCP-first Skill avoids CLI instructions while preserving original guide as optional reference',()=>{
  assert.doesNotMatch(skill,/## The pipeline/);
  assert.doesNotMatch(skill,/drawio -x -f png/);
  assert.match(legacy,/## Authoring: Mermaid or XML\?/);
  assert.match(legacy,/## Mermaid syntax reference/);
  assert.match(skill,/get_diagram_changes/);
  assert.match(skill,/update_diagram/);
});


test('creation is opt-in and Agent revisions target existing diagram',()=>{
  assert.match(source,/NEW canvas only/);
  assert.match(source,/explicit user request for a new/);
  assert.match(source,/PRIMARY tool for requested revisions/);
  assert.match(skill,/Intent gate \(critical/);
  assert.match(skill,/Visual composition/);
  assert.match(skill,/Math authoring/);
});
