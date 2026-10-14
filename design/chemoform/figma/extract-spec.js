const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + require('path').resolve(process.argv[2] || 'figma/screens.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  const data = await p.evaluate(() => {
    const R1 = v => Math.round(v * 10) / 10;
    const toHex = n => n.toString(16).padStart(2, '0');
    const col = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return ['#000000', 0]; const v = m[1].split(',').map(x => parseFloat(x)); return ['#' + v.slice(0, 3).map(x => toHex(Math.round(x))).join(''), v.length > 3 ? R1(v[3]) : 1]; };
    const SKIP = new Set(['hdr', 'back', 'foot']);
    function shadows(cs) {
      if (!cs.boxShadow || cs.boxShadow === 'none') return [];
      const re = /(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?(\s+inset)?/g; const out = []; let m;
      while ((m = re.exec(cs.boxShadow))) out.push({ c: col(m[1]), ox: +m[2], oy: +m[3], blur: +m[4], sp: +(m[5] || 0), inset: !!m[6] });
      return out;
    }
    const radii = cs => { const r = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(k => parseFloat(cs[k]) || 0); return r.every(v => v === r[0]) ? r[0] : r; };
    function walk(el, O, items) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (el.tagName.toLowerCase() === 'svg') {
        const r = el.getBoundingClientRect();
        if (el.classList.contains('pic')) { const a = el.getAttribute('data-pic').split('|'); items.push(['p', R1(r.left - O[0]), R1(r.top - O[1]), a[0], +a[1], +a[2], a[3], a[4], +a[5], +a[6]]); return; }
        const c = el.cloneNode(true); const src = [el, ...el.querySelectorAll('*')], dst = [c, ...c.querySelectorAll('*')];
        src.forEach((s, i) => { const k = getComputedStyle(s); if (i) { dst[i].setAttribute('stroke', k.stroke === 'none' ? 'none' : k.stroke); dst[i].setAttribute('fill', k.fill); dst[i].setAttribute('stroke-width', k.strokeWidth); dst[i].setAttribute('stroke-linecap', k.strokeLinecap); dst[i].setAttribute('stroke-linejoin', k.strokeLinejoin); } });
        c.setAttribute('width', R1(r.width)); c.setAttribute('height', R1(r.height)); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.removeAttribute('class'); c.removeAttribute('aria-hidden');
        items.push(['s', R1(r.left - O[0]), R1(r.top - O[1]), R1(r.width), R1(r.height), c.outerHTML.replace(/\s+/g, ' ')]); return;
      }
      const r = el.getBoundingClientRect();
      const x = R1(r.left - O[0]), y = R1(r.top - O[1]), w = R1(r.width), h = R1(r.height), rad = radii(cs);
      const sh = shadows(cs);
      sh.filter(s => !s.inset && !s.blur).forEach(s => items.push(['r', R1(x + s.ox - s.sp), R1(y + s.oy - s.sp), R1(w + 2 * s.sp), R1(h + 2 * s.sp), s.c[0], s.c[1], rad, null]));
      const bg = col(cs.backgroundColor);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map(k => cs['border' + k + 'Style'] !== 'none' ? parseFloat(cs['border' + k + 'Width']) || 0 : 0);
      let st = null;
      if (sides.some(v => v > 0)) { const k = ['Top', 'Right', 'Bottom', 'Left'][sides.findIndex(v => v > 0)]; const bc = col(cs['border' + k + 'Color']); if (bc[1] > 0) st = [sides, bc[0], bc[1], cs['border' + k + 'Style'] === 'dashed' ? 1 : 0]; }
      if (bg[1] > 0 || st) items.push(['r', x, y, w, h, bg[1] > 0 ? bg[0] : null, bg[1], rad, st]);
      sh.filter(s => s.inset && !s.blur).forEach(s => {
        if (s.sp > 0 && !s.ox && !s.oy) items.push(['r', x, y, w, h, null, 0, rad, [[s.sp, s.sp, s.sp, s.sp], s.c[0], s.c[1], 0]]);
        else if (s.oy > 0) items.push(['r', x, y, w, s.oy, s.c[0], s.c[1], 0, null]);
        else if (s.oy < 0) items.push(['r', x, R1(y + h + s.oy), w, -s.oy, s.c[0], s.c[1], 0, null]);
      });
      for (const pe of ['::before', '::after']) {
        const ps = getComputedStyle(el, pe);
        if (!ps.content || ps.content === 'none' || ps.content === 'normal') continue;
        const pbg = col(ps.backgroundColor); if (!pbg[1]) continue;
        const px = v => v === 'auto' ? null : parseFloat(v);
        const L = px(ps.left), Rt = px(ps.right), T = px(ps.top), B = px(ps.bottom);
        let W = px(ps.width), H = px(ps.height);
        const bx = r.left - O[0], by = r.top - O[1];
        const X = L != null ? bx + L : bx + r.width - Rt - W; if (L != null && Rt != null) W = r.width - L - Rt;
        const Y = T != null ? by + T : by + r.height - B - H; if (T != null && B != null) H = r.height - T - B;
        items.push(['r', R1(X), R1(Y), R1(W), R1(H), pbg[0], pbg[1], 0, null]);
      }
      for (const n of el.childNodes) {
        if (n.nodeType === 1) { if (O.root === el && SKIP.has(n.classList[0])) continue; walk(n, O, items); }
        else if (n.nodeType === 3) {
          const raw = n.textContent; const i0 = raw.search(/\S/); if (i0 < 0) continue;
          const i1 = raw.length - raw.split('').reverse().join('').search(/\S/);
          const rg = document.createRange(); rg.setStart(n, i0); rg.setEnd(n, i1);
          const rs = [...rg.getClientRects()].filter(q => q.width > 0 && q.height > 0); if (!rs.length) continue;
          const u = rg.getBoundingClientRect();
          const tops = new Set(rs.map(q => Math.round(q.top / 4)));
          const vert = cs.writingMode.startsWith('vertical');
          let txt = raw.slice(i0, i1).replace(/\s+/g, ' ');
          if (cs.textTransform === 'uppercase') txt = txt.toUpperCase();
          const mono = /Disket/.test(cs.fontFamily) ? 0 : 1;
          const ls = cs.letterSpacing === 'normal' ? 0 : R1(parseFloat(cs.letterSpacing));
          const lh = cs.lineHeight === 'normal' ? 0 : R1(parseFloat(cs.lineHeight));
          const fc = col(cs.color), sw = parseFloat(cs.webkitTextStrokeWidth) || 0, sc = col(cs.webkitTextStrokeColor);
          const multi = !vert && tops.size > 1;
          let tx = u.left - O[0], tw = u.width;
          if (multi) { const pr = el.getBoundingClientRect(); tx = pr.left - O[0] + parseFloat(cs.paddingLeft); tw = pr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); }
          items.push(['t', R1(tx), R1(u.top - O[1]), R1(tw), R1(u.height), txt, mono, +cs.fontWeight, R1(parseFloat(cs.fontSize)), ls, lh, fc[0], fc[1], cs.textAlign === 'center' ? 'CENTER' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'RIGHT' : 'LEFT', multi ? 1 : 0, sw, sw ? sc[0] : 0, vert ? 1 : 0]);
        }
      }
    }
    const comp = (els, scr, name) => {
      const R0 = scr.getBoundingClientRect();
      const rs = els.map(e => e.getBoundingClientRect());
      const gx = Math.min(...rs.map(r => r.left)) - R0.left, gy = Math.min(...rs.map(r => r.top)) - R0.top;
      const gw = Math.max(...rs.map(r => r.right)) - R0.left - gx, gh = Math.max(...rs.map(r => r.bottom)) - R0.top - gy;
      const items = []; const O = [R0.left + gx, R0.top + gy]; els.forEach(e => walk(e, O, items));
      return { name, x: R1(gx), y: R1(gy), w: R1(gw), h: R1(gh), items };
    };
    const scrs = [...document.querySelectorAll('.scr')];
    const s0 = scrs[0];
    const header = comp([s0.querySelector('.hdr')], s0, 'CF/Header');
    const footer = comp([s0.querySelector('.back'), s0.querySelector('.foot')], s0, 'CF/Footer');
    const screens = scrs.map(scr => {
      const R0 = scr.getBoundingClientRect();
      const groups = [];
      for (const ch of scr.children) {
        if (SKIP.has(ch.classList[0])) continue;
        const r = ch.getBoundingClientRect();
        const O = [r.left, r.top]; O.root = null;
        const items = []; walk(ch, O, items);
        groups.push({ name: ch.classList[0] || ch.tagName.toLowerCase(), x: R1(r.left - R0.left), y: R1(r.top - R0.top), w: R1(r.width), h: R1(r.height), items });
      }
      return { name: scr.getAttribute('data-name'), bg: col(getComputedStyle(scr).backgroundColor)[0], groups };
    });
    return { header, footer, screens };
  });
  fs.writeFileSync(process.argv[3] || 'figma/spec.json', JSON.stringify(data));
  const sz = s => JSON.stringify(s).length;
  console.log('header', sz(data.header), 'footer', sz(data.footer));
  data.screens.forEach(s => console.log(s.name, sz(s), s.groups.map(g => g.name + ':' + g.items.length).join(' ')));
  await b.close();
})();
