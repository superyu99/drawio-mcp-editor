/**
 * Viewer/UI and snapshot/renderer have different network locations in Remote SSH.
 * The Viewer runs on the Cursor CLIENT; get_snapshot runs on the MCP SERVER.
 */
export function resolveEditorEndpoints(snapshotUrl, env = process.env) {
  const configured = String(env.DRAWIO_VIEWER_EDITOR_URL || '').trim();
  let viewerUrl = snapshotUrl || null;
  if (configured) {
    let parsed;
    try { parsed = new URL(configured); }
    catch { throw new Error('DRAWIO_VIEWER_EDITOR_URL must be a loopback HTTP URL such as http://127.0.0.1:41391'); }
    if (parsed.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(parsed.hostname) ||
        !parsed.port || Number(parsed.port) < 1 || parsed.username || parsed.password || parsed.pathname !== '/' ||
        parsed.search || parsed.hash) {
      throw new Error('DRAWIO_VIEWER_EDITOR_URL must be an HTTP loopback origin with explicit port (e.g. http://127.0.0.1:41391); no public URLs or paths.');
    }
    viewerUrl = parsed.origin;
  }
  return {snapshotUrl:snapshotUrl || null, viewerUrl};
}
