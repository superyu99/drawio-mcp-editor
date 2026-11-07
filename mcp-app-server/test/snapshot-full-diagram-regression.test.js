import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {savePngDataUrl} from '../src/png-file.js';

const source=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
const start=source.indexOf('function validateFullDiagramSvg(');
const end=source.indexOf('function showExternalEditorLink(',start);
assert.ok(start>=0&&end>start,'snapshot renderer functions exist');
const renderer=source.slice(start,end);

function makeSvg(attrs) {return {getAttribute(name){return attrs[name]??null;}};}
const getValidator=new Function('computeWholeBBox',renderer+'\nreturn validateFullDiagramSvg;');
const validate=getValidator(()=>({minX:0,minY:0,maxX:1100,maxY:900}));
const graph={getModel(){return {};}};

test('full-diagram SVG validation rejects NaN/default 300x150 export, accepts real bounds',()=>{
  assert.throws(()=>validate(makeSvg({width:'NaN',height:'NaN'}),graph),/Invalid full-diagram SVG dimensions/);
  assert.throws(()=>validate(makeSvg({}),graph),/Invalid full-diagram SVG dimensions/);
  assert.throws(()=>validate(makeSvg({width:'300',height:'150'}),graph),/Incomplete full-diagram SVG/);
  assert.deepEqual(validate(makeSvg({width:'1140',height:'940'}),graph),{width:1140,height:940});
});

test('renderer calls Graph.getSvg with background, scale, border and nocrop in official order',()=>{
  assert.match(renderer,/graph\.getSvg\('#ffffff',\s*1,\s*8,\s*false\)/);
  assert.doesNotMatch(renderer,/graph\.getSvg\(null,\s*1,\s*'#ffffff',\s*8\)/);
  assert.match(renderer,/var width = size\.width;/);
  assert.match(renderer,/var height = size\.height;/);
  assert.match(renderer,/image\.naturalWidth - width/);
  assert.match(source,/renderWithOfficialEditor/);
});

// 1x1 fixture. PNG IHDR width/height are 1, 1.
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

test('server verifies actual PNG IHDR before making snapshot file',async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-screenshot-proof-'));
  try {
    assert.throws(()=>savePngDataUrl(PNG,{tempDir:temp,expectedWidth:300,expectedHeight:150}),/PNG dimensions mismatch/);
    assert.deepEqual(fs.readdirSync(temp),[],'must not create fake screenshot');
    assert.deepEqual(fs.readdirSync(temp),[]);
    const valid=savePngDataUrl(PNG,{tempDir:temp,expectedWidth:1,expectedHeight:1});
    assert.ok(fs.existsSync(valid));
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

test('frontend rasterizes requested diagram extent independently of the chat viewport',async()=>{
  let exportCanvas;
  const graph={getModel(){return {};},getSvg(...args){
    assert.deepEqual(args,['#ffffff',1,8,false]);
    return {getAttribute(name){return ({width:'1140',height:'940'})[name];}};
  }};
  class FakeImage {
    naturalWidth=1140;
    naturalHeight=940;
    set src(v) {queueMicrotask(()=>this.onload?.());}
  }
  const makeRenderer=new Function('computeWholeBBox','Image','URL','Blob','XMLSerializer','document','streamGraph','editState','editorReady','viewerMath',
    renderer+'\nreturn renderFullDiagramPng;');
  const fn=makeRenderer(
    ()=>({minX:20,minY:20,maxX:1120,maxY:920}),FakeImage,
    {createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},
    class FakeBlob {},class FakeSerializer{serializeToString(){return '<svg/>';}} ,
    {createElement(tag){assert.equal(tag,'canvas');exportCanvas={width:0,height:0,
       getContext:()=>({fillRect(){},drawImage(){},set fillStyle(v){}}),
       toDataURL:()=> 'data:image/png;base64,test'};return exportCanvas;}},
    graph,'view',false,{flush:async()=>{},typesetSvg:async()=>{}});
  const result=await fn();
  assert.equal(result,'data:image/png;base64,test');
  assert.equal(exportCanvas.width,1140);
  assert.equal(exportCanvas.height,940);
});

test('real Chromium renders full SVG bounds to PNG, not 300x150 (opt-in)', {timeout:20000}, async(t)=>{
  if (process.env.DRAWIO_BROWSER_TEST !== '1') {
    t.skip('Set DRAWIO_BROWSER_TEST=1 to run local Chromium; optional integration test');
    return;
  }
  let chromium;
  try {chromium=execFileSync('which',['chromium'],{encoding:'utf8'}).trim();}
  catch {t.skip('Chromium not installed; dedicated browser test skipped');return;}
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-svg-browser-'));
  try {
    // Execute the actual frontend rendering functions in Chromium (not a copy).
    const html=`<!doctype html><html><body><p id="result">pending</p><script>
      var editState='view',editorReady=false;
      var viewerMath={flush:async()=>{},typesetSvg:async()=>{}};
      var model={};
      function computeWholeBBox(){return {minX:20,minY:20,maxX:1120,maxY:920};}
      var streamGraph={getModel(){return model;},getSvg(background,scale,border,nocrop){
        if (background!=='#ffffff'||scale!==1||border!==8||nocrop!==false)
          throw Error('Wrong Graph.getSvg argument order');
        const doc=new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" width="1140" height="940" viewBox="0 0 1140 940"><rect width="1140" height="940" fill="white"/><rect x="35" y="40" width="1000" height="800" fill="blue"/></svg>','image/svg+xml');
        return doc.documentElement;
      }};
      ${renderer}
      renderFullDiagramPng().then(png=>{
        const binary=atob(png.split(',')[1].slice(0,56));
        const numbers=Array.from(binary.slice(16,24)).map(x=>x.charCodeAt(0));
        const view=new DataView(new ArrayBuffer(8));numbers.forEach((n,i)=>view.setUint8(i,n));
        document.getElementById('result').textContent='SUCCESS '+view.getUint32(0)+'x'+view.getUint32(4);
      }).catch(e=>document.getElementById('result').textContent='ERROR '+e.message);
      </script></body></html>`;
    const input=path.join(temp,'test.html');fs.writeFileSync(input,html);
    const output=execFileSync(chromium,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--virtual-time-budget=2000','--dump-dom','file://'+input],{timeout:15000,encoding:'utf8',stdio:['ignore','pipe','ignore']});
    assert.match(output,/SUCCESS 1140x940/,output.match(/<p id="result">[^<]*/)?.[0]);
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
