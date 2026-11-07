import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DiagramStore,readDiagramFile,diagramNameFromPath} from '../src/diagram-store.js';
import {exportCurrentDrawio,asDrawioDocument} from '../src/export-files.js';

const multiPage='<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" pages="2"><diagram name="Page-1" id="one"><mxGraphModel math="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram><diagram name="Page-2" id="two"><mxGraphModel math="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="test" value="second page" vertex="1" parent="1"/></root></mxGraphModel></diagram></mxfile>';
const simple='<mxGraphModel math="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
function inTemp(fn){const d=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-load-test-'));try{return fn(d)}finally{fs.rmSync(d,{recursive:true,force:true})}}

test('load creates a temporary working document; preserves full multi-page and math XML, never changes source',()=>inTemp(d=>{
  const source=path.join(d,'Transformer Architecture.drawio');fs.writeFileSync(source,multiPage);
  const s=new DiagramStore({baseDir:d});
  const {name,sourcePath}=s.importFromFile(source);
  assert.equal(name,'transformer-architecture');
  assert.equal(sourcePath,source);
  assert.equal(s.get(name),multiPage);
  assert.equal(fs.readFileSync(source,'utf8'),multiPage);
  assert.notEqual(s.resolve(name).path,source);
  assert.equal(s.resolve(name).sourcePath,source);
  assert.equal(s.changes(name).length,0);
}));

test('load collision allocates name and keeps both canvases',()=>inTemp(d=>{
  const source=path.join(d,'attention-block.drawio');fs.writeFileSync(source,simple);
  const s=new DiagramStore({baseDir:d});
  assert.equal(s.create('attention-block',simple),'attention-block');
  assert.equal(s.importFromFile(source).name,'attention-block-2');
  assert.equal(s.importFromFile(source).name,'attention-block-3');
  assert.equal(s.list().length,3);
}));

test('explicit .drawio export writes loaded original atomically, but not on human edit',()=>inTemp(d=>{
  const source=path.join(d,'attention-block.drawio');fs.writeFileSync(source,simple);
  const s=new DiagramStore({baseDir:d});const {name}=s.importFromFile(source);
  const updated=simple.replace('math="1"','math="0"');
  s.save(name,updated,{source:'human'});
  assert.equal(fs.readFileSync(source,'utf8'),simple);
  assert.equal(s.changes(name).length,1);
  assert.equal(exportCurrentDrawio(s.resolve(name),s.get(name)),source);
  assert.equal(fs.readFileSync(source,'utf8'),asDrawioDocument(updated));
  // Subsequent exports overwrite one file, never versions.
  assert.equal(exportCurrentDrawio(s.resolve(name),s.get(name)),source);
  assert.deepEqual(fs.readdirSync(d).filter(x=>x.endsWith('.drawio')),['attention-block.drawio']);
}));

test('reject writing source that another Cursor process or editor changed',()=>inTemp(d=>{
  const source=path.join(d,'attention-block.drawio');fs.writeFileSync(source,simple);
  const s=new DiagramStore({baseDir:d});const {name}=s.importFromFile(source);
  const edited=simple.replace('math="1"','math="0"');s.save(name,edited);
  fs.writeFileSync(source,'<mxGraphModel>someone else edited this file</mxGraphModel>');
  assert.throws(()=>exportCurrentDrawio(s.resolve(name),s.get(name)),/changed outside this session/);
  assert.equal(fs.readFileSync(source,'utf8'),'<mxGraphModel>someone else edited this file</mxGraphModel>');
}));

test('invalid path, type, malformed root, oversized import rejected without registering',()=>inTemp(d=>{
  const source=path.join(d,'notdrawio.txt');fs.writeFileSync(source,'not xml');
  assert.throws(()=>readDiagramFile('relative.drawio'),/absolute/);
  assert.throws(()=>readDiagramFile(source),/only accepts/);
  assert.throws(()=>readDiagramFile(path.join(d,'missing.drawio')),/ENOENT/);
  const bad=path.join(d,'bad.drawio');fs.writeFileSync(bad,'<html>hi</html>');
  const store=new DiagramStore({baseDir:d});
  assert.throws(()=>store.importFromFile(bad),/Not a valid draw.io/);
  assert.equal(store.list().length,0);
  fs.writeFileSync(bad,'a'.repeat(5000001));
  assert.throws(()=>store.importFromFile(bad),/at most/);
}));

test('name fallback for non-English filenames and punctuation is predictable',()=>{
  assert.equal(diagramNameFromPath('/home/u/Transformer Model (final).drawio'),'transformer-model-final');
  assert.equal(diagramNameFromPath('/home/u/中文图示.drawio'),'imported-diagram');
  assert.equal(diagramNameFromPath('/home/u/2026 - DIT DRAWIO.drawio'),'dit-drawio');
});

test('load_diagram tool returns compact metadata, restores new App viewer and reuses current XML',()=>{
  const src=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
  const tool=src.slice(src.indexOf('registerAppTool(server, "load_diagram", {'),src.indexOf('registerAppTool(server, "save_diagram", {'));
  assert.match(tool,/_meta: \{ui:\{resourceUri\}/);
  assert.match(tool,/diagrams\.importFromFile\(filePath\)/);
  assert.match(tool,/JSON\.stringify\(\{name,sourcePath,loaded:true/);
  assert.doesNotMatch(tool,/xml:diagrams\.get/);
  assert.match(src,/parsed\.loaded === true/);
  assert.match(src,/app\.callServerTool\(\{name:'get_current_diagram',arguments:\{name:importedName\}\}\)/);
  assert.match(src,/viewerModelFromEditorXml\(importedXml\)/);
  assert.match(src,/currentXml=importedXml/);
});

test('exporting imported full mxfile preserves every page byte-for-byte',()=>inTemp(d=>{
  const source=path.join(d,'multi.drawio');fs.writeFileSync(source,multiPage);
  const store=new DiagramStore({baseDir:d});const {name}=store.importFromFile(source);
  assert.equal(exportCurrentDrawio(store.resolve(name),store.get(name)),source);
  assert.equal(fs.readFileSync(source,'utf8'),multiPage);
}));
