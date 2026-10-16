const H = __HDR__;
const F = __FTR__;
const PAGE_NAME = "Хемоформ · Образец";
let page = figma.root.children.find(p => p.name === PAGE_NAME);
const createdPage = !page;
if (!page) { page = figma.createPage(); page.name = PAGE_NAME; }
await figma.setCurrentPageAsync(page);
// idempotent: drop earlier copies of these two components on this page only
for (const n of page.children.filter(n => n.type === "COMPONENT" && (n.name === "CF/Header · 5 вкладок" || n.name === "CF/Footer · корень"))) n.remove();
const ACC = "#3dd4c4";

// ---------- header: 5 tabs centred, 1 px bottom rule ----------
const hdr = figma.createComponent();
hdr.name = "CF/Header · 5 вкладок";
page.appendChild(hdr);
hdr.layoutMode = "HORIZONTAL";
hdr.primaryAxisAlignItems = "CENTER";
hdr.counterAxisAlignItems = "CENTER";
hdr.primaryAxisSizingMode = "FIXED"; hdr.counterAxisSizingMode = "FIXED";
hdr.resize(H.w, H.h);
hdr.paddingBottom = 1; hdr.itemSpacing = 0;
hdr.fills = []; hdr.clipsContent = false;
hdr.strokes = [paint("#2c2c2c")]; hdr.strokeAlign = "INSIDE";
hdr.strokeTopWeight = 0; hdr.strokeLeftWeight = 0; hdr.strokeRightWeight = 0; hdr.strokeBottomWeight = 1;
hdr.x = 100; hdr.y = 1200;
hdr.description = "Шапка терминала «Хемоформ»: 5 вкладок без клавиш Q/E. Активная вкладка — свечение снизу и бирюзовая черта 4 px. Ставится в кадр на x 100, y 22.";
const tabIds = [];
for (const tb of H.tabs) {
  const tab = figma.createAutoLayout("HORIZONTAL");
  tab.name = "Вкладка/" + tb.label + (tb.on ? " · активна" : "");
  tab.fills = []; tab.clipsContent = false;
  tab.paddingLeft = 24; tab.paddingRight = 24; tab.paddingTop = 0; tab.paddingBottom = 0; tab.itemSpacing = 12;
  tab.counterAxisAlignItems = "CENTER";
  hdr.appendChild(tab);
  tab.layoutSizingVertical = "FILL";
  const ic = figma.createNodeFromSvg(tb.svg);
  ic.name = "иконка/" + tb.icon; ic.fills = [];
  tab.appendChild(ic); ic.resize(26, 26);
  const t = mkText({ m: true, s: tb.label, wt: 400, size: 18, ls: 1.08, c: tb.color, name: tb.label });
  tab.appendChild(t);
  if (tb.dot) { const d = figma.createEllipse(); d.name = "метка"; d.resize(12, 12); d.fills = [paint(ACC)]; tab.appendChild(d); }
  if (tb.pts) {
    const pill = figma.createAutoLayout("HORIZONTAL");
    pill.name = "очки"; pill.fills = [paint(ACC)]; pill.cornerRadius = 13;
    pill.paddingLeft = 6; pill.paddingRight = 6; pill.paddingTop = 0; pill.paddingBottom = 0;
    pill.primaryAxisAlignItems = "CENTER"; pill.counterAxisAlignItems = "CENTER";
    tab.appendChild(pill);
    const pt = mkText({ m: true, s: tb.pts, wt: 700, size: 15, c: "#0b201e", name: "число" });
    pill.appendChild(pt);
    pill.resize(26, 26); pill.primaryAxisSizingMode = "AUTO"; pill.counterAxisSizingMode = "FIXED"; pill.minWidth = 26;
  }
  if (tb.on) {
    // CSS ::before: top 5 px to bottom, gradient transparent → rgba(61,212,196,.34); ::after: 4 px accent line, bottom −1 px
    const glow = figma.createRectangle(); glow.name = "свечение";
    tab.insertChild(0, glow); glow.layoutPositioning = "ABSOLUTE";
    glow.resize(tab.width, tab.height - 5); glow.x = 0; glow.y = 5;
    glow.fills = [{ type: "GRADIENT_LINEAR", gradientTransform: [[0, 1, 0], [-1, 0, 1]], gradientStops: [{ position: 0, color: { ...hx(ACC), a: 0 } }, { position: 1, color: { ...hx(ACC), a: 0.34 } }] }];
    glow.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
    const ul = figma.createRectangle(); ul.name = "черта";
    tab.insertChild(1, ul); ul.layoutPositioning = "ABSOLUTE";
    ul.resize(tab.width, 4); ul.x = 0; ul.y = tab.height + 1 - 4;
    ul.fills = [paint(ACC)];
    ul.constraints = { horizontal: "STRETCH", vertical: "MAX" };
  }
  tabIds.push(tab.id);
}

