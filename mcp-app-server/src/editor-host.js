import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.xml':'application/xml','.ico':'image/x-icon','.webp':'image/webp'};
const bundledEditor = fileURLToPath(new URL('../vendor/drawio-webapp/', import.meta.url));

// Small same-origin harness for the official Editor's supported embed/export protocol.
// Only served on loopback. It contains NO renderer: every pixel comes from
// the bundled draw.io Editor (EditorUi.exportToCanvas -> canvas.toDataURL).
export const OFFICIAL_RENDER_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>Internal draw.io PNG Export</title></head>
<body style="margin:0"><iframe id="editor" style="position:absolute;width:1280px;height:960px;border:0"
></iframe>
<script>
  window.__drawioRenderState={status:'loading',data:null,error:null};
  var frame=document.getElementById('editor');
  var sourceXml='';
  var mathTimer=null;
  function fail(error){
    if(mathTimer!==null){clearTimeout(mathTimer);mathTimer=null;}
    window.__drawioRenderState={status:'error',data:null,error:String(error)};
  }
  function exportLoadedDiagram(){
    if(window.__drawioRenderState.status!=='typesetting_math') return;
    if(mathTimer!==null){clearTimeout(mathTimer);mathTimer=null;}
    window.__drawioRenderState={status:'exporting',data:null,error:null};
    // Do NOT send xml again: official PNG export would reload the graph and
    // start MathJax asynchronously, then capture the raw TeX immediately.
    frame.contentWindow.postMessage(JSON.stringify({
      action:'export',format:'png',scale:1,border:8,
      background:'#ffffff',transparent:false
    }),location.origin);
  }
  function formulaCount(text){
    // Count complete formulas, not delimiters independently: an environment
    // nested in display/inline math is still ONE formula. The old heuristic
    // rejected valid MathJax matrices/aligned blocks as "missing SVG".
    var slash=String.fromCharCode(92), count=0;
    function stripPairs(open,close){
      var rest='',from=0,start,end;
      while((start=text.indexOf(open,from))!==-1){
        end=text.indexOf(close,start+open.length);
        if(end<0) break;
        rest+=text.slice(from,start)+' ';
        count++;
        from=end+close.length;
      }
      text=rest+text.slice(from);
    }
    stripPairs('$$','$$');
    stripPairs(slash+'(',slash+')');
    stripPairs(slash+'[',slash+']');
    // Standalone environment blocks count once even when nested.
    var begin=slash+'begin{',endTag=slash+'end{',pos=0,depth=0;
    while(pos<text.length){
      var a=text.indexOf(begin,pos),b=text.indexOf(endTag,pos);
      if(a<0 && b<0) break;
      if(a>=0 && (b<0 || a<b)){
        if(depth===0) count++;
        depth++;pos=a+begin.length;
      } else {depth=Math.max(0,depth-1);pos=b+endTag.length;}
    }
    return count;
  }
  function typesetThenExport(){
    window.__drawioRenderState={status:'typesetting_math',data:null,error:null};
    var win=frame.contentWindow;
    var doc=frame.contentDocument;
    if(!doc||!doc.body){fail('Official Editor DOM is unavailable');return;}
    var visibleMath=formulaCount(doc.body.textContent||'');
    var inputHasMath=formulaCount(sourceXml)>0;
    if(visibleMath===0&&!inputHasMath){exportLoadedDiagram();return;}
    mathTimer=setTimeout(function(){fail('MathJax did not finish within 20000ms');},20000);
    var editor=win&&win.Editor;
    if(!editor||typeof editor.loadMath!=='function'||typeof editor.MathJaxRender!=='function'){
      fail('Official Editor MathJax API is unavailable');return;
    }
    // Editor.loadMath waits for its local 2 MB math bundle to initialize.
    // Its callback also runs when loading FAILED, so check the real engine.
    editor.loadMath(function(){
      if(window.__drawioRenderState.status!=='typesetting_math') return;
      try{
        var engine=win.DrawioMathJax;
        if(!engine||typeof engine.typeset!=='function')
          throw new Error('Official draw.io MathJax bundle failed to load');
        var expected=visibleMath;
        // Use the official typesetting function, not a custom TeX renderer.
        editor.MathJaxRender(doc.body);
        win.requestAnimationFrame(function(){win.requestAnimationFrame(function(){
          if(window.__drawioRenderState.status!=='typesetting_math') return;
          var rendered=doc.querySelectorAll('mjx-container svg').length;
          if(rendered<Math.max(1,expected)){
            fail('MathJax did not render all visible formulas; PNG not saved');return;
          }
          exportLoadedDiagram();
        });});
      }catch(e){fail('MathJax typesetting failed: '+(e&&e.message||e));}
    });
  }
  frame.onerror=function(){fail('Official Editor iframe could not load');};
  window.addEventListener('message',function(event){
    if(event.source!==frame.contentWindow||event.origin!==location.origin) return;
    var payload=event.data;
    if(typeof payload==='string') {
      try{payload=JSON.parse(payload);}catch(e){return;}
    }
    if(!payload||typeof payload!=='object') return;
    if(payload.event==='init'){
      if(window.__drawioRenderState.status==='loading') window.__drawioRenderState.status='ready';
    } else if(payload.event==='load') {
      if(window.__drawioRenderState.status==='loading_xml') typesetThenExport();
    } else if(payload.event==='export') {
      if(window.__drawioRenderState.status!=='exporting') return;
      if(payload.format==='png'&&typeof payload.data==='string'){
        window.__drawioRenderState={status:'done',data:payload.data,error:null};
      } else {
        fail('Official Editor returned a non-PNG export');
      }
    } else if(payload.event==='error') {
      fail(String(payload.message||'Official Editor error'));
    }
  });
  // Force math for models that contain TeX but forgot math="1". The Editor
  // itself still handles the graph/labels and does all SVG/PNG conversion.
  frame.src="/?embed=1&proto=json&math=1&spin=0&libraries=1&noSaveBtn=1&noExitBtn=1&suppressNewWindows=1";
  window.__drawioStartExport=function(xml){
    if(window.__drawioRenderState.status!=='ready') return false;
    sourceXml=xml;
    window.__drawioRenderState={status:'loading_xml',data:null,error:null};
    frame.contentWindow.postMessage(JSON.stringify({action:'load',xml:xml}),location.origin);
    return true;
  };
