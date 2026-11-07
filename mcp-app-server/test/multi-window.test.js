import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DiagramStore} from '../src/diagram-store.js';

const XML_A='<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
const XML_B='<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="nodeB"/></root></mxGraphModel>';

test('separate stdio processes can use the same semantic name without overwriting files',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-multi-test-'));
  try {
    const a=new DiagramStore({baseDir:tmp}), b=new DiagramStore({baseDir:tmp});
    assert.equal(a.create('dit-architecture',XML_A),'dit-architecture');
    assert.equal(b.create('dit-architecture',XML_B),'dit-architecture');
    assert.notEqual(a.list()[0].path,b.list()[0].path);
    assert.equal(a.get(),XML_A);
    assert.equal(b.get(),XML_B);
  } finally {fs.rmSync(tmp,{force:true,recursive:true});}
});

test('same process generates deterministic collision-free names without changing originals',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-names-test-'));
  try {
    const store=new DiagramStore({baseDir:tmp});
    assert.equal(store.create('dit-architecture',XML_A),'dit-architecture');
    assert.equal(store.create('dit-architecture',XML_B),'dit-architecture-2');
    assert.equal(store.create('dit-architecture'),'dit-architecture-3');
    assert.deepEqual(store.list().map(x=>x.name),['dit-architecture','dit-architecture-2','dit-architecture-3']);
    assert.equal(store.get('dit-architecture'),XML_A);
    assert.equal(store.get('dit-architecture-2'),XML_B);
    assert.throws(()=>store.get(),/Multiple diagrams/);
    assert.throws(()=>store.get('dit-architecture-3'),/still rendering/);
    assert.ok(store.list().every(x=>!('revision' in x)));
    // One overwriteable current file per name; no historical revisions.
    store.save('dit-architecture',XML_B);
    assert.equal(store.get('dit-architecture'),XML_B);
    assert.equal(store.list().length,3);
    store.save('dit-architecture-3',XML_B);
    assert.equal(store.get('dit-architecture-3'),XML_B);
    assert.ok(!('revision' in store.list()[2]));
    assert.throws(()=>store.save('unknown',XML_A),/Unknown diagram/);
    for(const invalid of ['../escape','UPPERCASE','a space','-bad','é', 'x'.repeat(65)])
      assert.throws(()=>store.create(invalid),/kebab-case/);
  } finally {fs.rmSync(tmp,{force:true,recursive:true});}
});

test('long semantic names still reserve room for collision suffixes',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-names-test-'));
  try {
    const store=new DiagramStore({baseDir:tmp});
    const name='a'+'b'.repeat(63);
    assert.equal(store.create(name),name);
    const next=store.create(name);
    assert.equal(next.length,64);
    assert.ok(next.endsWith('-2'));
  } finally {fs.rmSync(tmp,{force:true,recursive:true});}
});

test('separate editor hosts use ephemeral independent ports',async()=>{
  const {startEditorHost}=await import('../src/editor-host.js');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-host-test-'));
  const dir=path.join(tmp,'editor');fs.mkdirSync(path.join(dir,'js'),{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),'<html></html>');
  fs.writeFileSync(path.join(dir,'js/app.min.js'),'// mock');
  let a,b;
  try {
    a=await startEditorHost(dir);b=await startEditorHost(dir);
    assert.notEqual(a.url,b.url);
  } finally {
    await Promise.all([a,b].filter(Boolean).map(({server})=>new Promise(r=>server.close(r))));
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
