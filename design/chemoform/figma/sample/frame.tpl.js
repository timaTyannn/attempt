const S = __SPEC__;
const page = await figma.getNodeByIdAsync("__PAGE__");
await figma.setCurrentPageAsync(page);
const Hc = await figma.getNodeByIdAsync("__HDR__"), Fc = await figma.getNodeByIdAsync("__FTR__");
const ACC = "#3dd4c4";
// idempotent: drop an earlier copy of this frame on this page only
for (const n of page.children.filter(n => n.type === "FRAME" && n.name === "Образец · Карточка")) n.remove();
const fr = figma.createFrame();
fr.name = "Образец · Карточка"; page.appendChild(fr);
fr.resize(1920, 1080); fr.x = 0; fr.y = 0;
fr.fills = [paint(S.bg)]; fr.clipsContent = true;

// Шапка
const hi = Hc.createInstance(); fr.appendChild(hi); hi.name = "Шапка"; hi.x = 100; hi.y = 22;

// Подвкладки, Образец (left column)
for (const g of S.groups.filter(g => g.name === "Подвкладки" || g.name === "Образец")) { const f = plainFrame(fr, g.name, g.x, g.y, g.w, g.h); g.items.forEach(it => put(f, it)); }

// Пробирка: static copy of the live svg + editable text layers
const tube = figma.createNodeFromSvg(S.tube.svg);
tube.name = "Пробирка"; fr.appendChild(tube); tube.x = S.tube.rect[0]; tube.y = S.tube.rect[1];
tube.fills = []; tube.clipsContent = false;
const svgKids = tube.children.length;
tube.children.forEach((c, i) => { if (S.tube.names[i]) c.name = S.tube.names[i]; });
let dashFixed = 0;
for (const c of tube.children) if (c.name === "отметка уровня" && "dashPattern" in c && (!c.dashPattern || !c.dashPattern.length)) { c.dashPattern = [6, 6]; dashFixed++; }
for (const t of S.tube.texts) {
  const n = mkText({ m: true, s: t.text, wt: t.weight, size: t.size, c: t.fill, name: t.name });
  tube.appendChild(n); n.textAutoResize = "WIDTH_AND_HEIGHT";
  n.y = t.y - 0.95 * t.size; // browser baseline → Martian Mono box top, cap centres aligned
  n.x = t.anchor === "middle" ? t.x - n.width / 2 : t.anchor === "end" ? t.x - n.width : t.x;
  if (t.anchor !== "start") n.textAlignHorizontal = t.anchor === "middle" ? "CENTER" : "RIGHT";
}

// Расход: header line + 4 rows as tall as the share each instrument took
const lhd = S.groups.find(g => g.name === "Расход/шапка");
const ras = plainFrame(fr, "Расход", lhd.x, lhd.y, 740, S.rows[S.rows.length - 1].rect[1] + S.rows[S.rows.length - 1].rect[3] - lhd.y);
const hd = plainFrame(ras, "Расход/шапка", 0, 0, lhd.w, lhd.h); lhd.items.forEach(it => put(hd, it));
const rowsF = figma.createAutoLayout("VERTICAL");
rowsF.name = "Расход/строки"; rowsF.fills = []; rowsF.itemSpacing = 0; rowsF.clipsContent = false;
ras.appendChild(rowsF); rowsF.x = 0; rowsF.y = S.rows[0].rect[1] - lhd.y;
const rowIds = [];
S.rows.forEach((r, i) => {
  const row = figma.createAutoLayout("HORIZONTAL");
  row.name = "Расход/строка " + (i + 1) + (r.sel ? " · выбрана" : "");
  rowsF.appendChild(row);
  row.resize(r.rect[2], r.rect[3]); row.primaryAxisSizingMode = "FIXED"; row.counterAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = "CENTER"; row.itemSpacing = 24;
  row.paddingLeft = 20; row.paddingRight = 0; row.paddingTop = 1; row.paddingBottom = 0;
  row.fills = r.sel ? [paint(r.bg[0])] : [];
  row.strokes = [paint(r.border)]; row.strokeAlign = "INSIDE";
  row.strokeTopWeight = 1; row.strokeBottomWeight = 0; row.strokeLeftWeight = 0; row.strokeRightWeight = 0;
  row.clipsContent = false;
  const c = mkText({ m: true, s: r.c.text, wt: 700, size: 28, c: r.c.color, name: "расход" });
  row.appendChild(c); c.textAutoResize = "HEIGHT"; c.resize(104, c.height);
  const nm = mkText({ m: true, s: r.nm.text, wt: 400, size: 20, ls: 1.6, c: r.nm.color, name: "прибор" });
  row.appendChild(nm); nm.textAutoResize = "HEIGHT"; nm.resize(280, nm.height);
  const rs = mkText({ m: false, s: r.r.text, wt: 400, size: 22, c: r.r.color, name: "результат" });
  row.appendChild(rs); rs.textAutoResize = "WIDTH_AND_HEIGHT";
  if (r.sel) {
    const bar = figma.createRectangle(); bar.name = "выбор";
    row.appendChild(bar); bar.layoutPositioning = "ABSOLUTE";
    bar.resize(4, r.rect[3] - 1); bar.x = 0; bar.y = 1; bar.fills = [paint(ACC)];
    bar.constraints = { horizontal: "MIN", vertical: "STRETCH" };
  }
  rowIds.push(row.id);
});

// Уровень: the current level line, from the tube wall to the right edge
const lv = S.groups.find(g => g.name === "Уровень");
const lvl = mkRect(fr, "Уровень", lv.x, lv.y, lv.w, lv.h, "#bdbdbd");

// Остаток
const rest = S.groups.find(g => g.name === "Остаток");
const rf = plainFrame(fr, "Остаток", rest.x, rest.y, rest.w, rest.h); rest.items.forEach(it => put(rf, it));

// Низ
const fi = Fc.createInstance(); fr.appendChild(fi); fi.name = "Низ"; fi.x = 0; fi.y = 1000;

// verification: every text, frame coordinates
const R = v => Math.round(v * 10) / 10;
const texts = fr.findAllWithCriteria({ types: ["TEXT"] }).map(t => { const b = t.absoluteBoundingBox; return [t.characters.slice(0, 24), R(b.x - fr.x), R(b.y - fr.y), R(b.width), R(b.height)]; });
await fr.screenshot({ scale: 0.5 });
return { frameId: fr.id, headerInst: hi.id, footerInst: fi.id, tubeId: tube.id, svgKids, dashFixed, rowIds, rasId: ras.id, levelId: lvl.id, restId: rf.id, texts };