</script></body></html>`;

export function findEditorDirectory() {
  return fs.existsSync(path.join(bundledEditor, 'index.html')) && fs.existsSync(path.join(bundledEditor, 'js/app.min.js')) ? bundledEditor : null;
}

export async function startEditorHost(directory = process.env.DRAWIO_EDITOR_DIR, options = {}) {
  directory ||= findEditorDirectory();
  if (!directory) {
    console.error('[drawio] Bundled Editor is missing. Run scripts/bundle-editor.sh on a connected machine, then deploy the resulting package.');
    return null;
  }
  const root = fs.realpathSync(path.resolve(directory));
  if (!fs.existsSync(path.join(root, 'index.html')) || !fs.existsSync(path.join(root, 'js/app.min.js')))
    throw new Error('Editor directory requires index.html and js/app.min.js: ' + root);

  const server = http.createServer((req, res) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && new URL(req.url, 'http://localhost').pathname === '/__drawio_snapshot__.html') {
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
      if (req.method === 'GET') res.end(OFFICIAL_RENDER_PAGE); else res.end();
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let name;
    try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    let resolved;
    try { resolved = fs.realpathSync(file); }
    catch { res.writeHead(404).end(); return; }
    if (!resolved.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'content-type':types[path.extname(resolved).toLowerCase()] || 'application/octet-stream', 'cache-control':'no-store', 'x-content-type-options':'nosniff', 'access-control-allow-origin':'*'});
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(resolved).pipe(res);
  });
  // Snapshot-only hosts use an ephemeral loopback port. Explicit fixed ports
  // (legacy configuration) must not take down an entire MCP connection when
  // several Cursor windows start their own stdio processes.
  const portText = options.port !== undefined ? options.port : process.env.DRAWIO_EDITOR_PORT;
  const port = portText == null || portText === '' ? 0 : Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65535 || (port === 0 && portText != null && portText !== '' && String(portText) !== '0')) {
    throw new Error('DRAWIO_EDITOR_PORT must be an integer from 0 to 65535');
  }
  const listen = requested => new Promise((resolve, reject) => {
    const onError = err => {server.removeListener('listening', onListening); reject(err);};
    const onListening = () => {server.removeListener('error', onError); resolve();};
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(requested, '127.0.0.1');
  });
  try { await listen(port); }
  catch (error) {
    if (error.code !== 'EADDRINUSE' || port === 0 || options.fallbackToEphemeral === false) throw error;
    console.error('[drawio] port ' + port + ' occupied by another process; this MCP instance uses an ephemeral snapshot port');
    await listen(0);
  }
  // For normal stdio MCP this host must not keep a disconnected MCP alive.
  // The explicit LOCAL shared-assets command keeps its host alive instead.
  if (!options.keepAlive) server.unref();
  const url = `http://127.0.0.1:${server.address().port}`;
  console.error('[drawio] bundled official Editor at ' + url);
  return {url, server};
}
