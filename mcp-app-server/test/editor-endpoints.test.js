import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {resolveEditorEndpoints} from '../src/editor-endpoints.js';
import {startEditorHost} from '../src/editor-host.js';

function assets(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-editor-endpoints-'));
  fs.mkdirSync(path.join(dir,'js'));
  fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><title>Offline Editor</title>');
  fs.writeFileSync(path.join(dir,'js/app.min.js'),'// offline asset');
  return dir;
}
const close = server => new Promise(resolve=>server.close(resolve));

test('local default viewer and snapshot use the same server-owned origin',()=>{
  const endpoints=resolveEditorEndpoints('http://127.0.0.1:39000',{});
  assert.deepEqual(endpoints,{snapshotUrl:'http://127.0.0.1:39000',viewerUrl:'http://127.0.0.1:39000'});
});
test('remote Viewer points to client local assets, snapshot stays at remote ephemeral origin',()=>{
  const endpoints=resolveEditorEndpoints('http://127.0.0.1:40800',{
    DRAWIO_VIEWER_EDITOR_URL:'http://127.0.0.1:41391/'
  });
  assert.deepEqual(endpoints,{snapshotUrl:'http://127.0.0.1:40800',viewerUrl:'http://127.0.0.1:41391'});
});
test('offline Viewer URL cannot reference public network, paths or credentials',()=>{
  for(const url of [
    'https://app.diagrams.net','http://192.168.1.10:41391','http://0.0.0.0:41391',
    'http://127.0.0.1','http://127.0.0.1:0','http://127.0.0.1:41391/foo','http://u:p@localhost:41391',
    'http://localhost:41391?x=1','not-a-url',
  ]) assert.throws(()=>resolveEditorEndpoints('http://127.0.0.1:50001',{DRAWIO_VIEWER_EDITOR_URL:url}),/DRAWIO_VIEWER_EDITOR_URL/);
  assert.equal(resolveEditorEndpoints(null,{DRAWIO_VIEWER_EDITOR_URL:'http://localhost:41391'}).viewerUrl,'http://localhost:41391');
});
test('multiple MCP processes with stale fixed ports fall back to independent ephemeral ports',async()=>{
  const dir=assets();let first,second;
  try {
    first=await startEditorHost(dir,{port:0});
    const occupied=Number(new URL(first.url).port);
    second=await startEditorHost(dir,{port:occupied,fallbackToEphemeral:true});
    assert.notEqual(first.url,second.url);
    assert.equal((await fetch(first.url+'/')).status,200);
    assert.equal((await fetch(second.url+'/')).status,200);
  }finally{
    if(second) await close(second.server);
    if(first) await close(first.server);
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
test('shared client-local asset host explicitly rejects port conflicts',async()=>{
  const dir=assets();let first;
  try {
    first=await startEditorHost(dir,{port:0});
    const occupied=Number(new URL(first.url).port);
    await assert.rejects(startEditorHost(dir,{port:occupied,fallbackToEphemeral:false}),e=>e.code==='EADDRINUSE');
  }finally{
    if(first)await close(first.server);
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('MCP App CSP and viewer use client URL while official snapshot uses server URL',()=>{
  const index=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  const shared=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
  assert.match(index,/buildHtml\(appWithDepsJs,[\s\S]*?editorUrl: viewerEditorUrl/);
  assert.match(index,/editorUrl: snapshotEditorUrl, viewerEditorUrl/);
  assert.match(shared,/renderWithOfficialEditor\(xml,\{editorUrl,timeoutMs:/);
  assert.match(shared,/resourceDomains: offline \? \(viewerEditorUrl \? \[viewerEditorUrl\]/);
  assert.match(shared,/frameDomains:\[viewerEditorUrl\]/);
});
