import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');

test('toolbar emphasizes Edit and omits manual Snapshot',()=>{
  assert.match(source,/#toolbar #edit-btn\s*\{/);
  assert.match(source,/editStatus\('Finish editing'\)/);
  assert.doesNotMatch(source,/id="snapshot-btn"|snapshotBtn\./);
});

test('Agent screenshots use official Editor backend, not an active canvas',()=>{
  assert.doesNotMatch(source,/pollSnapshotRequests|registerAppTool\(server, "poll_snapshot"/);
  assert.match(source,/await renderWithOfficialEditor\(xml,/);
  assert.match(source,/const xml=diagrams.get\(record.name\)/);
  assert.match(source,/get_snapshot/);
  const finish=source.slice(source.indexOf('async function finishEdit()'),source.indexOf("editBtn.addEventListener('click'"));
  assert.doesNotMatch(finish,/editorAwait\('png'\)|submit_snapshot/);
});


test('human Edit errors remain visible and neutral toolbar buttons have readable contrast',()=>{
  assert.match(source,/editStatus\('Retry save'\)/);
  assert.match(source,/showEditError\('Finish failed: '/);
  assert.match(source,/id="edit-error-msg" role="alert"/);
  assert.match(source,/color: var\(--viewer-btn-fg\)/);
  assert.match(source,/background: var\(--viewer-btn-bg\)/);
  assert.doesNotMatch(source,/color: var\(--color-text-primary, var\(--viewer-btn-fg\)\)/);
});
