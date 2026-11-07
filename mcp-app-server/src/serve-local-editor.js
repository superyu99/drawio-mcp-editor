#!/usr/bin/env node
/**
 * One local, offline static-resource host shared by all Cursor windows.
 * It is NOT an MCP server and never reads or stores user diagrams.
 * Run this on the CLIENT computer when using remote Cursor SSH projects.
 */
import {startEditorHost} from './editor-host.js';

const raw = process.env.DRAWIO_LOCAL_EDITOR_PORT || '41391';
const port = Number(raw);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('DRAWIO_LOCAL_EDITOR_PORT must be an integer from 1 to 65535');
  process.exit(1);
}
try {
  const host = await startEditorHost(process.env.DRAWIO_EDITOR_DIR, {
    port, keepAlive:true, fallbackToEphemeral:false
  });
  if (!host) throw new Error('Bundled official Editor assets are missing');
  console.error('[drawio-local-assets] READY ' + host.url);
  for (const signal of ['SIGINT','SIGTERM']) {
    process.once(signal, () => host.server.close(() => process.exit(0)));
  }
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    console.error('[drawio-local-assets] Port ' + port + ' is in use. Run only one local assets host. If one is already running, reuse it; otherwise find the listener before restarting.');
  } else {
    console.error('[drawio-local-assets] '+(error.stack || error));
  }
  process.exit(1);
}
