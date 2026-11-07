import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {describeOfficialSnapshotError,OfficialSnapshotError} from '../src/official-snapshot.js';
const source=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');

test('model tool reads named XML, verifies unchanged hash and returns new official PNG',()=>{
  assert.match(source,/const hash=record.hash/);
  assert.match(source,/const xml=diagrams.get\(record.name\)/);
  assert.match(source,/await renderWithOfficialEditor\(xml,/);
  assert.match(source,/if \(diagrams.resolve\(record.name\).hash!==hash\)/);
  assert.match(source,/const file=await captureNamedDiagram\(record\)/);
});

test('no snapshot poll/heartbeat/claim app tools are registered',()=>{
  for(const name of ['poll_snapshot','snapshot_progress','submit_snapshot'])
    assert.doesNotMatch(source,new RegExp('registerAppTool\\(server, "'+name+'"'));
  assert.doesNotMatch(source,/SnapshotBridge|pollSnapshotRequests|activeCanvasIds/);
});

test('official renderer errors explain missing runtime resources',()=>{
  for(const [code,expected] of [
    ['BROWSER_NOT_FOUND','DRAWIO_BROWSER_PATH'],
    ['EDITOR_ASSETS_MISSING','bundle-editor.sh'],
  ]) {
    const obj=JSON.parse(describeOfficialSnapshotError(new OfficialSnapshotError(code,'missing',{stage:'test'}),{name:'grpo-training'}));
    assert.equal(obj.name,'grpo-training');
    assert.equal(obj.code,code);
    assert.match(obj.nextAction,new RegExp(expected));
  }
});
