import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { diffDiagramXml } from '../src/diagram-changes.js';
import { DiagramStore } from '../src/diagram-store.js';

const model=(label='Attention',x=20,extra='')=>`<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="a" value="${label}" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="30" width="100" height="40" as="geometry"/></mxCell><mxCell id="b" value="Output" vertex="1" parent="1"><mxGeometry x="200" y="30" width="100" height="40" as="geometry"/></mxCell><mxCell id="e" edge="1" source="a" target="b" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>${extra}</root></mxGraphModel>`;
const asCompressed=xml=>`<mxfile><diagram id="page1">${deflateRawSync(Buffer.from(encodeURIComponent(xml))).toString('base64')}</diagram></mxfile>`;

test('structural diff captures add, delete, move, rename and edge rewiring',()=>{
  const base=model();
  const added='<mxCell id="c" value="QKV" vertex="1" parent="1"><mxGeometry x="140" y="90" width="80" height="40" as="geometry"/></mxCell>';
  const after=model('Cross Attention',75,added).replace('<mxCell id="b" value="Output" vertex="1" parent="1"><mxGeometry x="200" y="30" width="100" height="40" as="geometry"/></mxCell>','').replace('target="b"','target="c"');
  const d=diffDiagramXml(base,after);
  assert.deepEqual(d.added.map(x=>x.id),['c']);
  assert.deepEqual(d.removed.map(x=>x.id),['b']);
  assert.equal(d.modified.find(x=>x.id==='a').changes.geometry.to.x,'75');
  assert.equal(d.modified.find(x=>x.id==='a').changes.label.to,'Cross Attention');
  assert.equal(d.modified.find(x=>x.id==='e').changes.target.to,'c');
});

test('handles compressed draw.io page and object-wrapped mxCells',()=>{
  const wrap=(label)=>`<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><object id="k" label="${label}"><mxCell vertex="1" parent="1"><mxGeometry x="10" y="20" width="60" height="35" as="geometry"/></mxCell></object></root></mxGraphModel>`;
  assert.equal(diffDiagramXml(asCompressed(wrap('Q')),asCompressed(wrap('K'))).modified[0].changes.label.to,'K');
  const mix=diffDiagramXml(wrap('Q'),asCompressed(wrap('K')));
  assert.equal(mix.modified.length,1);
  assert.equal(mix.added.length,0);
  assert.equal(mix.removed.length,0);
});

test('each human save is an independent event; XML has only one current file',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-events-test-'));
  try {
    const store=new DiagramStore({baseDir:tmp});
    const name=store.create('attention-block',model());
    const file=store.resolve(name).path;
    store.save(name,model('Attention',80),{source:'human'});
    store.save(name,model('Attention Updated',80),{source:'human'});
    store.save(name,model('Attention Updated',80),{source:'human'}); // identical, no false change event
    assert.equal(store.changes(name).length,2);
    assert.equal(store.changes(name)[0].changes.modified[0].changes.geometry.to.x,'80');
    assert.equal(store.changes(name)[1].changes.modified[0].changes.label.to,'Attention Updated');
    assert.equal(store.get(name),model('Attention Updated',80));
    assert.equal(store.resolve(name).path,file);
    assert.deepEqual(fs.readdirSync(store.directory).sort(),['attention-block.changes.jsonl','attention-block.drawio']);
    assert.equal(store.changes(name).length,2); // reading doesn't clear
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

test('system save and agent save do not create human edits; stale human edit is rejected',()=>{
  const store=new DiagramStore();
  const name=store.create('cross-attention',model());
  const originalHash=store.resolve(name).hash;
  store.save(name,model('Q'),{source:'agent'});
  assert.deepEqual(store.changes(name),[]);
  assert.throws(()=>store.save(name,model('K'),{source:'human',expectedHash:originalHash}),/changed since it was read/);
  assert.equal(store.get(name),model('Q'));
});
