// Server-side PNG export using the bundled, unmodified official draw.io Editor.
// The Editor runs in an isolated, temporary headless Chrome/Edge/Chromium tab;
// it is NOT the Cursor MCP App card and requires no polling/active canvas.
// No Puppeteer, Playwright or third-party XML renderer is involved.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {savePngDataUrl} from './png-file.js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export class OfficialSnapshotError extends Error {
  constructor(code, message, details={}) {
    super(message);
    this.name='OfficialSnapshotError';
    this.code=code;
    this.details=details;
  }
}

export function describeOfficialSnapshotError(error,{name}={}) {
  return JSON.stringify({
    code:error?.code || 'OFFICIAL_EXPORT_FAILED',
    name:name||null,
    stage:error?.details?.stage || 'official_editor_export',
    message:error?.message || String(error),
    ...(error?.details || {}),
    retryable:['EDITOR_START_TIMEOUT','EDITOR_EXPORT_TIMEOUT','BROWSER_LAUNCH_FAILED'].includes(error?.code),
    nextAction:error?.code==='BROWSER_NOT_FOUND'
      ? 'Install Chrome, Edge, or Chromium locally, or set DRAWIO_BROWSER_PATH to its executable. No new server is needed.'
      : error?.code==='MATHJAX_RENDER_FAILED'
      ? 'Verify vendor/drawio-webapp/math4/es5/drawio-mathjax.min.js and the math font assets, then inspect the reported MathJax error. The incomplete PNG was not saved.'
      : error?.code==='EDITOR_ASSETS_MISSING'
      ? 'Bundle the official draw.io webapp into mcp-app-server/vendor/drawio-webapp using scripts/bundle-editor.sh.'
      : 'Inspect the reported stage/message and the [drawio-official-snapshot] stderr logs. Do not reuse old PNGs.',
  });
}

function usable(file) {
  try {return !!file && fs.statSync(file).isFile();}
  catch {return false;}
}

export function findBrowserExecutable(env=process.env, platform=process.platform) {
  const specified=env.DRAWIO_BROWSER_PATH || env.DRAWIO_CHROME_PATH;
  if (specified) {
    if (usable(specified)) return specified;
    throw new OfficialSnapshotError('BROWSER_NOT_FOUND',`Browser executable does not exist: ${specified}`,{stage:'finding_browser'});
  }
  const candidates=[];
  if (platform==='win32') {
    for (const base of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'],env.LOCALAPPDATA]) {
      if (!base) continue;
      for (const rel of [
        'Google/Chrome/Application/chrome.exe',
        'Microsoft/Edge/Application/msedge.exe',
        'Chromium/Application/chrome.exe',
      ]) candidates.push(path.join(base,...rel.split('/')));
    }
  } else if (platform==='darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium');
  } else {
    candidates.push('/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable','/opt/google/chrome/chrome','/snap/bin/chromium');
  }
  for (const p of candidates) if (usable(p)) return p;
  const names=platform==='win32'?['chrome.exe','msedge.exe']:
    platform==='darwin'?['Google Chrome','Chromium']:
    ['chromium','chromium-browser','google-chrome','google-chrome-stable','microsoft-edge'];
  for (const name of names) {
    try {
      const result=spawnSync(platform==='win32'?'where':'which',[name],{encoding:'utf8',timeout:1200,windowsHide:true});
      const found=result.status===0?result.stdout.trim().split(/\r?\n/)[0]:null;
      if (usable(found)) return found;
    } catch { /* try the next candidate */ }
  }
  throw new OfficialSnapshotError('BROWSER_NOT_FOUND',
    'No local Chrome, Edge or Chromium executable found (the official Editor needs a browser Canvas runtime).',
    {stage:'finding_browser'});
}

