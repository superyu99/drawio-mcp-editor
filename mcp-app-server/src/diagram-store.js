import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { diffDiagramXml } from './diagram-changes.js';

const NAME_PATTERN=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export function validDiagramName(name) {
  return typeof name==='string' && name.length<=64 && NAME_PATTERN.test(name);
}

// A user-owned .drawio is imported by value into this process's temporary work copy.
// Do not normalize/reformat it on import: mxfile may contain multiple compressed pages.
export function readDiagramFile(filePath, {maxBytes=5_000_000}={}) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath))
    throw new Error('load_diagram requires an absolute local .drawio file path');
  const sourcePath=path.resolve(filePath);
  if (path.extname(sourcePath).toLowerCase() !== '.drawio')
    throw new Error('load_diagram only accepts .drawio files');
  const info=fs.statSync(sourcePath);
  if (!info.isFile()) throw new Error('Diagram path is not a regular file');
  if (info.size===0 || info.size>maxBytes)
    throw new Error(`Diagram file must be nonempty and at most ${maxBytes} bytes`);
  const xml=fs.readFileSync(sourcePath,'utf8');
  // XML declarations are allowed. Preserve the original bytes for later export.
  const start=xml.replace(/^\uFEFF/, '').trimStart().replace(/^<\?xml\s+[^?]*\?>\s*/i,'');
  if (!(/^<mxGraphModel\b/.test(start) && /<\/mxGraphModel>\s*$/.test(start)) &&
      !(/^<mxfile\b/.test(start) && /<\/mxfile>\s*$/.test(start)))
    throw new Error('Not a valid draw.io document: expected mxfile or mxGraphModel root');
  if (start.startsWith('<mxfile') && !/<diagram\b/.test(start))
    throw new Error('draw.io mxfile does not contain a diagram page');
  return {sourcePath,xml};
}

export function diagramNameFromPath(sourcePath) {
  const basename=path.basename(sourcePath,path.extname(sourcePath));
  const slug=basename.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const result=slug.replace(/^[^a-z]+/, '').slice(0,64).replace(/-+$/,'');
  return validDiagramName(result) ? result : 'imported-diagram';
}

// Each diagram has ONE current XML file; human edit summaries are append-only events,
// not historical copies of the XML.
export class DiagramStore {
  constructor({baseDir=os.tmpdir()}={}) {
    this.directory=fs.mkdtempSync(path.join(baseDir,'drawio-mcp-'));
    this.diagrams=new Map();
  }

  create(name,xml=null) {
    if (!validDiagramName(name)) throw new Error('Diagram name must be lowercase English kebab-case (max 64 characters)');
    let chosen=name;
    for (let i=2;this.diagrams.has(chosen);i++) {
      const suffix=`-${i}`;
      chosen=name.slice(0,64-suffix.length).replace(/-+$/,'')+suffix;
    }
    this.diagrams.set(chosen,{name:chosen,path:null,hash:null});
    if (xml!==null) this.save(chosen,xml);
    return chosen;
  }

  importFromFile(filePath) {
    const {sourcePath,xml}=readDiagramFile(filePath);
    const name=this.create(diagramNameFromPath(sourcePath),xml);
    const record=this.resolve(name);
    record.sourcePath=sourcePath;
    record.sourceHash=createHash('sha256').update(xml).digest('hex');
    return {name,sourcePath};
  }

  save(name,xml,{source='system',expectedHash}={}) {
    if (!this.diagrams.has(name)) throw new Error(`Unknown diagram: ${name}`);
    const record=this.diagrams.get(name);
    if (expectedHash !== undefined && record.hash !== expectedHash) throw new Error(`Diagram ${name} changed since it was read; reload before saving`);
    const prior=record.path ? fs.readFileSync(record.path,'utf8') : null;
    if (prior===xml) return record.path;
    const file=path.join(this.directory,`${name}.drawio`);
    const pending=file+'.'+process.pid+'.tmp';
    try {
      fs.writeFileSync(pending,xml,{encoding:'utf8',flag:'w',mode:0o600});
      fs.renameSync(pending,file);
    } finally {if (fs.existsSync(pending)) fs.rmSync(pending);}
    record.path=file;
    record.hash=createHash('sha256').update(xml).digest('hex');
    if (source==='human' && prior!==null) {
      let changes, warning;
      try {changes=diffDiagramXml(prior,xml);}
      catch(e) {changes={added:[],removed:[],modified:[]};warning=`Structural diff unavailable: ${e.message}`;}
      const event={id:randomUUID(),at:new Date().toISOString(),name,changes};
      if (warning) event.warning=warning;
      fs.appendFileSync(path.join(this.directory,`${name}.changes.jsonl`),JSON.stringify(event)+'\n',{encoding:'utf8',mode:0o600});
    }
    return file;
  }

  resolve(name) {
    if (!name) {
      if (this.diagrams.size===0) throw new Error('No diagrams in this MCP process.');
      if (this.diagrams.size!==1) throw new Error(`Multiple diagrams; specify name: ${[...this.diagrams.keys()].join(', ')}`);
      name=this.diagrams.keys().next().value;
    }
    const record=this.diagrams.get(name);
    if (!record) throw new Error(`Unknown diagram: ${name}`);
    return record;
  }

  get(name) {
    const record=this.resolve(name);
    if (!record.path) throw new Error(`Diagram ${record.name} is still rendering; no XML saved yet.`);
    return fs.readFileSync(record.path,'utf8');
  }

  changes(name) {
    const record=this.resolve(name);
    const file=path.join(this.directory,`${record.name}.changes.jsonl`);
    return fs.existsSync(file) ? fs.readFileSync(file,'utf8').trim().split('\n').map(line=>JSON.parse(line)) : [];
  }

  list() {return [...this.diagrams.values()].map(({name,path})=>({name,path}));}
}
