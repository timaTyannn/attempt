// Shared helpers for the sample-card rebuild (use_figma). Mono (Disket Mono) is set in Martian Mono, uppercase.
await Promise.all([["Martian Mono", "Regular"], ["Martian Mono", "Bold"], ["Jost", "Regular"], ["Jost", "Medium"]].map(([family, style]) => figma.loadFontAsync({ family, style })));
const hx = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const paint = (h, o) => ({ type: "SOLID", color: hx(h), opacity: o == null ? 1 : o });
// Martian Mono caps sit 0.0285em lower than Disket Mono caps for the same line box; shift up to match.
const MONO_DY = -0.0285;
// content-area height / font size (browser range height) per font
const CONTENT = { mono: 1.127, body: 1.445 };
function mkText(o) {
  const t = figma.createText();
  t.fontName = { family: o.m ? "Martian Mono" : "Jost", style: o.m ? (o.wt >= 600 ? "Bold" : "Regular") : (o.wt >= 700 ? "Bold" : o.wt >= 500 ? "Medium" : "Regular") };
  t.characters = o.m ? o.s.toUpperCase() : o.s;
  t.fontSize = o.size;
  if (o.ls) t.letterSpacing = { unit: "PIXELS", value: o.ls };
  if (o.lh) t.lineHeight = { unit: "PIXELS", value: o.lh };
  t.fills = [paint(o.c, o.a)];
  t.name = o.name || o.s.slice(0, 40);
  return t;
}
function mkRect(P, name, x, y, w, h, fill, o) {
  const n = figma.createRectangle(); n.name = name; n.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  P.appendChild(n); n.x = x; n.y = y; n.fills = fill ? [paint(fill, o)] : []; return n;
}
// absolute item from the DOM walker: r = rect, t = text
function put(P, it) {
  if (it.k === "r") {
    if (!it.fill && it.st) { // a single-side border becomes a 1 px line
      const [T, R, B, L] = it.st.sides; const c = it.st.c;
      if (T) mkRect(P, it.name || "линия", it.x, it.y, it.w, T, c, it.st.a);
      if (B) mkRect(P, it.name || "линия", it.x, it.y + it.h - B, it.w, B, c, it.st.a);
      if (L) mkRect(P, it.name || "линия", it.x, it.y, L, it.h, c, it.st.a);
      if (R) mkRect(P, it.name || "линия", it.x + it.w - R, it.y, R, it.h, c, it.st.a);
      return;
    }
    const n = mkRect(P, it.name || "фон", it.x, it.y, it.w, it.h, it.fill, it.fo);
    if (it.rad) n.cornerRadius = it.rad;
    return n;
  }
  if (it.k === "t") {
    const t = mkText(it);
    P.appendChild(t);
    const L = it.lh || it.h;
    const dy = it.m ? MONO_DY * it.size : 0;
    if (it.multi) {
      t.textAutoResize = "HEIGHT"; t.resize(it.w, t.height);
      const ch = (it.m ? CONTENT.mono : CONTENT.body) * it.size;
      t.x = it.x; t.y = it.y - (L - ch) / 2 + dy;
    } else {
      t.textAutoResize = "WIDTH_AND_HEIGHT";
      t.y = it.y - (L - it.h) / 2 + dy;
      t.x = it.align === "CENTER" ? it.x + it.w / 2 - t.width / 2 : it.align === "RIGHT" ? it.x + it.w - t.width : it.x;
      if (it.align !== "LEFT") t.textAlignHorizontal = it.align;
    }
    return t;
  }
}
function plainFrame(P, name, x, y, w, h) {
  const f = figma.createFrame(); f.name = name; f.fills = []; f.clipsContent = false;
  f.resize(Math.max(w, 1), Math.max(h, 1)); P.appendChild(f); f.x = x; f.y = y; return f;
}
