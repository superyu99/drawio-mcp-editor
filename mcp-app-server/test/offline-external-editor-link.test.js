import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {Buffer} from 'node:buffer';

const src=readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
const block=src.match(/\nfunction generateDrawioEditUrl\(xml\)\n\{\n[\s\S]*?\n\}\n/);
assert.ok(block,'external edit link function must exist');
const pako={deflateRaw: x=>deflateRawSync(Buffer.from(x))};
const btoa=x=>Buffer.from(x,'binary').toString('base64');
function makeLink(xml){
  const fn=new Function('pako','btoa',block[0]+'\nreturn generateDrawioEditUrl;')(pako,btoa);
  return fn(xml);
}
const xml='<mxGraphModel math="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
function checkPayload(href){
  const url=new URL(href);
  assert.equal(url.searchParams.get('pv'),'0');
  assert.equal(url.searchParams.get('grid'),'0');
  assert.ok(url.hash.startsWith('#create='));
  const blob=JSON.parse(decodeURIComponent(url.hash.slice('#create='.length)));
  assert.equal(blob.effect,'pop');
  assert.equal(blob.type,'xml');
  assert.equal(blob.compressed,true);
  assert.equal(decodeURIComponent(inflateRawSync(Buffer.from(blob.data,'base64')).toString()),xml);
  return url;
}
test('Open in draw.io deliberately uses the public official editor for local/Remote SSH',()=>{
  const url=checkPayload(makeLink(xml));
  assert.equal(url.origin,'https://app.diagrams.net');
  assert.equal(url.searchParams.has('offline'),false);
  assert.doesNotMatch(url.href,/127\.0\.0\.1/);
});
test('generating the optional online URL does not access the network',()=>{
  // The URL is computed from XML entirely locally; the browser only opens
  // it when the person explicitly clicks the Open in draw.io button.
  assert.equal(makeLink(''),null);
  assert.equal(makeLink(null),null);
  assert.equal(typeof makeLink(xml),'string');
  assert.match(src,/openDrawioBtn\.addEventListener\('click'/);
});
test('external Editor button does not silently swallow missing editor or rejected host openLink',()=>{
  const start=src.indexOf("openDrawioBtn.addEventListener('click'");
  assert.ok(start>0);
  const area=src.slice(start,start+1600);
  assert.match(area,/if \(!drawioEditUrl\)/);
  assert.match(area,/showExternalEditorLink\(url,/);
  assert.match(area,/app\.openLink\(\{url:url\}\)/);
  assert.match(area,/result\.catch\(function\(e\)/);
  assert.match(src,/copy\.textContent = 'Copy URL'/);
});
