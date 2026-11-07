import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = relative => fs.readFileSync(new URL(relative,import.meta.url),'utf8');
const skill = read('../../plugins/cursor/skills/drawio/SKILL.md');
const xml = read('../../shared/xml-reference.md');
const essentials = read('../../shared/xml-essentials.md');
const legacy = read('../../plugins/cursor/skills/drawio/references/desktop-cli-legacy.md');
const server = read('../src/shared.js');

test('Cursor Skill is concise, MCP-first and intent gate precedes all create references',()=>{
  assert.ok(skill.split('\n').length < 125);
  assert.ok(skill.indexOf('## Intent gate') < skill.indexOf('## MCP workflow'));
  assert.ok(skill.indexOf('## Intent gate') < skill.indexOf('create_diagram'));
  assert.match(skill,/Answer only\. Do not mutate or create/);
  assert.match(skill,/get_current_diagram\(name\).*update_diagram/);
  assert.doesNotMatch(skill,/Every diagram becomes a native/);
  assert.doesNotMatch(skill,/drawio -x -f/);
});

test('existing CLI guidance is archived and not silently discarded',()=>{
  assert.match(legacy,/## The pipeline/);
  assert.match(legacy,/## Mermaid syntax reference/);
  assert.match(skill,/references\/desktop-cli-legacy\.md/);
});

test('visual and math QA are actionable with positive repair permissions',()=>{
  assert.match(skill,/open the returned PNG/);
  assert.match(skill,/get_snapshot/);
  assert.match(skill,/8 px/);
  assert.match(skill,/waypoints/);
  assert.match(skill,/Visual acceptance gate/);
  assert.match(skill,/inline math/);
  assert.match(skill,/XML-escape/);
  assert.doesNotMatch(skill,/\\sqrt/);
});

test('human-agent workflow is the core: review loops, hand edits and hard visual gates',()=>{
  assert.ok(skill.indexOf('## Human–Agent collaboration loop') < skill.indexOf('## MCP workflow'));
  assert.match(skill,/Human reviews/);
  assert.match(skill,/get_diagram_changes\(name\)/);
  assert.match(skill,/get_current_diagram\(name\)/);
  assert.match(skill,/Edit → Finish editing/);
  assert.match(skill,/Visual acceptance gate \(hard fail/);
  for(const defect of ['node interior','arrow','edge-edge crossings','parallel edges','dashed/swimlane container','overflowing','raw TeX','misaligned','8 px'])
    assert.ok(skill.includes(defect),defect);
  assert.match(skill,/Fail → fix with `update_diagram`/);
  assert.doesNotMatch(server,/pass it to create_diagram as xml/);
});

test('XML references no longer prohibit reviewing geometry and routing',()=>{
  assert.doesNotMatch(xml,/Do NOT verify, re-check, or adjust coordinates/);
  assert.doesNotMatch(xml,/Do NOT add <Array as="points">/);
  assert.doesNotMatch(xml, /\*\*Don't hand-route edges/);
  assert.match(xml,/manual waypoints/);
  assert.match(essentials,/manual|waypoints/i);
});

test('MCP tool descriptions emphasize in-place revisions and image QA without mandatory reference retrieval',()=>{
  assert.match(server,/PRIMARY tool for requested revisions/);
  assert.match(server,/Human-Agent loop:/);
  assert.match(server,/get_snapshot\(name\)/);
  assert.doesNotMatch(server,/Call `get_drawio_reference` before your first diagram/);
  assert.match(server,/on-demand|ON DEMAND/i);
});