// ---------- footer: camera keys 1–4, the current one is teal ----------
const ft = figma.createComponent();
ft.name = "CF/Footer · корень";
page.appendChild(ft);
ft.layoutMode = "HORIZONTAL";
ft.primaryAxisAlignItems = "CENTER"; ft.counterAxisAlignItems = "CENTER";
ft.primaryAxisSizingMode = "FIXED"; ft.counterAxisSizingMode = "FIXED";
ft.resize(1920, 30);
ft.itemSpacing = 44; ft.fills = []; ft.clipsContent = false;
ft.x = 0; ft.y = 1320;
ft.description = "Низ корневого экрана (карточка образца): клавиши камер 1–4, без ESC. Активная камера — бирюзовая клавиша и белая подпись. Ставится в кадр на x 0, y 1000.";
for (const it of F.items) {
  const g = figma.createAutoLayout("HORIZONTAL");
  g.name = "Камера " + it.kcText + "/" + it.label + (it.on ? " · активна" : "");
  g.fills = []; g.clipsContent = false; g.itemSpacing = 12; g.counterAxisAlignItems = "CENTER";
  ft.appendChild(g);
  const kc = figma.createAutoLayout("HORIZONTAL");
  kc.name = "клавиша"; kc.fills = [paint(it.kcBg)]; kc.cornerRadius = 5; kc.clipsContent = false;
  kc.paddingLeft = 7; kc.paddingRight = 7; kc.paddingTop = 0; kc.paddingBottom = 0;
  kc.primaryAxisAlignItems = "CENTER"; kc.counterAxisAlignItems = "CENTER";
  kc.effects = [{ type: "DROP_SHADOW", color: { ...hx(it.shadow), a: 1 }, offset: { x: 0, y: 4 }, radius: 0, spread: 0, visible: true, blendMode: "NORMAL", showShadowBehindNode: false }];
  g.appendChild(kc);
  const kt = mkText({ m: true, s: it.kcText, wt: 700, size: 16, c: "#141414", name: "символ" });
  kc.appendChild(kt);
  kc.resize(32, 30); kc.primaryAxisSizingMode = "AUTO"; kc.counterAxisSizingMode = "FIXED"; kc.minWidth = 32;
  const lt = mkText({ m: true, s: it.label, wt: 400, size: 19, c: it.color, name: it.label });
  g.appendChild(lt);
}
const sh = await hdr.screenshot({ scale: 1 });
const sf = await ft.screenshot({ scale: 0.6 });
const tabs = hdr.children.map(c => ({ n: c.name, x: Math.round(c.x * 10) / 10, w: Math.round(c.width * 10) / 10, h: c.height, kids: c.children.filter(k => k.layoutPositioning !== "ABSOLUTE").map(k => [k.name, Math.round((c.x + k.x) * 10) / 10, Math.round(k.y * 10) / 10, Math.round(k.width * 10) / 10, Math.round(k.height * 10) / 10]) }));
const items = ft.children.map(c => ({ n: c.name, x: Math.round(c.x * 10) / 10, w: Math.round(c.width * 10) / 10, kids: c.children.map(k => [k.name, Math.round((c.x + k.x) * 10) / 10, Math.round(k.y * 10) / 10, Math.round(k.width * 10) / 10, Math.round(k.height * 10) / 10]) }));
return { pageId: page.id, createdPage, headerId: hdr.id, footerId: ft.id, tabIds, tabs, items };
