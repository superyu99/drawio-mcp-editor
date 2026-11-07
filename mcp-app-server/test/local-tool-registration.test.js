import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/shared.js', import.meta.url), 'utf8');

for (const [name, visibility] of Object.entries({
  save_diagram: 'app',
  get_current_diagram: 'model',
  get_snapshot: 'model',
  list_diagrams: 'model',
  get_diagram_changes: 'model',
  update_diagram: 'model',
  poll_diagram: 'app',
})) {
  test(`${name} declares required MCP App UI metadata`, () => {
    const start = source.indexOf(`registerAppTool(server, "${name}", {`);
    assert.ok(start >= 0, `Missing ${name} registration`);
    const end = source.indexOf('}, async', start);
    assert.ok(end > start, `Malformed ${name} registration`);
    const config = source.slice(start, end);
    assert.match(config, /_meta\s*:\s*\{\s*ui\s*:/, 'registerAppTool requires _meta.ui');
    assert.ok(config.includes(`"${visibility}"`), `Expected ${visibility} visibility`);
  });
}
