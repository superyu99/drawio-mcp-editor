import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readOfflineViewerAssets} from '../src/offline-assets.js';
import {startEditorHost} from '../src/editor-host.js';
import {createViewerMathRuntime} from '../src/viewer-math.js';

const paths = [
  'js/viewer-static.min.js', 'js/elk/drawio-elk.min.js',
  'js/mermaid/drawio-mermaid.min.js',
  'js/libavoid-js/libavoid.min.js',
  'js/libavoid-js/libavoid-routing.js',
  'math4/es5/drawio-mathjax.min.js',
];

test('offline assets are loaded from the official Editor distribution, without fetch',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-offline-test-'));
  try {
    for(const relative of paths) {
      const full=path.join(dir,relative);
      fs.mkdirSync(path.dirname(full),{recursive:true});
      fs.writeFileSync(full,'// '+relative+'\n');
    }
    const assets=readOfflineViewerAssets(dir);
    assert.match(assets.viewerJs,/viewer-static.min.js/);
    assert.match(assets.elkJs,/drawio-elk.min.js/);
    assert.match(assets.mermaidJs,/drawio-mermaid.min.js/);
    assert.match(assets.libavoidJs,/libavoid.min.js/);
    assert.match(assets.libavoidJs,/libavoid-routing.js/);
    fs.rmSync(path.join(dir,'js/mermaid/drawio-mermaid.min.js'));
    assert.throws(()=>readOfflineViewerAssets(dir),/DRAWIO_OFFLINE: missing.*drawio-mermaid.min.js/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('offline Viewer math has no public CDN fallback if Editor is unavailable',async()=>{
  const oldWindow=globalThis.window;
  try {
    globalThis.window={};
    const runtime=createViewerMathRuntime({offline:true});
    await assert.rejects(runtime.ensureEngine(),/No public CDN fallback/);
  } finally {globalThis.window=oldWindow;}
});

test('remote Editor can use a fixed loopback port for SSH forwarding',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-editor-port-'));
  const old=process.env.DRAWIO_EDITOR_PORT;
  fs.mkdirSync(path.join(dir,'js'));
  fs.writeFileSync(path.join(dir,'index.html'),'Editor offline');
  fs.writeFileSync(path.join(dir,'js/app.min.js'),'// present');
  let a;
  try {
    a=await startEditorHost(dir);
    const port=new URL(a.url).port;
    await new Promise(resolve=>a.server.close(resolve));
    a=null;
    process.env.DRAWIO_EDITOR_PORT=port;
    const b=await startEditorHost(dir);
    try {
      assert.equal(new URL(b.url).port,port);
      assert.equal((await fetch(b.url+'/')).status,200);
      assert.equal(new URL(b.url).hostname,'127.0.0.1');
    } finally {await new Promise(resolve=>b.server.close(resolve));}
    process.env.DRAWIO_EDITOR_PORT='abc';
    await assert.rejects(startEditorHost(dir),/DRAWIO_EDITOR_PORT/);
  } finally {
    if(a) await new Promise(resolve=>a.server.close(resolve));
    if(old==null) delete process.env.DRAWIO_EDITOR_PORT;
    else process.env.DRAWIO_EDITOR_PORT=old;
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
