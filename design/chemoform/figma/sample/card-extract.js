// Extract the first .comp > .scr of the sample-card page into a JSON spec for a Figma rebuild.
// Adapted from design/chemoform/figma/extract-spec.js; header, footer, ledger rows and tube are measured separately.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [file, out, idx = '0'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.resolve(file));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await p.evaluate(i => {
    const d = document.querySelector('.doc'); d.style.maxWidth = 'none'; d.style.padding = '0';
    const c = document.querySelectorAll('.comp')[i]; c.style.width = '1920px'; c.style.height = '1080px'; c.style.aspectRatio = 'auto';
    c.firstElementChild.style.transform = 'none';
    window.requestAnimationFrame = () => 0; // freeze the surface animation
  }, +idx);
  await p.waitForTimeout(300);
  const data = await p.evaluate(i => {
    const R1 = v => Math.round(v * 10) / 10;
    const toHex = n => n.toString(16).padStart(2, '0');
    const col = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return ['#000000', 0]; const v = m[1].split(',').map(x => parseFloat(x)); return ['#' + v.slice(0, 3).map(x => toHex(Math.round(x))).join(''), v.length > 3 ? Math.round(v[3] * 100) / 100 : 1]; };
    const scr = document.querySelectorAll('.comp')[i].firstElementChild;
    const R0 = scr.getBoundingClientRect();
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
      if (sides.some(v => v > 0)) { const k = ['Top', 'Right', 'Bottom', 'Left'][sides.findIndex(v => v > 0)]; const bc = col(cs['border' + k + 'Color']); if (bc[1] > 0) st = { sides, c: bc[0], a: bc[1] }; }
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
    const grp = (name, el) => { if (!el) return null; const r = rel(el); const items = []; const br = el.getBoundingClientRect(); walk(el, [br.left, br.top], items); return { name, x: r[0], y: r[1], w: r[2], h: r[3], items }; };

    // ---------- header ----------
    const hdr = scr.querySelector('.hdr');
    const H0 = hdr.getBoundingClientRect();
    const hr = el => { const r = el.getBoundingClientRect(); return [R1(r.left - H0.left), R1(r.top - H0.top), R1(r.width), R1(r.height)]; };
    const header = { rect: rel(hdr), border: getComputedStyle(hdr).borderBottomColor, tabs: [...hdr.querySelectorAll('.ht')].map(ht => {
      const cs = getComputedStyle(ht), sp = ht.querySelector('span');
      const before = getComputedStyle(ht, '::before'), after = getComputedStyle(ht, '::after');
      return {
        on: ht.classList.contains('on'), rect: hr(ht), label: sp.textContent, labelRect: hr(sp), color: col(cs.color)[0],
        font: [cs.fontSize, cs.letterSpacing, cs.lineHeight, getComputedStyle(sp).fontWeight].join(' '),
        icon: { rect: hr(ht.querySelector('svg')), svg: svgInline(ht.querySelector('svg')) },
        dot: ht.querySelector('.dot') ? hr(ht.querySelector('.dot')) : null,
        pts: ht.querySelector('.pts') ? { rect: hr(ht.querySelector('.pts')), text: ht.querySelector('.pts').textContent, textRect: (() => { const rg = document.createRange(); rg.selectNodeContents(ht.querySelector('.pts')); const u = rg.getBoundingClientRect(); return [R1(u.left - H0.left), R1(u.top - H0.top), R1(u.width), R1(u.height)]; })() } : null,
        before: ht.classList.contains('on') ? [before.top, before.bottom, before.backgroundImage] : null,
        after: ht.classList.contains('on') ? [after.bottom, after.height, after.backgroundColor] : null
      };
    }) };

    // ---------- footer ----------
    const foot = scr.querySelector('.foot');
    const F0 = foot.getBoundingClientRect();
    const fr = el => { const r = el.getBoundingClientRect(); return [R1(r.left - F0.left), R1(r.top - F0.top), R1(r.width), R1(r.height)]; };
    const footer = { rect: rel(foot), items: [...foot.children].map(s => {
      const kc = s.querySelector('.kc'); const lab = [...s.childNodes].find(n => n.nodeType === 3);
      const rg = document.createRange(); rg.selectNodeContents(lab); const u = rg.getBoundingClientRect();
      const rg2 = document.createRange(); rg2.selectNodeContents(kc); const u2 = rg2.getBoundingClientRect();
      const kcs = getComputedStyle(kc);
      return { on: s.classList.contains('on'), rect: fr(s), kc: fr(kc), kcText: kc.textContent, kcTextRect: [R1(u2.left - F0.left), R1(u2.top - F0.top), R1(u2.width), R1(u2.height)], kcBg: col(kcs.backgroundColor)[0], kcShadow: kcs.boxShadow, kcColor: col(kcs.color)[0],
        label: lab.textContent.trim(), labelRect: [R1(u.left - F0.left), R1(u.top - F0.top), R1(u.width), R1(u.height)], color: col(getComputedStyle(s).color)[0] };
    }) };

    // ---------- ledger rows ----------
    const rows = [...scr.querySelectorAll('.lrow')].map(r => {
      const R = r.getBoundingClientRect();
      const sub = el => { const q = el.getBoundingClientRect(); return [R1(q.left - R.left), R1(q.top - R.top), R1(q.width), R1(q.height)]; };
      const tr = el => { const rg = document.createRange(); rg.selectNodeContents(el); const u = rg.getBoundingClientRect(); return [R1(u.left - R.left), R1(u.top - R.top), R1(u.width), R1(u.height)]; };
      const part = el => ({ text: el.textContent, rect: sub(el), textRect: tr(el), color: col(getComputedStyle(el).color)[0] });
      const bs = getComputedStyle(r, '::before');
      return { rect: rel(r), sel: r.classList.contains('sel'), off: r.classList.contains('off'), bad: r.classList.contains('bad'), weak: r.classList.contains('w'), bar: +bs.opacity > 0 ? col(bs.backgroundColor) : null, bg: col(getComputedStyle(r).backgroundColor), border: getComputedStyle(r).borderTopColor,
        c: part(r.querySelector('.c')), nm: part(r.querySelector('.nm2')), r: part(r.querySelector('.r')) };
    });

    // ---------- tube: static, Figma-friendly copy of the live svg ----------
    const tube = scr.querySelector('svg.tube');
    const parts = [];
    const f = v => +(+v).toFixed(2);
    const strokeOf = (s, k) => k.stroke && k.stroke !== 'none' ? ` stroke="${col(k.stroke)[0]}" stroke-width="${parseFloat(k.strokeWidth)}"` + (k.strokeDasharray && k.strokeDasharray !== 'none' ? ` stroke-dasharray="${k.strokeDasharray.replace(/px/g, '').replace(/,/g, ' ')}"` : '') : '';
    const fillOf = k => { if (!k.fill || k.fill === 'none') return ' fill="none"'; const [h, a] = col(k.fill); return a > 0 ? ` fill="${h}"` + (a < 1 ? ` fill-opacity="${a}"` : '') : ' fill="none"'; };
    // the liquid level is kept on the svg by the page (data-level, percent)
    const level = +(tube.dataset.level || 45), ly = 720 - 6 * level;
    const names = [];
    for (const s of tube.querySelectorAll('path, rect, circle')) {
      if (s.closest('clipPath')) continue;
      const k = getComputedStyle(s), cl = s.getAttribute('class') || '';
      if (+k.opacity === 0) continue;
      if (cl === 'pv' || cl === 'pvline') continue;
      let d = s.getAttribute('d');
      if ((cl === 'liq' || cl === 'surf') && level < .5) continue; // an empty tube has neither
      if (cl === 'liq') d = `M70 ${ly}V640A80 80 0 0 0 230 640V${ly}Z`;
      if (cl === 'surf') d = `M70 ${ly + .5}H230`;
      // a written-off share is a rect clipped by the tube; give it the tube's own outline instead
      if (cl === 'offb') { const y = +s.getAttribute('y'); parts.push(`<path d="M70 ${y}V640A80 80 0 0 0 230 640V${y}Z"${fillOf(k)}/>`); names.push('offb'); continue; }
      const isLine = s.tagName === 'path' && d && !/[ZzAaCcQq]/.test(d);
      const fill = isLine ? ' fill="none"' : fillOf(k);
      if (s.tagName === 'path') parts.push(`<path d="${d}"${fill}${strokeOf(s, k)}/>`);
      else if (s.tagName === 'rect') parts.push(`<rect x="${s.getAttribute('x')}" y="${s.getAttribute('y')}" width="${s.getAttribute('width')}" height="${s.getAttribute('height')}"${fill}${strokeOf(s, k)}/>`);
      else parts.push(`<circle cx="${s.getAttribute('cx')}" cy="${s.getAttribute('cy')}" r="${s.getAttribute('r')}"${fill}${strokeOf(s, k)}/>`);
      const lay = s.closest('.lay');
      names.push(cl === 'hl' && lay && lay.classList.contains('bad') ? 'hl-bad' : cl || (s.tagName === 'path' ? 'tick' : s.tagName));
    }
    const tsvg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="780" viewBox="0 0 390 780" fill="none">${parts.join('')}</svg>`;
    const texts = [...tube.querySelectorAll('text')].filter(t => t.textContent).map(t => {
      const k = getComputedStyle(t); const bb = t.getBoundingClientRect();
      return { text: t.textContent, cls: t.getAttribute('class'), x: +t.getAttribute('x'), y: +t.getAttribute('y'), anchor: t.getAttribute('text-anchor') || 'start', size: parseFloat(k.fontSize), weight: +k.fontWeight, fill: col(k.fill)[0], bbox: [R1(bb.left - R0.left), R1(bb.top - R0.top), R1(bb.width), R1(bb.height)] };
    });

    const groups = [
      grp('Подвкладки', scr.querySelector('.sub')),
      grp('Образец', scr.querySelector('.ab')),
      grp('Расход/шапка', scr.querySelector('.lhd')),
      grp('Уровень', scr.querySelector('.lvl')),
      grp('Остаток', scr.querySelector('.rest'))
    ].filter(Boolean);
    return { bg: col(getComputedStyle(scr).backgroundColor)[0], header, footer, rows, tube: { rect: rel(tube), svg: tsvg, names, texts }, groups };
  }, +idx);
  fs.writeFileSync(out, JSON.stringify(data, null, 1));
  console.log('wrote', out, JSON.stringify(data).length);
  await b.close();
})();
