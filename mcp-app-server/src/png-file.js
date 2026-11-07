import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function decodePngDataUrl(png) {
  const match=typeof png==='string' && /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(png);
  if (!match) throw new Error('Invalid PNG data URL');
  const bytes=Buffer.from(match[1],'base64');
  if (bytes.length<40 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a' || bytes.toString('ascii',12,16)!=='IHDR')
    throw new Error('Invalid PNG signature');
  validatePngBytes(bytes);
  return bytes;
}

export function validatePngBytes(bytes,{expectedWidth=null,expectedHeight=null}={}) {
  if (!Buffer.isBuffer(bytes) || bytes.length<40 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a' || bytes.toString('ascii',12,16)!=='IHDR') throw new Error('Invalid PNG signature');
  const width=bytes.readUInt32BE(16);
  const height=bytes.readUInt32BE(20);
  if (!width || !height || width>8192 || height>8192 || width*height>32000000)
    throw new Error(`Invalid or excessive PNG dimensions: ${width}x${height}`);
  if ((expectedWidth != null && width!==expectedWidth) ||
      (expectedHeight != null && height!==expectedHeight))
    throw new Error(`PNG dimensions mismatch: expected ${expectedWidth}x${expectedHeight}, received ${width}x${height}`);
  return {width,height};
}

export function savePngDataUrl(png,{tempDir=os.tmpdir(),expectedWidth=null,expectedHeight=null}={}) {
  const bytes=decodePngDataUrl(png);
  validatePngBytes(bytes,{expectedWidth,expectedHeight});
  const file=path.join(tempDir,`drawio-${randomUUID()}.png`);
  fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
  return file;
}
