import { inflateRawSync } from 'node:zlib';

// Extract stable mxCell properties, not a textual XML diff. No additional npm dependency.
function attributes(tag) {
  const result = {};
  const pattern = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const m of tag.matchAll(pattern)) result[m[1]] = entities(m[2] ?? m[3]);
  return result;
}
function entities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (full, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : full;
    }
    return { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'" }[code.toLowerCase()] ?? full;
  });
}
function tokens(xml) {
  const out = [];
  let start = 0;
  while ((start = xml.indexOf('<', start)) >= 0) {
    if (xml.startsWith('<!--', start)) {const end=xml.indexOf('-->',start+4);start=end<0?xml.length:end+3;continue;}
    let end = start + 1, quote = '';
    for (; end < xml.length; end++) {
      const c = xml[end];
      if (quote) { if (c === quote) quote = ''; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    if (end >= xml.length) break;
    const raw = xml.slice(start + 1, end).trim();
    start = end + 1;
    if (!raw || /^[!?]/.test(raw)) continue;
    const close = raw[0] === '/', selfClosing = /\/\s*$/.test(raw);
    const parsed = raw.match(/^\/?([\w:.-]+)/);
    if (parsed) out.push({ name:parsed[1], close, selfClosing, attrs: close ? {} : attributes(raw.slice(parsed[0].length)) });
  }
  return out;
}
function pages(xml) {
  if (/^\s*<mxGraphModel\b/.test(xml)) return [{name:'', xml}];
  if (!/^\s*<mxfile\b/.test(xml)) throw new Error('Expected draw.io mxfile or mxGraphModel');
  const result = [];
  for (const m of xml.matchAll(/<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g)) {
    let body = m[2].trim();
    if (!body.startsWith('<')) {
      try { body = decodeURIComponent(inflateRawSync(Buffer.from(body, 'base64')).toString('utf8')); }
      catch (e) { throw new Error('Cannot decode compressed draw.io page: ' + e.message); }
    }
    const a = attributes(m[1]);
    result.push({ name:a.id || a.name || String(result.length), xml:body });
  }
  if (!result.length) throw new Error('No diagram page found in mxfile');
  if (result.length===1) result[0].name=''; // same node IDs when Editor wraps mxGraphModel in a single-page mxfile
  return result;
}
function cells(xml) {
  const result = new Map();
  for (const page of pages(xml)) {
    const stack = [];
    for (const t of tokens(page.xml)) {
      if (t.close) { stack.pop(); continue; }
      const parent = [...stack].reverse().find(x => x.name === 'object' || x.name === 'UserObject');
      if (t.name === 'mxCell') {
        const a = t.attrs, id = a.id || parent?.attrs.id;
        if (id && id !== '0' && id !== '1') {
          const entry = {
            id, page:page.name, kind:a.edge === '1' ? 'edge' : 'node',
            label: a.value ?? parent?.attrs.label ?? parent?.attrs.value ?? '',
            style:a.style ?? '', parent:a.parent ?? '', source:a.source ?? '', target:a.target ?? '',
            geometry:{}, extra:{}
          };
          result.set(`${page.name}:${id}`, entry);
          t.cell = entry;
        }
      } else if (t.name === 'mxGeometry') {
        const target = [...stack].reverse().find(x => x.cell)?.cell;
        if (target) {
          const {x='',y='',width='',height='',...other} = t.attrs;
          target.geometry = {x,y,width,height};
          target.extra.geometry = other;
        }
      } else if (t.name === 'mxPoint' || t.name === 'mxRectangle') {
        const target = [...stack].reverse().find(x => x.cell)?.cell;
        if (target) (target.extra[t.name] ||= []).push(t.attrs);
      }
      if (!t.selfClosing) stack.push(t);
    }
  }
  return result;
}
const fields = ['label', 'style', 'parent', 'source', 'target'];
const scalar = value => String(value ?? '').slice(0, 240);
function describe(cell) { return {id:cell.id, page:cell.page, kind:cell.kind, label:scalar(cell.label)}; }
function changed(old, current) {
  const fieldsChanged = {};
  for (const k of fields) if (old[k] !== current[k]) fieldsChanged[k] = {from:scalar(old[k]), to:scalar(current[k])};
  for (const k of ['geometry','extra']) {
    if (JSON.stringify(old[k]) !== JSON.stringify(current[k])) fieldsChanged[k] = {from:old[k],to:current[k]};
  }
  return fieldsChanged;
}
export function diffDiagramXml(before, after) {
  const left = cells(before), right = cells(after);
  const added = [], removed = [], modified = [];
  for (const [key, old] of left) {
    const now = right.get(key);
    if (!now) removed.push(describe(old));
    else {const changes = changed(old,now); if (Object.keys(changes).length) modified.push({...describe(now),changes});}
  }
  for (const [key, now] of right) if (!left.has(key)) added.push(describe(now));
  return {added,removed,modified};
}
