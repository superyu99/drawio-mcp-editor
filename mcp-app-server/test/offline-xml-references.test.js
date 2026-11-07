import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {absolutizeImageUrls} from '../src/normalize-diagram-xml.js';

test('offline viewer rewrites bundled shape image references to SSH-forwarded Editor origin',()=>{
  const xml='<mxGraphModel><mxCell style="image=img/lib/a.svg;imageAspect=1;"/></mxGraphModel>';
  const output=absolutizeImageUrls(xml,'http://127.0.0.1:41391');
  assert.match(output,/image=http:\/\/127\.0\.0\.1:41391\/img\/lib\/a\.svg/);
  assert.doesNotMatch(output,/app\.diagrams\.net/);
});

test('already absolute data URI stays unchanged',()=>{
  const xml='<mxCell style="image=data:image/png;base64,abcdef;"/>';
  assert.equal(absolutizeImageUrls(xml,'http://127.0.0.1:41391'),xml);
});

test('offline local Node mode disables CDN and icon network by default',()=>{
  const index=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  const shared=fs.readFileSync(new URL('../src/shared.js',import.meta.url),'utf8');
  assert.match(index,/const offlineMode = process\.env\.DRAWIO_OFFLINE !== "0"/);
  assert.match(index,/offlineMode \? \[\] : await libavoidUrls\(\)/);
  assert.match(index,/offlineMode \? "off" : process\.env\.DRAWIO_ICON_SERVICE_URL/);
  assert.match(index,/readOfflineViewerAssets\(/);
  assert.match(shared,/if \(offline && \(!viewerJs \|\| !elkJs \|\| !mermaidJs \|\| !libavoidJs\)\)/);
  assert.match(shared,/connectDomains: offline \? \[\] : \["https:\/\/viewer\.diagrams\.net"\]/);
});
