import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {exportDrawio,exportPng,exportPngFromFile,getExportDirectory,asDrawioDocument} from '../src/export-files.js';
import {savePngDataUrl} from '../src/png-file.js';

const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
const XML='<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>';
const src=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');

test('export directory is persistent HOME default and allows explicit absolute or ~/ overrides',()=>{
  assert.equal(getExportDirectory({},'/home/someone'),'/home/someone/drawio-exports');
  assert.equal(getExportDirectory({DRAWIO_EXPORT_DIR:'~/my-diagrams'},'/home/me'),'/home/me/my-diagrams');
  assert.equal(getExportDirectory({DRAWIO_EXPORT_DIR:'/var/tmp/diagrams'},'/home/me'),'/var/tmp/diagrams');
  assert.throws(()=>getExportDirectory({DRAWIO_EXPORT_DIR:'./relative'},'/home/me'),/absolute path/);
});

test('drawio exports authoritative content atomically, overwrite same path not history',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-export-test-'));
  try {
    const dir=path.join(base,'nested','out');
    const first=exportDrawio('transformer-architecture',XML,{directory:dir});
    const second=exportDrawio('transformer-architecture',XML.replace('root','new-root'),{directory:dir});
    assert.equal(first,second);
    assert.equal(fs.readFileSync(first,'utf8'),asDrawioDocument(XML.replace('root','new-root')));
    assert.deepEqual(fs.readdirSync(dir),['transformer-architecture.drawio']);
    assert.throws(()=>exportDrawio('../outside',XML,{directory:dir}),/Invalid semantic diagram name/);
    assert.throws(()=>exportDrawio('other-diagram','stale',{directory:dir}),/No valid current/);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});

test('PNG persistent export validates data and replaces same name, random Agent screenshot unchanged',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-export-png-'));
  try {
    const dir=path.join(base,'export');
    const file=exportPng('scene-query-flow',PNG,{directory:dir});
    assert.equal(file,path.join(dir,'scene-query-flow.png'));
    assert.equal(fs.readFileSync(file).readUInt32BE(16),1);
    assert.equal(exportPng('scene-query-flow',PNG,{directory:dir}),file);
    assert.deepEqual(fs.readdirSync(dir),['scene-query-flow.png']);
    assert.throws(()=>exportPng('scene-query-flow','data:image/png;base64,Z29vZA==',{directory:dir}),/Invalid PNG signature/);
    assert.deepEqual(fs.readdirSync(dir),['scene-query-flow.png']);
    const randomFile=savePngDataUrl(PNG,{tempDir:base});
    assert.notEqual(randomFile,file);
    assert.equal(exportPngFromFile('scene-query-flow',randomFile,{directory:dir}),file);
    const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),1);
  } finally {fs.rmSync(base,{recursive:true,force:true});}
});

test('export app tools use name and model export tool requests fresh capture for PNG',()=>{
  for (const n of ['export_png','export_drawio','export_diagram']) {
    const at=src.indexOf(`registerAppTool(server, "${n}", {`);
    assert.ok(at>0,n);
    const segment=src.slice(at,src.indexOf('}, async',at));
    assert.match(segment,/inputSchema: \{name:/);
    assert.match(segment,/_meta: \{ui:\{visibility:/);
  }
  assert.match(src,/const snapshot=await captureNamedDiagram\(record\)/);
  assert.match(src,/exportPngFromFile\(record\.name,snapshot\)/);
  assert.match(src,/exportCurrentDrawio\(record,diagrams\.get\(name\)\)/);
  assert.match(src,/exportPng\(name,png\)/);
});

test('drawio export wraps bare Viewer model, preserves cells, and leaves official documents untouched',()=>{
  const wrapped=asDrawioDocument(XML);
  assert.match(wrapped,/^<mxfile host="app.diagrams.net"><diagram id="page-1" name="Page-1"><mxGraphModel>/);
  assert.ok(wrapped.includes(XML));
  assert.match(wrapped,/<\/diagram><\/mxfile>$/);
  assert.equal(asDrawioDocument(wrapped),wrapped);
  const multiple='<mxfile host="app.diagrams.net" pages="2"><diagram id="a" name="First">compressed</diagram><diagram id="b" name="Second">compressed</diagram></mxfile>';
  assert.equal(asDrawioDocument(multiple),multiple);
  assert.throws(()=>asDrawioDocument('<html>bad</html>'),/No valid current/);
});