class CdpConnection {
  constructor(socket) {
    this.socket=socket;
    this.nextId=1;
    this.pending=new Map();
    socket.addEventListener('message',(event)=>{
      let packet;
      try { packet=JSON.parse(event.data); } catch { return; }
      if (typeof packet.id!=='number') return;
      const call=this.pending.get(packet.id);
      if (!call) return;
      this.pending.delete(packet.id);
      if (packet.error) call.reject(new Error(`CDP ${call.method}: ${packet.error.message}`));
      else call.resolve(packet.result||{});
    });
    socket.addEventListener('close',()=>this.failAll(new Error('DevTools websocket closed')));
    socket.addEventListener('error',()=>this.failAll(new Error('DevTools websocket error')));
  }
  failAll(error) {
    for (const call of this.pending.values()) call.reject(error);
    this.pending.clear();
  }
  send(method,params={}) {
    if (this.socket.readyState!==WebSocket.OPEN) return Promise.reject(new Error('DevTools socket is not open'));
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        if (this.pending.delete(id)) reject(new Error(`CDP ${method} timed out`));
      },15000);
      this.pending.set(id,{method,resolve:(value)=>{clearTimeout(timer);resolve(value);},
        reject:(error)=>{clearTimeout(timer);reject(error);}});
      try {this.socket.send(JSON.stringify({id,method,params}));}
      catch(e) {this.pending.delete(id);reject(e);}
    });
  }
  async evaluate(expression) {
    const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:false});
    if (result.exceptionDetails) throw new Error('Renderer page JavaScript error: '+
      (result.exceptionDetails.text||JSON.stringify(result.exceptionDetails)));
    return result.result?.value;
  }
  close() {
    this.failAll(new Error('DevTools connection closed'));
    try {this.socket.close();} catch { /* already closed */ }
  }
}

async function openCdp(url,deadline) {
  if (typeof WebSocket==='undefined') throw new OfficialSnapshotError('NODE_VERSION_UNSUPPORTED',
    'Server-side official Editor export requires Node.js 22+ (built-in WebSocket), or a compatible WebSocket adapter.',
    {stage:'connecting_browser'});
  return new Promise((resolve,reject)=>{
    const socket=new WebSocket(url);
    let settled=false;
    const timer=setTimeout(()=>finish(new Error('DevTools websocket handshake timed out')),Math.max(1,deadline-Date.now()));
    function finish(error) {
      if (settled) return;
      settled=true;
      clearTimeout(timer);
      if (error) {try{socket.close();}catch{};reject(error);}
      else resolve(new CdpConnection(socket));
    }
    socket.addEventListener('open',()=>finish());
    socket.addEventListener('error',()=>finish(new Error('DevTools websocket handshake failed')));
  });
}

async function waitForPort(directory, child, deadline) {
  const file=path.join(directory,'DevToolsActivePort');
  while (Date.now()<deadline) {
    if (fs.existsSync(file)) {
      const port=Number(fs.readFileSync(file,'utf8').split(/\r?\n/)[0]);
      if (Number.isInteger(port)&&port>0) return port;
    }
    if (child.exitCode!==null) break;
    await pause(80);
  }
  throw new OfficialSnapshotError('BROWSER_LAUNCH_FAILED',
    'Headless browser did not open its local DevTools endpoint.',{stage:'starting_browser'});
}

async function waitForStatus(cdp,accepted,deadline,phase) {
  while (Date.now()<deadline) {
    const info=await cdp.evaluate('({status:window.__drawioRenderState?.status||"loading",error:window.__drawioRenderState?.error||null})');
    if (info?.status==='error') throw new OfficialSnapshotError(
      /MathJax/i.test(info.error||'')?'MATHJAX_RENDER_FAILED':'EDITOR_EXPORT_FAILED',
      info.error||'Official Editor failed to export PNG',{stage:phase});
    if (accepted.includes(info?.status)) return info.status;
    await pause(150);
  }
  let debug;
  try { debug=await cdp.evaluate('({url:location.href,state:window.__drawioRenderState||null,frames:document.querySelectorAll("iframe").length,title:document.title,ready:document.readyState})'); } catch(e) {debug={error:e.message};}
  throw new OfficialSnapshotError(phase==='initializing_editor'?'EDITOR_START_TIMEOUT':'EDITOR_EXPORT_TIMEOUT',
    `Official Editor did not reach ${accepted.join('/')} within the configured time`,{stage:phase,debug});
}

