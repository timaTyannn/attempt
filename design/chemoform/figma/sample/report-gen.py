#!/usr/bin/env python3
"""Turn a report spec (report-extract.js) into a use_figma script.
  python3 report-gen.py SPEC.json "FRAME NAME" X PAGE_ID HDR_ID FTR_ID OUT.js
"""
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent
spec_p, name, x, page, hid, fid, out = sys.argv[1:8]
spec = json.loads(pathlib.Path(spec_p).read_text(encoding='utf-8'))
lib = (root / 'lib.js').read_text(encoding='utf-8')
dumps = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
rgb2hex = lambda s: re.sub(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', lambda m: '#%02x%02x%02x' % tuple(int(m.group(i)) for i in (1, 2, 3)), s)
RN = {'sub': 'линия', 'st2 on ::after': 'подчёркивание', 'sep': 'разделитель', 'crow': 'строка', 'rw': 'строка', 'rw q': 'строка',
      'pbar': 'проба', 'pseg': 'доля', 'pseg w': 'доля · лишняя', 'pseg rem': 'остаток', 'fbig strike::after': 'зачёркивание'}

def item(it):
    o = dict(it)
    if o['k'] == 't':
        o['m'] = o.pop('mono') == 0
        o.pop('lines', None)
    elif o['k'] == 'r':
        cls = o.pop('cls', '').strip()
        o['name'] = RN.get(cls, 'фон')
    else:
        svg = rgb2hex(o['svg'])
        svg = re.sub(r'stroke-width="([\d.]+)px"', r'stroke-width="\1"', svg)
        o['svg'] = svg
        o['icon'] = 'крестик' if 'M6 6' in svg else 'галочка'
    return o

S = {'name': name, 'x': float(x), 'bg': spec['bg'], 'groups': [dict(g, items=[item(i) for i in g['items']]) for g in spec['groups']]}
code = lib + (root / 'report.tpl.js').read_text(encoding='utf-8').replace('__SPEC__', dumps(S)).replace('__PAGE__', page).replace('__HDR__', hid).replace('__FTR__', fid)
pathlib.Path(out).write_text(code, encoding='utf-8')
print(out, len(code), 'chars', '(OVER LIMIT)' if len(code) > 45000 else '')
