// Persistent, stable-name exports. The diagram store remains process-local and
// temporary; exported files are deliberately user-owned, not session caches.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {validDiagramName} from './diagram-store.js';
import {decodePngDataUrl, validatePngBytes} from './png-file.js';

export function getExportDirectory(env=process.env, home=os.homedir()) {
  const configured=env.DRAWIO_EXPORT_DIR?.trim();
  if (!configured) return path.join(home,'drawio-exports');
  if (configured==='~') return home;
  if (configured.startsWith('~/')) return path.join(home,configured.slice(2));
  if (!path.isAbsolute(configured))
    throw new Error('DRAWIO_EXPORT_DIR must be an absolute path (or ~/path)');
  return path.resolve(configured);
}

function exportPath(name,extension,{directory}={}) {
  if (!validDiagramName(name)) throw new Error('Invalid semantic diagram name for export');
  const dir=directory ?? getExportDirectory();
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  return path.join(dir,`${name}.${extension}`);
}

function writeAtomic(file,bytes) {
  const tmp=path.join(path.dirname(file),`.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(tmp,bytes,{flag:'wx',mode:0o600});
    fs.renameSync(tmp,file); // complete overwrite, never a truncated partial file
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  return file;
}

// A .drawio file is an mxfile document, not a bare Viewer mxGraphModel.
// Preserve existing mxfile documents verbatim (including multiple/compressed pages).
export function asDrawioDocument(xml) {
  if (typeof xml!=='string') throw new Error('No valid current diagram XML to export');
  const start=xml.replace(/^\uFEFF/, '').trimStart().replace(/^<\?xml\s[^>]*>\s*/, '');
  if (/^<mxfile\b/.test(start)) return xml;
  if (!/^<mxGraphModel\b/.test(start) || !/<\/mxGraphModel>\s*$/.test(start))
    throw new Error('No valid current diagram XML to export');
  return `<mxfile host="app.diagrams.net"><diagram id="page-1" name="Page-1">${start.trim()}</diagram></mxfile>`;
}

// Imported documents are session-local until the human explicitly clicks Save .drawio
// (or the agent calls export_diagram(..., format:'drawio')). Never overwrite an
// externally modified original: each process tracks its source file fingerprint.
export function exportCurrentDrawio(record,xml,options={}) {
  if (!record.sourcePath) return exportDrawio(record.name,xml,options);
  const source=record.sourcePath;
  const current=fs.readFileSync(source);
  const actual=createHash('sha256').update(current).digest('hex');
  if (actual !== record.sourceHash)
    throw new Error(`Source .drawio changed outside this session; refusing to overwrite: ${source}`);
  const document=asDrawioDocument(xml);
  if (current.toString('utf8') !== document) writeAtomic(source,document);
  record.sourceHash=createHash('sha256').update(document).digest('hex');
  return source;
}

export function exportDrawio(name,xml,options={}) {
  return writeAtomic(exportPath(name,'drawio',options),asDrawioDocument(xml));
}

export function exportPng(name,dataUrl,options={}) {
  const bytes=decodePngDataUrl(dataUrl);
  return writeAtomic(exportPath(name,'png',options),bytes);
}

export function exportPngFromFile(name,sourceFile,options={}) {
  const bytes=fs.readFileSync(sourceFile);
  validatePngBytes(bytes);
  return writeAtomic(exportPath(name,'png',options),bytes);
}
