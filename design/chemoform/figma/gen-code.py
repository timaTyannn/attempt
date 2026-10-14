#!/usr/bin/env python3
"""Turns figma/spec.json into use_figma scripts (one file per batch, each < 45 000 chars).

Usage: python3 figma/gen-code.py PAGE_ID HEADER_ID FOOTER_ID [batch_size]
First create the page and the CF/Header + CF/Footer components (see README), then pass their ids.
Drawings are rebuilt inside Figma by the same engine as src/tools.html (pic()).
"""
import json, pathlib, sys

root = pathlib.Path(__file__).resolve().parent
spec = json.loads((root / 'spec.json').read_text(encoding='utf-8'))
page_id, hdr_id, ftr_id = sys.argv[1:4]
size = int(sys.argv[4]) if len(sys.argv) > 4 else 4

def rnd(v):
    if isinstance(v, float):
        r = round(v)
        return int(r) if abs(v - r) < 0.26 else round(v * 2) / 2
    if isinstance(v, list): return [rnd(x) for x in v]
    if isinstance(v, dict): return {k: rnd(x) for k, x in v.items()}
    return v

spec = rnd(spec)
src = (root.parent / 'src' / 'tools.html').read_text(encoding='utf-8')
a = src.index('  const ISO_C = Math.cos'); b = src.index('  // ---------- favourites + drawings ----------')
engine = '\n'.join(l.strip() for l in src[a:b].splitlines() if l.strip() and not l.strip().startswith('//'))
builder = (root / 'builder.js').read_text(encoding='utf-8')
H, F = spec['header'], spec['footer']
head = f"const HDR_XY = [{H['x']}, {H['y']}]; const FTR_XY = [{F['x']}, {F['y']}];\n"
dumps = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
screens = spec['screens']
for n, i in enumerate(range(0, len(screens), size), 1):
    chunk = screens[i:i + size]
    code = head + engine + '\n' + builder + f'''const SCR = {dumps(chunk)};
const page = await figma.getNodeByIdAsync("{page_id}"); await figma.setCurrentPageAsync(page);
const Hc = await figma.getNodeByIdAsync("{hdr_id}"), Fc = await figma.getNodeByIdAsync("{ftr_id}");
const sec = mkSection("Импорт {n}", 0, {n * 1600}, SCR.length);
const ids = SCR.map((s, k) => screen(sec, s, 80 + k * 2040, 120, Hc, Fc));
return {{ sectionId: sec.id, screens: ids }};
'''
    out = root / f'batch-{n}.js'
    out.write_text(code, encoding='utf-8')
    print(out.name, len(code), 'chars', '(over limit, lower batch_size)' if len(code) > 45000 else '')
