/**
 * MathJax integration for the standalone MCP App Viewer (not the official Editor).
 * This function is stringified into the app HTML: keep it dependency-free and
 * avoid imports / module-only globals in its body.
 *
 * The Editor's math4/es5/drawio-mathjax.min.js runs locally on the same Editor
 * static-resource host. Only when the Editor host is absent do we fall back to
 * viewer.diagrams.net; failures must be surfaced, never silently screenshot raw TeX.
 */
export function createViewerMathRuntime(options) {
  options = options || {};
  var editorBase = options.editorBase || null;
  var offline = !!options.offline;
  var onError = options.onError || function(e) { console.error('[drawio viewer math]', e); };
  var assetBase = (editorBase || 'https://viewer.diagrams.net').replace(/\/$/, '') + '/math4/es5';
  var promise = null;
  var generation = 0;
  var pending = Promise.resolve();

  function hasFormula(text) {
    // Delimiters supported by draw.io. Avoid enabling math for ordinary prices.
    return typeof text === 'string' &&
      (/\\\(|\\\[|\\begin\{|\$\$/.test(text) || /\$[^\s$][^$]*\$/.test(text));
  }
  function mathJaxReady() {
    return typeof window.DrawioMathJax !== 'undefined' &&
      typeof window.DrawioMathJax.typeset === 'function' &&
      typeof window.DrawioMathJax.typesetClear === 'function';
  }
  function ensureEngine() {
    if (mathJaxReady()) return Promise.resolve(window.DrawioMathJax);
    if (promise) return promise;
    if (offline && !editorBase) return Promise.reject(new Error('Offline draw.io MathJax requires the bundled Editor. No public CDN fallback is permitted.'));
    promise = new Promise(function(resolve, reject) {
      var done = false;
      var script = null;
      var timer = null;
      var interval = null;
      function finish(error) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        clearInterval(interval);
        if (error) reject(new Error('draw.io MathJax unavailable (' + assetBase + '): ' + error.message));
        else resolve(window.DrawioMathJax);
      }
      function checkReady() { if (mathJaxReady()) finish(); }
      if (typeof window.DrawioMathJax === 'undefined') {
        window.DrawioMathJax = {
          options: {skipHtmlTags: {'[+]': ['text']}, ignoreHtmlClass: 'geDisableMathJax'},
          loader: {
            load: ['output/svg', 'input/tex', 'input/asciimath', 'ui/safe', '[tex]/html'],
            paths: {'fonts': assetBase + '/fonts'}
          },
          output: {font: 'mathjax-tex'},
          startup: {pageReady: function() { checkReady(); }}
        };
      }
      interval = setInterval(checkReady, 40);
      timer = setTimeout(function() {
        finish(new Error('timed out loading or initializing drawio-mathjax.min.js'));
      }, 8000);
      script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = assetBase + '/drawio-mathjax.min.js';
      script.onerror = function() { finish(new Error('script blocked or missing (check Editor math4 assets and MCP App CSP)')); };
      script.onload = checkReady;
      document.head.appendChild(script);
    });
    return promise;
  }
  function typeset(root) {
    var engine = window.DrawioMathJax;
    if (!mathJaxReady()) throw new Error('draw.io MathJax is not ready');
    engine.typesetClear([root]);
    engine.typeset([root]);
  }
  function updateModel(graph, node) {
    if (!graph || !node || node.nodeName !== 'mxGraphModel') return;
    // Equivalent to the official Editor's setGraphXml math flag restoration.
    var enabled = node.getAttribute('math') === '1';
    // The official Editor only enables math when math="1". If a generated
    // diagram omitted it but explicitly uses TeX delimiters, recover gracefully.
    if (!enabled && hasFormula(node.getAttribute('value') || node.textContent || '')) enabled = true;
    if (!enabled && node.getElementsByTagName) {
      // Labels can be on <mxCell>, <object> or <UserObject> wrappers.
      var tags = ['mxCell', 'object', 'UserObject'];
      for (var t = 0; t < tags.length && !enabled; t++) {
        var cells = node.getElementsByTagName(tags[t]);
        for (var i = 0; i < cells.length; i++) {
          if (hasFormula(cells[i].getAttribute('value')) ||
              hasFormula(cells[i].getAttribute('label'))) { enabled = true; break; }
        }
      }
    }
    graph.mathEnabled = enabled;
    schedule(graph);
  }
  function schedule(graph) {
    var token = ++generation;
    if (!graph || !graph.mathEnabled) { pending = Promise.resolve(); return; }
    // Coalesce streaming partials; do not spend MathJax work on every token.
    pending = new Promise(function(resolve) { setTimeout(resolve, 150); }).then(async function() {
      if (token !== generation || !graph.mathEnabled) return;
      await ensureEngine();
      if (token === generation && graph.mathEnabled && graph.container) typeset(graph.container);
    });
    pending.catch(onError);
  }
  async function flush(graph) {
    if (!graph || !graph.mathEnabled) return;
    ++generation;  // Invalidate an in-flight/debounced old partial.
    await ensureEngine();
    if (graph.container) typeset(graph.container);
    // MathJax's draw.io bundle has synchronous SVG output. Let the browser
    // commit text layout before getting exported SVG bounds.
    await new Promise(function(resolve) { requestAnimationFrame(resolve); });
  }
  async function typesetSvg(svg, graph) {
    if (!graph || !graph.mathEnabled) return;
    await ensureEngine();
    var raw = svg.textContent || '';
    var hasRawMath = hasFormula(raw);
    var mount = document.createElement('div');
    mount.style.cssText = 'position:absolute;left:-100000px;top:-100000px;visibility:hidden;pointer-events:none';
    mount.appendChild(svg);
    document.body.appendChild(mount);
    try {
      typeset(mount);
      // Fail closed: do not return a plausible PNG with missing formulas.
      // MathJax outputs <mjx-container> with inline SVG for these expressions.
      if (hasRawMath && !mount.querySelector('mjx-container')) {
        throw new Error('MathJax did not typeset the formulas in exported SVG; no PNG was saved');
      }
    } finally { mount.remove(); }
  }
  return {updateModel: updateModel, schedule: schedule, flush: flush,
    typesetSvg: typesetSvg, ensureEngine: ensureEngine, hasFormula: hasFormula};
}
