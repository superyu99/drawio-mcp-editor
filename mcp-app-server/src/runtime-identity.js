import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function createRuntimeIdentity({entry, buildId, mode}) {
  const version = JSON.parse(fs.readFileSync(path.resolve(path.dirname(entry), '..', 'package.json'), 'utf8')).version;
  return Object.freeze({version, instance: randomUUID(), pid: process.pid, ppid: process.ppid, mode, entry, buildId});
}

export function runtimeLog(identity, event, details = {}, output = console.error) {
  output('[drawio-mcp] ' + JSON.stringify({event, ...identity, ...details, at: new Date().toISOString()}));
}
