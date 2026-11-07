import fs from 'node:fs';
import path from 'node:path';

/** Read the official draw.io assets already deployed alongside the MCP Server.
 * Never perform a network request or substitute a CDN script at runtime.
 */
export function readOfflineViewerAssets(editorDirectory, overrides = {}) {
  if (!editorDirectory) {
    throw new Error('DRAWIO_OFFLINE: official Editor assets missing. Copy a complete vendor/drawio-webapp directory or set DRAWIO_EDITOR_DIR; remote runtime downloads are forbidden.');
  }
  function read(relativePath, override) {
    const target = override ? path.resolve(override) : path.join(editorDirectory, relativePath);
    try { return fs.readFileSync(target, 'utf8'); }
    catch (e) { throw new Error(`DRAWIO_OFFLINE: missing ${target} (${e.code || e.message}). Bundle all official draw.io JS assets before running the MCP Server.`); }
  }
  // Formula support is a first-class offline requirement, not a CDN fallback.
  const mathBundle = path.join(editorDirectory, 'math4/es5/drawio-mathjax.min.js');
  if (!fs.existsSync(mathBundle)) {
    throw new Error('DRAWIO_OFFLINE: missing ' + mathBundle + '. Bundle official MathJax assets before starting MCP Server.');
  }
  const viewerPath = overrides.viewer;
  let viewerJs;
  if (viewerPath && fs.statSync(path.resolve(viewerPath)).isDirectory()) {
    viewerJs = read('', path.join(viewerPath, 'viewer-static.min.js'));
    const graphViewer = path.join(viewerPath, 'diagramly', 'GraphViewer.js');
    if (fs.existsSync(graphViewer)) viewerJs += '\n' + read('', graphViewer);
  } else {
    viewerJs = read('js/viewer-static.min.js', viewerPath);
  }
  const elkJs = read('js/elk/drawio-elk.min.js', overrides.elk);
  const mermaidJs = read('js/mermaid/drawio-mermaid.min.js', overrides.mermaid);
  const libavoidCore = read('js/libavoid-js/libavoid.min.js', overrides.libavoid);
  const libavoidRouting = read('js/libavoid-js/libavoid-routing.js', overrides.libavoidRouting);
  // Escape </script> because bundles are inlined in an HTML <script> element.
  return {
    viewerJs,
    elkJs,
    mermaidJs,
    libavoidJs: libavoidCore + '\n' + libavoidRouting,
  };
}
