import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {startEditorHost,OFFICIAL_RENDER_PAGE} from '../src/editor-host.js';
import {findBrowserExecutable,renderWithOfficialEditor,describeOfficialSnapshotError} from '../src/official-snapshot.js';
import {validatePngBytes} from '../src/png-file.js';

const PNG='iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAIAAABqVuVZAAAAmElEQVR4nO3QwQ3AIBDAsNL9dz4mQHnCw54gypqZj7P/dsDrDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFDYRzwDfaJgUYcAAAAASUVORK5CYII=';
const XML='<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="a" vertex="1" parent="1"><mxGeometry x="10" y="20" width="250" height="120" as="geometry"/></mxCell></root></mxGraphModel>';

test('official render harness uses load + math-ready + export WITHOUT XML',()=>{
  assert.match(OFFICIAL_RENDER_PAGE,/action:'load',xml:xml/);
  assert.match(OFFICIAL_RENDER_PAGE,/action:'export',format:'png',scale:1/);
  assert.doesNotMatch(OFFICIAL_RENDER_PAGE,/action:'export',format:'png',xml:/);
  assert.match(OFFICIAL_RENDER_PAGE,/editor.loadMath/);
  assert.match(OFFICIAL_RENDER_PAGE,/editor.MathJaxRender/);
  assert.match(OFFICIAL_RENDER_PAGE,/math=1/);
  assert.match(OFFICIAL_RENDER_PAGE,/event.source!==frame.contentWindow/);
});

function makeHarness({math=true,producesSvg=true}={}) {
  const js=OFFICIAL_RENDER_PAGE.split('<script>')[1].split('</script>')[0];
  const handlers={},sent=[],calls={loadMath:0,typeset:0};
  const body={textContent:math?'Formula: $$x^2$$':'Plain label'};
  const doc={body,querySelectorAll:()=>producesSvg?[{}]:[]};
  let readyCallback=null;
  const inner={postMessage:(text,origin)=>sent.push({payload:JSON.parse(text),origin}),
    requestAnimationFrame:callback=>callback(),
    Editor:{loadMath:callback=>{calls.loadMath++;readyCallback=callback;},
      MathJaxRender:()=>{calls.typeset++;}},
    DrawioMathJax:{typeset:()=>{}}};
  const frame={contentWindow:inner,contentDocument:doc};
  const win={addEventListener:(type,callback)=>handlers[type]=callback};
  const context={window:win,document:{getElementById:()=>frame},location:{origin:'http://127.0.0.1:1234'},
    setTimeout:()=>123,clearTimeout:()=>{}};
  vm.runInNewContext(js,context);
  function message(packet,source=inner){
    handlers.message({source,origin:'http://127.0.0.1:1234',data:JSON.stringify(packet)});
  }
  return {win,sent,calls,inner,doc,message,finishMath:()=>readyCallback?.()};
}

test('count formulas, not nested delimiters: aligned/cases/bmatrix each remain one formula',()=>{
  const js=OFFICIAL_RENDER_PAGE.split('<script>')[1].split('</script>')[0];
  const inner={postMessage(){}};
  const frame={contentWindow:inner};
  const ctx={window:{addEventListener(){}},document:{getElementById:()=>frame},location:{origin:'http://127.0.0.1:1234'}};
  vm.runInNewContext(js,ctx);
  assert.equal(ctx.formulaCount('$$\\begin{aligned}a &= b\\\\c &= d\\end{aligned}$$'),1);
  assert.equal(ctx.formulaCount('\\(f=\\begin{cases}1 & x>0\\\\0 & x\\le0\\end{cases}\\)'),1);
  assert.equal(ctx.formulaCount('\\[\\begin{bmatrix}a & b\\\\c & d\\end{bmatrix}\\]'),1);
  assert.equal(ctx.formulaCount('\\begin{aligned}a &= b\\end{aligned}'),1);
  assert.equal(ctx.formulaCount('\\(x\\) and $$y$$'),2);
  assert.equal(ctx.formulaCount('This costs $5; code in plain text'),0);
});

test('math export waits for official MathJax: load, typeset, then PNG export without xml',()=>{
  const h=makeHarness();
  h.message({event:'init'});
  assert.equal(h.win.__drawioRenderState.status,'ready');
  assert.equal(h.win.__drawioStartExport(XML),true);
  assert.deepEqual({...h.sent[0].payload},{action:'load',xml:XML});
  assert.equal(h.win.__drawioRenderState.status,'loading_xml');
  h.message({event:'load'});
  assert.equal(h.win.__drawioRenderState.status,'typesetting_math');
  assert.equal(h.sent.length,1,'must not export until MathJax reports ready');
  assert.equal(h.calls.loadMath,1);
  h.finishMath();
  assert.equal(h.calls.typeset,1);
  assert.equal(h.win.__drawioRenderState.status,'exporting');
  assert.deepEqual({...h.sent[1].payload},
    {action:'export',format:'png',scale:1,border:8,background:'#ffffff',transparent:false});
  h.message({event:'export',format:'png',data:'data:image/png;base64,'+PNG},{postMessage:()=>{}});
  assert.equal(h.win.__drawioRenderState.status,'exporting','ignore untrusted frame');
  h.message({event:'export',format:'png',data:'data:image/png;base64,'+PNG});
  assert.equal(h.win.__drawioRenderState.status,'done');
});

