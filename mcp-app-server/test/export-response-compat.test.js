import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the exact source embedded in the viewer, not a second test-only
// implementation of the path parser.
const htmlSource=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
const start=htmlSource.indexOf('function localExportPath(response) {');
const end=htmlSource.indexOf('\nconst editBtn',start);
assert.ok(start>0 && end>start);
const embeddedSource=htmlSource.slice(start,end);
// Mimics a JS template literal (the source is embedded in buildHtml's markup).
const emitted=vm.runInNewContext('`'+embeddedSource.replaceAll('`','\\`')+'`');
const ctx=vm.createContext({});
vm.runInContext(emitted,ctx);
const get=(value)=>ctx.localExportPath(value);

test('export UI reads standard structuredContent and plain content block',()=>{
  assert.equal(get({structuredContent:{path:'/home/aron/drawio-exports/a.png'},content:[{type:'text',text:'/home/aron/drawio-exports/a.png'}]}),'/home/aron/drawio-exports/a.png');
  assert.equal(get({content:[{type:'text',text:'/home/aron/drawio-exports/a.drawio'}]}),'/home/aron/drawio-exports/a.drawio');
});

test('export UI handles Cursor/host-wrapped JSON-RPC and JSON content',()=>{
  const p='/home/aron/diagrams/transformer-architecture.drawio';
  assert.equal(get({result:{structuredContent:{path:p}}}),p);
  assert.equal(get({result:{content:[{type:'text',text:p}]}}),p);
  assert.equal(get({content:[{type:'text',text:JSON.stringify({path:p})}]}),p);
  assert.equal(get({structuredContent:{result:{path:p}}}),p);
  assert.equal(get({data:{output:{path:p}}}),p);
  assert.equal(get(JSON.stringify({result:{structuredContent:{path:p}}})),p);
  assert.equal(get({content:[{type:'text',text:JSON.stringify({content:[{type:'text',text:p}]})}]}),p);
});

test('errors propagated; missing path never claims saved',()=>{
  assert.throws(()=>get({isError:true,content:[{type:'text',text:'Permission denied'}]}),/Permission denied/);
  assert.throws(()=>get({result:{isError:true,content:[{type:'text',text:'Source .drawio changed'}]}}),/Source .drawio changed/);
  assert.throws(()=>get({content:[]}),/no absolute path.*content/);
  assert.throws(()=>get({error:{message:'Tool not available'}}),/Tool not available/);
  assert.throws(()=>get({content:[{type:'text',text:'Saved to SOMEWHERE'}]}),/no absolute path/);
  assert.throws(()=>get(null),/no absolute path/);
});

test('Windows absolute paths supported; relative path rejected',()=>{
  assert.equal(get({content:[{type:'text',text:'C:\\diagrams\\a.png'}]}),'C:\\diagrams\\a.png');
  assert.throws(()=>get({structuredContent:{path:'./a.png'}}),/no absolute path/);
});
