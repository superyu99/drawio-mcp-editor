import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createViewerMathRuntime} from '../src/viewer-math.js';

const source=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
const svgTest='\\(\\frac{a}{b}\\)';

function fakeNode(math, labels=[]) {
  return {
    nodeName:'mxGraphModel',
    getAttribute(name){return name==='math'? math : null;},
    textContent:'',
    getElementsByTagName(tag){return tag==='mxCell' ? labels.map(s=>({getAttribute(n){return n==='value'?s:null;}})):[];}
  };
}

test('viewer reads math=1 from each XML merge and clears it when disabled',()=>{
  const runtime=createViewerMathRuntime();
  const graph={mathEnabled:false};
  runtime.updateModel(graph,fakeNode('1'));
  assert.equal(graph.mathEnabled,true);
  runtime.updateModel(graph,fakeNode('0'));
  assert.equal(graph.mathEnabled,false);
});

test('viewer detects TeX delimiters on generated labels even if math flag is missing',()=>{
  const runtime=createViewerMathRuntime();
  const graph={mathEnabled:false};
  runtime.updateModel(graph,fakeNode('0',[svgTest]));
  assert.equal(graph.mathEnabled,true);
  runtime.updateModel(graph,fakeNode('0',['Price $50', 'no formula']));
  assert.equal(graph.mathEnabled,false);
});

test('MathJax loads only on demand from local Editor (not external CDN)',async()=>{
  const oldWindow=globalThis.window, oldDocument=globalThis.document;
  try {
    let scriptUrl;
    const engine={typeset:()=>{},typesetClear:()=>{}};
    globalThis.window={};
    globalThis.document={
      createElement(){return {set src(v){scriptUrl=v;queueMicrotask(()=>{
        Object.assign(globalThis.window.DrawioMathJax,engine);
        this.onload();
      });}};},
      head:{appendChild(){}}
    };
    const math=createViewerMathRuntime({editorBase:'http://127.0.0.1:41888'});
    assert.equal(scriptUrl,undefined,'ordinary diagrams do not load MathJax');
    await math.ensureEngine();
    assert.equal(scriptUrl,'http://127.0.0.1:41888/math4/es5/drawio-mathjax.min.js');
    assert.equal(globalThis.window.DrawioMathJax.loader.paths.fonts,
      'http://127.0.0.1:41888/math4/es5/fonts');
  } finally {globalThis.window=oldWindow;globalThis.document=oldDocument;}
});

test('MathJax failures reject explicitly instead of emitting a PNG with raw TeX',async()=>{
  const oldWindow=globalThis.window, oldDocument=globalThis.document;
  try {
    globalThis.window={};
    globalThis.document={
      createElement(){return {set src(v){queueMicrotask(()=>this.onerror());}};},
      head:{appendChild(){}}
    };
    const math=createViewerMathRuntime({editorBase:'http://127.0.0.1:41888'});
    await assert.rejects(math.ensureEngine(),/script blocked or missing/);
    await assert.rejects(math.ensureEngine(),/script blocked or missing/);
  } finally {globalThis.window=oldWindow;globalThis.document=oldDocument;}
});

test('SVG exported with TeX must contain MathJax output or fail closed',async()=>{
  const oldWindow=globalThis.window, oldDocument=globalThis.document;
  try {
    let hasOutput=false;
    globalThis.window={DrawioMathJax:{typesetClear(){},typeset(){hasOutput=true;}}};
    const mount={style:{},appendChild(){},remove(){},querySelector(){return hasOutput ? {} : null;}};
    globalThis.document={createElement:()=>mount,body:{appendChild(){}}};
    const math=createViewerMathRuntime();
    await math.typesetSvg({textContent:svgTest},{mathEnabled:true});
    hasOutput=false;
    globalThis.window.DrawioMathJax.typeset=()=>{};
    await assert.rejects(math.typesetSvg({textContent:svgTest},{mathEnabled:true}),/did not typeset/);
  } finally {globalThis.window=oldWindow;globalThis.document=oldDocument;}
});

test('MCP viewer has full math pipeline on both screen and PNG with localhost CSP',()=>{
  assert.match(source,/createViewerMathRuntime\.toString\(\)/);
  assert.match(source,/viewerMath\.updateModel\(graph, modelNode\)/);
  assert.match(source,/await viewerMath\.flush\(graph\)/);
  assert.match(source,/await viewerMath\.typesetSvg\(svg, graph\)/);
  assert.match(source,/resourceDomains:[\s\S]*?\.\.\.\(viewerEditorUrl \? \[viewerEditorUrl\] : \[\]\)/);
});
