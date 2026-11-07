import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DiagramStore} from '../src/diagram-store.js';
import {savePngDataUrl} from '../src/png-file.js';

const source=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

test('one current file per named diagram, human edits overwrite rather than versioning',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-current-test-'));
  try {
    const store=new DiagramStore({baseDir:temp});
    const name=store.create('attention-block','<mxGraphModel>original</mxGraphModel>');
    const file=store.resolve(name).path;
    store.save(name,'<mxGraphModel>human edit</mxGraphModel>');
    assert.equal(store.resolve(name).path,file);
    assert.equal(store.get(name),'<mxGraphModel>human edit</mxGraphModel>');
    assert.ok(!('revision' in store.list()[0]));
    assert.equal(fs.readdirSync(store.directory).length,1);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

test('PNG file saving uses a fresh random path and checks PNG signature',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-png-test-'));
  try {
    const one=savePngDataUrl(PNG,{tempDir:temp}),two=savePngDataUrl(PNG,{tempDir:temp});
    assert.notEqual(one,two);
    assert.ok(fs.existsSync(one));
    assert.ok(fs.existsSync(two));
    assert.throws(()=>savePngDataUrl('not png',{tempDir:temp}),/Invalid PNG/);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

test('embedded export uses server-side paths and visible success/failure, not browser download or alert',()=>{
  assert.match(source,/id="export-png-btn"/);
  assert.match(source,/id="export-drawio-btn"/);
  assert.match(source,/id="export-status" role="status"/);
  assert.match(source,/name:'export_png',arguments:\{name:diagramName,png:png\}/);
  assert.match(source,/name:'export_drawio',arguments:\{name:diagramName\}/);
  assert.match(source,/showExportStatus\('ok','Saved PNG: '/);
  assert.match(source,/showExportStatus\('ok','Saved \.drawio: '/);
  assert.match(source,/var savedXml=stored\?\.content\?\.\[0\]\?\.text/);
  assert.match(source,/endStreaming\(\);\s+finalizeStreamingView\(liveModel/);
  const start=source.indexOf('// Export is ALWAYS a local server-side file write:');
  const stop=source.indexOf('copyXmlBtn.addEventListener',start);
  assert.ok(start>=0&&stop>start);
  const code=source.slice(start,stop);
  assert.doesNotThrow(()=>new Function(code));
  assert.doesNotMatch(code.replace(/\/\/[^\n]*/g,''),/app\.downloadFile\(|app\.getHostCapabilities\(|\balert\(|navigator\.clipboard|exportToHost/);
  assert.match(code,/await refreshViewerFromSaved\(\)/);
});
