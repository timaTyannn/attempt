// Plugin API helpers for use_figma: rebuild extracted screen specs as editable Figma layers.
// Mono (Disket) text is set in Martian Mono — Disket is not available to the Figma MCP runtime;
// swap it back in the desktop app (select all Martian Mono text, change family to Disket Mono).
const FAM = ["Martian Mono", "Jost"];
const W2S = (m, w) => m === 0 ? (w >= 600 ? "Bold" : "Regular") : (w >= 700 ? "Bold" : w >= 500 ? "Medium" : "Regular");
await Promise.all([["Martian Mono","Regular"],["Martian Mono","Bold"],["Jost","Regular"],["Jost","Medium"],["Jost","Bold"]].map(([family, style]) => figma.loadFontAsync({ family, style })));
const hx = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const paint = (h, o) => ({ type: "SOLID", color: hx(h), opacity: o });
function put(P, it) {
  const k = it[0];
  if (k === "r") {
    const [, x, y, w, h, fill, fo, rad, st] = it;
    const n = figma.createRectangle(); n.name = "box";
    n.resize(Math.max(w, 0.01), Math.max(h, 0.01)); P.appendChild(n); n.x = x; n.y = y;
    n.fills = fill ? [paint(fill, fo)] : [];
    if (Array.isArray(rad)) { n.topLeftRadius = rad[0]; n.topRightRadius = rad[1]; n.bottomRightRadius = rad[2]; n.bottomLeftRadius = rad[3]; } else if (rad) n.cornerRadius = Math.min(rad, w / 2, h / 2);
    if (st) { n.strokes = [paint(st[1], st[2])]; n.strokeAlign = "INSIDE"; n.strokeTopWeight = st[0][0]; n.strokeRightWeight = st[0][1]; n.strokeBottomWeight = st[0][2]; n.strokeLeftWeight = st[0][3]; if (st[3]) n.dashPattern = [6, 4]; }
    return;
  }
  if (k === "t") {
    const [, x, y, w, h, s, m, wt, size, ls, lh, c, a, align, multi, sw, sc, vert] = it;
    const t = figma.createText(); t.fontName = { family: FAM[m], style: W2S(m, wt) };
    t.characters = m === 0 ? s.toUpperCase() : s; t.fontSize = size; t.name = s.slice(0, 40);
    if (ls) t.letterSpacing = { unit: "PIXELS", value: ls };
    const L = lh || (vert ? w : h); t.lineHeight = { unit: "PIXELS", value: L };
    t.fills = a > 0 ? [paint(c, a)] : [];
    if (sw) { t.strokes = [paint(sc, 1)]; t.strokeWeight = sw; t.strokeAlign = "CENTER"; }
    P.appendChild(t);
    if (multi) { t.textAutoResize = "HEIGHT"; t.resize(w + 6, t.height); t.textAlignHorizontal = align; t.x = x; t.y = y - Math.max(0, (L - size * 1.35) / 2); }
    else if (vert) { t.textAutoResize = "WIDTH_AND_HEIGHT"; t.rotation = 90; t.x = x + (w - L) / 2; t.y = y + h; }
    else { t.textAutoResize = "WIDTH_AND_HEIGHT"; t.y = y - (L - h) / 2; t.x = align === "CENTER" ? x + w / 2 - t.width / 2 : align === "RIGHT" ? x + w - t.width : x; }
    return;
  }
  if (k === "s") { const n = figma.createNodeFromSvg(it[5]); n.name = "icon"; P.appendChild(n); n.x = it[1]; n.y = it[2]; return; }
  if (k === "p") { PIC_FLAT = !!it[9]; const n = figma.createNodeFromSvg(pic(it[3], it[4], it[5], it[6], it[7], it[8]).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')); n.name = "чертёж/" + it[3] + (it[9] ? " 2D" : " ISO"); P.appendChild(n); n.x = it[1]; n.y = it[2]; }
}
function group(P, g) { const f = figma.createFrame(); f.name = g.name; f.fills = []; f.clipsContent = false; f.resize(Math.max(g.w, 1), Math.max(g.h, 1)); P.appendChild(f); f.x = g.x; f.y = g.y; g.items.forEach(it => put(f, it)); return f; }
function screen(sec, s, x, y, H, F) {
  const f = figma.createFrame(); f.name = s.name; f.resize(1920, 1080); f.fills = [paint(s.bg, 1)]; f.clipsContent = true;
  sec.appendChild(f); f.x = x; f.y = y;
  s.groups.forEach(g => group(f, g));
  const hi = H.createInstance(); f.appendChild(hi); hi.x = HDR_XY[0]; hi.y = HDR_XY[1];
  const fi = F.createInstance(); f.appendChild(fi); fi.x = FTR_XY[0]; fi.y = FTR_XY[1];
  return f.id;
}
function mkSection(name, x, y, n) { const sc = figma.createSection(); sc.name = name; figma.currentPage.appendChild(sc); sc.x = x; sc.y = y; sc.resizeWithoutConstraints(80 + n * 2040, 1320); sc.fills = [paint("#0a0a0a", 1)]; return sc; }