test('plain diagram does not wait for unnecessary MathJax loading',()=>{
  const h=makeHarness({math:false});
  h.message({event:'init'});
  h.win.__drawioStartExport('<mxGraphModel><root/></mxGraphModel>');
  h.message({event:'load'});
  assert.equal(h.calls.loadMath,0);
  assert.equal(h.sent[1].payload.action,'export');
});

test('MathJax unavailable or failing to typeset rejects rather than returning a broken image',()=>{
  const h=makeHarness({producesSvg:false});
  h.message({event:'init'});
  h.win.__drawioStartExport(XML);
  h.message({event:'load'});
  h.finishMath();
  assert.equal(h.win.__drawioRenderState.status,'error');
  assert.match(h.win.__drawioRenderState.error,/MathJax did not render/);
  assert.equal(h.sent.length,1,'must not export incomplete math');
  const j=makeHarness();
  j.inner.DrawioMathJax={};
  j.message({event:'init'});
  j.win.__drawioStartExport(XML);
  j.message({event:'load'});
  j.finishMath();
  assert.equal(j.win.__drawioRenderState.status,'error');
  assert.match(j.win.__drawioRenderState.error,/MathJax bundle failed/);
  assert.equal(j.sent.length,1);
});

test('missing editor and explicit missing browser fail immediately and transparently',async()=>{
  await assert.rejects(renderWithOfficialEditor(XML,{}),/Bundled official draw.io Editor is unavailable/);
  assert.throws(()=>findBrowserExecutable({DRAWIO_BROWSER_PATH:'/nonexistent/render-binary'}),/does not exist/);
  const info=JSON.parse(describeOfficialSnapshotError({code:'EDITOR_ASSETS_MISSING',message:'absent'},{name:'demo'}));
  assert.equal(info.code,'EDITOR_ASSETS_MISSING');
});

let browser;
try {browser=findBrowserExecutable();} catch{}
test('headless native draw.io embed protocol produces NEW validated PNG without app card',
  {skip:!browser,timeout:45000},async(t)=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-official-test-'));
    fs.mkdirSync(path.join(dir,'js'));
    fs.writeFileSync(path.join(dir,'js','app.min.js'),'// test double');
    // Mock ONLY the official postMessage export protocol. No MCP App is mounted.
    fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><body><script>
      window.parent.postMessage(JSON.stringify({event:'init'}),'*');
      let currentXml='';
      window.addEventListener('message',ev=>{
        const msg=JSON.parse(ev.data);
        if(msg.action==='load') {
          currentXml=msg.xml;
          window.parent.postMessage(JSON.stringify({event:'load'}),'*');
        } else if(msg.action==='export'&&msg.format==='png'&&currentXml.includes('mxGraphModel')&&msg.xml==null) {
          window.parent.postMessage(JSON.stringify({event:'export',format:'png',data:'data:image/png;base64,${PNG}'}),'*');
        }
      });
    </script></body>`);
    const old=process.env.DRAWIO_RENDER_NO_SANDBOX;
    process.env.DRAWIO_RENDER_NO_SANDBOX='1'; // this test environment may lack user namespaces
    const host=await startEditorHost(dir);
    try {
      let one;
      try {one=await renderWithOfficialEditor(XML,{editorUrl:host.url,timeoutMs:20000,tempDir:dir,logger:()=>{}});}
      catch(e) {
        if (e.code==='BROWSER_NAVIGATION_FAILED'&&/ERR_BLOCKED_BY_ADMINISTRATOR/.test(e.message)) {
          t.skip('This CI Chromium is managed with URLBlocklist: [*]; real browser navigation is prohibited');
          return;
        }
        throw e;
      }
      const two=await renderWithOfficialEditor(XML,{editorUrl:host.url,timeoutMs:20000,tempDir:dir,logger:()=>{}});
      assert.notEqual(one,two);
      assert.match(path.basename(one),/^drawio-[0-9a-f-]{36}\.png$/);
      assert.deepEqual(validatePngBytes(fs.readFileSync(one)),{width:96,height:64});
      assert.deepEqual(validatePngBytes(fs.readFileSync(two)),{width:96,height:64});
    } finally {
      host.server.close();
      if(old===undefined) delete process.env.DRAWIO_RENDER_NO_SANDBOX;
      else process.env.DRAWIO_RENDER_NO_SANDBOX=old;
      fs.rmSync(dir,{recursive:true,force:true});
    }
});
