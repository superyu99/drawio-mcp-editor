import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {startEditorHost} from '../src/editor-host.js';

test('locally serves full Editor assets on loopback, without directory traversal', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'drawio-editor-test-'));
  fs.mkdirSync(path.join(root,'js'));
  fs.writeFileSync(path.join(root,'index.html'),'<html>Editor test</html>');
  fs.writeFileSync(path.join(root,'js/app.min.js'),'// Editor test');
  const host = await startEditorHost(root);
  try {
    const index = await fetch(host.url+'/');
    assert.equal(index.status,200);
    assert.match(await index.text(),/Editor test/);
    const script = await fetch(host.url+'/js/app.min.js');
    assert.equal(script.status,200);
    assert.match(script.headers.get('content-type'),/javascript/);
    assert.equal((await fetch(host.url+'/not-found')).status,404);
    assert.equal((await fetch(host.url+'/../bad')).status,404);
  } finally {host.server.close(); fs.rmSync(root,{recursive:true,force:true});}
});
