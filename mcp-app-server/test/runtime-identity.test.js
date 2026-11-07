import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRuntimeIdentity, runtimeLog} from '../src/runtime-identity.js';

const entry = fileURLToPath(new URL('../src/index.js', import.meta.url));

test('runtime info identifies version, pid, entry and separate instances', () => {
  const a = createRuntimeIdentity({entry, buildId: 'test', mode: 'stdio'});
  const b = createRuntimeIdentity({entry, buildId: 'test', mode: 'stdio'});
  assert.equal(a.version, '0.1.15');
  assert.equal(a.pid, process.pid);
  assert.equal(a.ppid, process.ppid);
  assert.equal(a.entry, entry);
  assert.equal(a.mode, 'stdio');
  assert.notEqual(a.instance, b.instance);
});

test('startup log is a single parseable stderr-friendly line with all identifiers', () => {
  const id = createRuntimeIdentity({entry, buildId: 'test', mode: 'stdio'});
  const lines = [];
  runtimeLog(id, 'ready', {editor: 'available'}, line => lines.push(line));
  assert.equal(lines.length, 1);
  const payload = JSON.parse(lines[0].slice('[drawio-mcp] '.length));
  assert.equal(payload.event, 'ready');
  assert.equal(payload.pid, process.pid);
  assert.equal(payload.version, '0.1.15');
  assert.equal(payload.instance, id.instance);
  assert.equal(payload.editor, 'available');
});
