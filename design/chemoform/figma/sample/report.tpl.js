// One report screen of the sample tab: header/footer instances + measured groups.
const S = __SPEC__;
const page = await figma.getNodeByIdAsync("__PAGE__");
await figma.setCurrentPageAsync(page);
const Hc = await figma.getNodeByIdAsync("__HDR__"), Fc = await figma.getNodeByIdAsync("__FTR__");
// idempotent: drop an earlier copy of this frame on this page only
for (const n of page.children.filter(n => n.type === "FRAME" && n.name === S.name)) n.remove();
const fr = figma.createFrame();
fr.name = S.name; page.appendChild(fr);
fr.resize(1920, 1080); fr.x = S.x; fr.y = 0;
fr.fills = [paint(S.bg)]; fr.clipsContent = true;

// a dashed 1 px border side (the sample bar splits) as a small svg line
function dashed(P, x, y, w, h, c) {
  const v = w <= h;
  const svg = v ? `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="${h}" viewBox="0 0 1 ${h}" fill="none"><path d="M0.5 0V${h}" stroke="${c}" stroke-dasharray="4 4"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="1" viewBox="0 0 ${w} 1" fill="none"><path d="M0 0.5H${w}" stroke="${c}" stroke-dasharray="4 4"/></svg>`;
  const n = figma.createNodeFromSvg(svg); n.name = "пунктир"; n.fills = []; P.appendChild(n); n.x = x; n.y = y; return n;
}
function put2(P, it) {
  if (it.k === "s") { const n = figma.createNodeFromSvg(it.svg); n.name = it.icon; n.fills = []; P.appendChild(n); n.x = it.x; n.y = it.y; return n; }
  if (it.k === "r") {
    if (it.fill) { const n = mkRect(P, it.name, it.x, it.y, it.w, it.h, it.fill, it.fo); if (it.rad) n.cornerRadius = it.rad; }
    if (it.st) {
      const [T, R, B, L] = it.st.sides, c = it.st.c, a = it.st.a;
      const ln = (x, y, w, h) => it.st.dash ? dashed(P, x, y, w, h, c) : mkRect(P, it.fill ? "край" : it.name === "фон" ? "линия" : it.name, x, y, w, h, c, a);
      if (T) ln(it.x, it.y, it.w, T);
      if (B) ln(it.x, it.y + it.h - B, it.w, B);
      if (L) ln(it.x, it.y, L, it.h);
      if (R) ln(it.x + it.w - R, it.y, R, it.h);
    }
    return;
  }
  return put(P, it);
}

const hi = Hc.createInstance(); fr.appendChild(hi); hi.name = "Шапка"; hi.x = 100; hi.y = 22;
const gids = [];
for (const g of S.groups) { const f = plainFrame(fr, g.name, g.x, g.y, g.w, g.h); g.items.forEach(it => put2(f, it)); gids.push(f.id); }
// pseudo-elements were measured before their text; the strike line must sit above the letters
for (const n of fr.findAll(n => n.name === "зачёркивание")) n.parent.appendChild(n);
const fi = Fc.createInstance(); fr.appendChild(fi); fi.name = "Низ"; fi.x = 0; fi.y = 1000;

await fr.screenshot({ scale: 0.5 });
return { frameId: fr.id, headerInst: hi.id, footerInst: fi.id, groups: gids, texts: fr.findAllWithCriteria({ types: ["TEXT"] }).length };
