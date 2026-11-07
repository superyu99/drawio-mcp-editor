#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

VERSION = '0.1.10'
ROOT = Path(__file__).resolve().parent.parent
EDITOR = ROOT / 'mcp-app-server/vendor/drawio-webapp'
OUTPUT = ROOT.parent / f'drawio-mcp-editor-snapshot-{VERSION}.zip'

assert (EDITOR / 'index.html').is_file(), 'Bundled Editor missing; run scripts/bundle-editor.sh first'
assert (EDITOR / 'js/app.min.js').is_file(), 'Bundled Editor is incomplete'
with ZipFile(OUTPUT, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(ROOT.rglob('*')):
        if not file.is_file() or '.git' in file.parts or 'node_modules' in file.parts or '__pycache__' in file.parts: continue
        archive.write(file, f'{ROOT.name}/{file.relative_to(ROOT)}')
print(OUTPUT)
