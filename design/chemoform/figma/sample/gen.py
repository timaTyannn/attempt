#!/usr/bin/env python3
"""Turn card-spec.json into use_figma scripts.
  python3 gen.py comps                 -> out-comps.js  (page + header/footer components)
  python3 gen.py frame PAGE HDR FTR    -> out-frame.js  (the 1920x1080 frame)
  python3 gen.py frame PAGE HDR FTR SPEC NAME X OUT   -> any screen built on the card layout (the reports)
"""
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent
args = sys.argv[1:]
spec_path = pathlib.Path(args[4]) if args[0] == 'frame' and len(args) > 4 else root / 'card-spec.json'
spec = json.loads(spec_path.read_text(encoding='utf-8'))
lib = (root / 'lib.js').read_text(encoding='utf-8')
dumps = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))

def rgb2hex(s):
    return re.sub(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', lambda m: '#%02x%02x%02x' % tuple(int(m.group(i)) for i in (1, 2, 3)), s)

ICON = {0: 'пробирка', 1: 'ключ', 2: 'база', 3: 'журнал', 4: 'стрелка'}
RECT_NAMES = {'sub': 'линия', 'st2 on ::after': 'подчёркивание', 'sep': 'разделитель', 'kv': 'линия', 'lvl': 'Уровень', 'big strike::after': 'зачёркивание', 'big strike bad::after': 'зачёркивание'}

def item(it):
    o = dict(it)
    if o['k'] == 't':
        o['m'] = o.pop('mono') == 0
        o.pop('lines', None)
    else:
        o['name'] = RECT_NAMES.get(o.pop('cls', ''), 'фон')
    return o

mode = sys.argv[1]
if mode == 'comps':
    H = spec['header']
    hdr = {'w': H['rect'][2], 'h': H['rect'][3], 'tabs': [
        {'label': t['label'], 'on': t['on'], 'color': t['color'], 'icon': ICON[i],
         'svg': rgb2hex(t['icon']['svg']).replace('7px', '7'), 'dot': bool(t['dot']), 'pts': t['pts']['text'] if t['pts'] else None}
        for i, t in enumerate(H['tabs'])]}
    ftr = {'items': [{'kcText': i['kcText'], 'label': i['label'], 'on': i['on'], 'kcBg': i['kcBg'],
                      'shadow': rgb2hex(re.match(r'(rgb\([^)]+\))', i['kcShadow']).group(1)), 'color': i['color']} for i in spec['footer']['items']]}
    code = lib + (root / 'comps.tpl.js').read_text(encoding='utf-8').replace('__HDR__', dumps(hdr)).replace('__FTR__', dumps(ftr))
    out = root / 'out-comps.js'
else:
    page, hid, fid = sys.argv[2:5]
    fname = args[5] if len(args) > 5 else 'Образец · Карточка'
    fx = args[6] if len(args) > 6 else '0'
    TN = {'tick': 'деление', 'liq': 'жидкость', 'mk': 'отметка уровня', 'mk offm': 'отметка · списано', 'ld': 'выноска', 'dt': 'точка', 'hl': 'выбор · ИК', 'hl-bad': 'ошибка · ИК', 'surf': 'поверхность', 'offb': 'списано'}
    names, o_seen = [], 0
    for n in (x.strip() for x in spec['tube']['names']):
        if n == 'o':
            names.append('стенка' if o_seen == 0 else 'горлышко'); o_seen += 1
        else:
            names.append(TN.get(n, n))
    texts = [dict(t, name='остаток %' if t.get('cls') == 'pct' else 'шкала ' + t['text']) for t in spec['tube']['texts']]
    S = {'bg': spec['bg'],
         'groups': [dict(g, items=[item(i) for i in g['items']]) for g in spec['groups']],
         'tube': {'rect': spec['tube']['rect'], 'svg': spec['tube']['svg'], 'names': names, 'texts': texts},
         'rows': [dict(r, border=rgb2hex(r['border'])) for r in spec['rows']]}
    code = lib + (root / 'frame.tpl.js').read_text(encoding='utf-8').replace('__SPEC__', dumps(S)).replace('__PAGE__', page).replace('__HDR__', hid).replace('__FTR__', fid).replace('__NAME__', fname).replace('__X__', fx)
    out = pathlib.Path(args[7]) if len(args) > 7 else root / 'out-frame.js'
out.write_text(code, encoding='utf-8')
print(out.name, len(code), 'chars', '(OVER LIMIT)' if len(code) > 45000 else '')