/** Export PNG through the *official* embedded Editor's action:'export' protocol. */
export async function renderWithOfficialEditor(xml,{editorUrl,browserPath,timeoutMs=60000,
  tempDir=os.tmpdir(),logger=console.error}={}) {
  if (typeof xml!=='string'||!/^\s*(?:<\?xml\s[^>]*>\s*)?<(?:mxfile|mxGraphModel)\b/.test(xml.replace(/^\uFEFF/,'')))
    throw new OfficialSnapshotError('INVALID_DIAGRAM_XML','Expected a .drawio <mxfile> or <mxGraphModel> document.',{stage:'reading_xml'});
  if (!editorUrl) throw new OfficialSnapshotError('EDITOR_ASSETS_MISSING',
    'Bundled official draw.io Editor is unavailable; no screenshot can be rendered.',{stage:'finding_editor'});
  const browser=browserPath||findBrowserExecutable();
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'drawio-render-profile-'));
  const deadline=Date.now()+timeoutMs;
  const args=[
    '--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,
    '--no-first-run','--no-default-browser-check','--disable-extensions',
    '--disable-background-networking','--disable-dev-shm-usage','--hide-scrollbars',
    '--disable-features=Translate',
    'about:blank',
  ];
  // In root/containers where user namespaces are unavailable, opt in explicitly.
  if ((typeof process.getuid==='function'&&process.getuid()===0)||process.env.DRAWIO_RENDER_NO_SANDBOX==='1')
    args.unshift('--no-sandbox');
  let child,cdp,stderr='';
  try {
    child=spawn(browser,args,{stdio:['ignore','ignore','pipe'],windowsHide:true});
    child.stderr?.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-3000);});
    child.on('error',()=>{}); // handled by the endpoint deadline, never unhandled
    const port=await waitForPort(profile,child,Math.min(deadline,Date.now()+12000));
    const url=`http://127.0.0.1:${port}`;
    let target;
    try {
      const response=await fetch(url+'/json/new?about:blank',{method:'PUT',signal:AbortSignal.timeout(4000)});
      if (!response.ok) throw new Error('HTTP '+response.status);
      target=await response.json();
    } catch(e) {throw new OfficialSnapshotError('BROWSER_CONTROL_FAILED',`Cannot create render tab: ${e.message}`,{stage:'connecting_browser'});}
    cdp=await openCdp(target.webSocketDebuggerUrl,Math.min(deadline,Date.now()+5000));
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    const nav=await cdp.send('Page.navigate',{url:editorUrl+'/__drawio_snapshot__.html'});
    if(nav.errorText) throw new OfficialSnapshotError('BROWSER_NAVIGATION_FAILED',nav.errorText,{stage:'loading_renderer',browserStderr:stderr.slice(-1000)});
    await waitForStatus(cdp,['ready'],deadline,'initializing_editor');
    const launched=await cdp.evaluate('window.__drawioStartExport('+JSON.stringify(xml)+')');
    if (launched!==true) throw new OfficialSnapshotError('EDITOR_EXPORT_FAILED',
      'Official Editor refused the export action',{stage:'starting_export'});
    await waitForStatus(cdp,['done'],deadline,'exporting_png');
    const png=await cdp.evaluate('window.__drawioRenderState?.data');
    if (typeof png!=='string'||!png.startsWith('data:image/png;base64,'))
      throw new OfficialSnapshotError('INVALID_EDITOR_OUTPUT','Official Editor returned no PNG data URL',{stage:'validating_png'});
    const file=savePngDataUrl(png,{tempDir});
    const bytes=fs.readFileSync(file);
    if (bytes.readUInt32BE(16)<32||bytes.readUInt32BE(20)<32) {
      fs.rmSync(file,{force:true});
      throw new OfficialSnapshotError('INVALID_EDITOR_OUTPUT','Official Editor produced an implausibly tiny PNG, likely a fallback.',{stage:'validating_png'});
    }
    logger('[drawio-official-snapshot] '+JSON.stringify({event:'saved',file,bytes:bytes.length,
      width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}));
    return file;
  } catch(e) {
    if (e instanceof OfficialSnapshotError) {
      logger('[drawio-official-snapshot] '+JSON.stringify({event:'failed',code:e.code,stage:e.details?.stage,message:e.message}));
      throw e;
    }
    throw new OfficialSnapshotError('OFFICIAL_EXPORT_FAILED',e.message||String(e),
      {stage:'browser_or_editor',browserStderr:stderr.slice(-1000)});
  } finally {
    cdp?.close();
    if (child && child.exitCode===null) child.kill();
    // The isolated profile is purely temporary. Chrome may take a moment to release files.
    for (let i=0;i<3;i++) {
      try {fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:120});break;}
      catch {await pause(100);}
    }
  }
}
