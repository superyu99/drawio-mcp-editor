import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');

test('export result is before the toolbar, not after the last visible row',()=>{
  const statusIndex=source.indexOf('<div id="export-status" role="status"');
  const toolbarIndex=source.indexOf('<div id="toolbar">');
  assert.ok(statusIndex>0&&statusIndex<toolbarIndex);
  assert.equal(source.match(/<div id="export-status" role="status"/g)?.length,1);
  assert.match(source,/#export-status\.shown\s*\{display:block\}/);
});

test('status height and margins reduce the viewport height budget',()=>{
  const start=source.indexOf('function measureChrome()');
  const end=source.indexOf('\n/**',start+10);
  assert.ok(start>=0&&end>start);
  const code=source.slice(start,end);
  const makeMeasure=new Function('window','document','toolbarEl','exportStatusEl','containerEl',code+'\nreturn measureChrome;');
  const body={};
  const status={offsetHeight:38};
  const toolbar={offsetHeight:46};
  const container={};
  const window={getComputedStyle:(el)=>{
    if(el===body)return {paddingTop:'8px',paddingBottom:'8px'};
    if(el===status)return {marginTop:'8px',marginBottom:'0px'};
    if(el===container)return {borderTopWidth:'1px',borderBottomWidth:'1px'};
    throw Error('unexpected element');
  }};
  const measure=makeMeasure(window,{body},toolbar,status,container);
  assert.equal(measure(),16+46+38+8+2);
  status.offsetHeight=0;
  assert.equal(measure(),16+46+2);
});

test('showing the saved path reflows diagram before requesting iframe resize',()=>{
  const start=source.indexOf('function showExportStatus(state,message)');
  const end=source.indexOf('function localExportPath',start);
  assert.ok(start>=0&&end>start);
  const code=source.slice(start,end);
  assert.match(code,/exportStatusEl\.className='shown '\+state;\s*\/\/[\s\S]*?resizeContainerToFit\(\);\s*notifySize\('export status'\)/);
  const eventLog=[];
  const status={textContent:'',className:''};
  const exec=new Function('exportStatusEl','resizeContainerToFit','notifySize',code+'\nreturn showExportStatus;');
  const show=exec(status,()=>eventLog.push('reflow'),()=>eventLog.push('notify'));
  show('ok','Saved PNG: /tmp/drawio-test.png');
  assert.equal(status.textContent,'Saved PNG: /tmp/drawio-test.png');
  assert.equal(status.className,'shown ok');
  assert.deepEqual(eventLog,['reflow','notify']);
});
