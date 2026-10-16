// Extract one report screen (.comp index) of the sample page into a JSON spec for a Figma rebuild.
// Same DOM walker as card-extract.js; the header and footer come from the components made for the card.
//   node report-extract.js build/sample.html 1 report-ok.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [file, idx, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.resolve(file));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await p.evaluate(i => {
    const d = document.querySelector('.doc'); d.style.maxWidth = 'none'; d.style.padding = '0';
    const c = document.querySelectorAll('.comp')[i]; c.style.width = '1920px'; c.style.height = '1080px'; c.style.aspectRatio = 'auto';
    c.firstElementChild.style.transform = 'none';
    window.requestAnimationFrame = () => 0;
  }, +idx);
  await p.waitForTimeout(300);
  const data = await p.evaluate(i => {
    const scr = document.querySelectorAll('.comp')[i].firstElementChild;
    const R0 = scr.getBoundingClientRect();
    const R1 = v => Math.round(v * 10) / 10;
    const toHex = n => n.toString(16).padStart(2, '0');
    const col = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return ['#000000', 0]; const v = m[1].split(',').map(x => parseFloat(x)); return ['#' + v.slice(0, 3).map(x => toHex(Math.round(x))).join(''), v.length > 3 ? R1(v[3]) : 1]; };
    const rel = el => { const r = el.getBoundingClientRect(); return [R1(r.left - R0.left), R1(r.top - R0.top), R1(r.width), R1(r.height)]; };
    const radii = cs => { const r = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(k => parseFloat(cs[k]) || 0); return r.every(v => v === r[0]) ? r[0] : r; };
    function svgInline(el) {
      const r = el.getBoundingClientRect();
      const c = el.cloneNode(true); const src = [el, ...el.querySelectorAll('*')], dst = [c, ...c.querySelectorAll('*')];
      src.forEach((s, i) => { const k = getComputedStyle(s); if (i) { dst[i].setAttribute('stroke', k.stroke === 'none' ? 'none' : k.stroke); dst[i].setAttribute('fill', k.fill); dst[i].setAttribute('stroke-width', k.strokeWidth); dst[i].setAttribute('stroke-linecap', k.strokeLinecap); dst[i].setAttribute('stroke-linejoin', k.strokeLinejoin); } });
      c.setAttribute('width', R1(r.width)); c.setAttribute('height', R1(r.height)); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.removeAttribute('class'); c.removeAttribute('aria-hidden');
      return c.outerHTML.replace(/\s+/g, ' ');
    }
    // text node -> spec; returns [x, y, w, h, text, mono, weight, size, ls, lh, color, alpha, align, multi]
    function textOf(n, O, cs) {
      const raw = n.textContent; const i0 = raw.search(/\S/); if (i0 < 0) return null;
      const i1 = raw.length - raw.split('').reverse().join('').search(/\S/);
      const rg = document.createRange(); rg.setStart(n, i0); rg.setEnd(n, i1);
      const rs = [...rg.getClientRects()].filter(q => q.width > 0 && q.height > 0); if (!rs.length) return null;
      const u = rg.getBoundingClientRect();
      const tops = new Set(rs.map(q => Math.round(q.top / 4)));
      let txt = raw.slice(i0, i1).replace(/\s+/g, ' ');
      if (cs.textTransform === 'uppercase') txt = txt.toUpperCase();
      const mono = /Disket/.test(cs.fontFamily) ? 0 : 1;
      const ls = cs.letterSpacing === 'normal' ? 0 : R1(parseFloat(cs.letterSpacing));
      const lh = cs.lineHeight === 'normal' ? 0 : R1(parseFloat(cs.lineHeight));
      const fc = col(cs.color);
      const multi = tops.size > 1;
      let tx = u.left - O[0], tw = u.width;
      const el = n.parentElement;
      if (multi) { const pr = el.getBoundingClientRect(); tx = pr.left - O[0] + parseFloat(cs.paddingLeft); tw = pr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); }
      // per-line texts for multi-line wrap verification
      let lines = null;
      if (multi) {
        lines = []; let cur = '', top = null;
        for (let k = i0; k < i1; k++) {
          const r2 = document.createRange(); r2.setStart(n, k); r2.setEnd(n, k + 1);
          const q = r2.getClientRects()[0]; if (!q) { cur += raw[k]; continue; }
          const t = Math.round(q.top / 4);
          if (top !== null && t !== top) { lines.push(cur.trim()); cur = ''; }
          top = t; cur += raw[k];
        }
        lines.push(cur.trim());
      }
      return { k: 't', x: R1(tx), y: R1(u.top - O[1]), w: R1(tw), h: R1(u.height), s: txt, mono, wt: +cs.fontWeight, size: R1(parseFloat(cs.fontSize)), ls, lh, c: fc[0], a: fc[1], align: cs.textAlign === 'center' ? 'CENTER' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'RIGHT' : 'LEFT', multi: multi ? 1 : 0, lines };
    }
    function walk(el, O, items) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (el.tagName.toLowerCase() === 'svg') { const r = el.getBoundingClientRect(); items.push({ k: 's', x: R1(r.left - O[0]), y: R1(r.top - O[1]), w: R1(r.width), h: R1(r.height), svg: svgInline(el) }); return; }
      const r = el.getBoundingClientRect();
      const x = R1(r.left - O[0]), y = R1(r.top - O[1]), w = R1(r.width), h = R1(r.height), rad = radii(cs);
      const bg = col(cs.backgroundColor);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map(k => cs['border' + k + 'Style'] !== 'none' ? parseFloat(cs['border' + k + 'Width']) || 0 : 0);
      let st = null;
      if (sides.some(v => v > 0)) { const k = ['Top', 'Right', 'Bottom', 'Left'][sides.findIndex(v => v > 0)]; const bc = col(cs['border' + k + 'Color']); if (bc[1] > 0) st = { sides, c: bc[0], a: bc[1], dash: cs['border' + k + 'Style'] === 'dashed' ? 1 : 0 }; }
      if (bg[1] > 0 || st) items.push({ k: 'r', x, y, w, h, fill: bg[1] > 0 ? bg[0] : null, fo: bg[1], rad, st, cls: el.className || el.tagName });
      for (const pe of ['::before', '::after']) {
        const ps = getComputedStyle(el, pe);
        if (!ps.content || ps.content === 'none' || ps.content === 'normal') continue;
        const pbg = col(ps.backgroundColor); if (!pbg[1] || +ps.opacity === 0) continue;
        const px = v => v === 'auto' ? null : parseFloat(v);
        const L = px(ps.left), Rt = px(ps.right), T = px(ps.top), B = px(ps.bottom);
        let W = px(ps.width), H = px(ps.height);
        const bx = r.left - O[0], by = r.top - O[1];
        const X = L != null ? bx + L : bx + r.width - Rt - W; if (L != null && Rt != null) W = r.width - L - Rt;
        const Y = T != null ? by + T : by + r.height - B - H; if (T != null && B != null) H = r.height - T - B;
        items.push({ k: 'r', x: R1(X), y: R1(Y), w: R1(W), h: R1(H), fill: pbg[0], fo: pbg[1], rad: 0, st: null, cls: (el.className || '') + pe });
      }
      for (const n of el.childNodes) {
        if (n.nodeType === 1) walk(n, O, items);
        else if (n.nodeType === 3) { const t = textOf(n, O, cs); if (t) items.push(t); }
      }
    }
    const grp = (name, el) => { const r = rel(el); const items = []; const br = el.getBoundingClientRect(); walk(el, [br.left, br.top], items); return { name, x: r[0], y: r[1], w: r[2], h: r[3], items }; };

    const groups = [
      grp('Подвкладки', scr.querySelector('.sub')),
      grp('Вердикт', scr.querySelector('.rl')),
      grp('Разбор', scr.querySelector('.rr'))
    ];
    return { bg: col(getComputedStyle(scr).backgroundColor)[0], groups };
  }, +idx);
  fs.writeFileSync(out, JSON.stringify(data));
  console.log(out, JSON.stringify(data).length, 'chars;', data.groups.map(g => g.name + ':' + g.items.length).join(' '));
  await b.close();
})();
