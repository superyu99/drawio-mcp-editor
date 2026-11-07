import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Syntax check the JS injected into MCP Apps' HTML template (not parsed by node --check shared.js).
test('embedded full Editor integration script parses and exposes commit workflow', () => {
  const source = fs.readFileSync(new URL('../src/shared.js', import.meta.url),'utf8');
  const begin = source.indexOf('// Official draw.io embed protocol.');
  const end = source.indexOf('function showExternalEditorLink(',begin);
  assert.ok(begin >= 0 && end > begin);
  assert.doesNotThrow(() => new Function(source.slice(begin,end)));
  assert.match(source, /name:'save_diagram'/);
  assert.doesNotMatch(source, /name:'submit_snapshot'/);
  assert.doesNotMatch(source, /name:'poll_snapshot'/);
  assert.match(source, /renderWithOfficialEditor/);
  assert.match(source, /registerAppTool\(server, \"get_current_diagram\"/);
  assert.match(source, /frameDomains:\[viewerEditorUrl\]/);
});
