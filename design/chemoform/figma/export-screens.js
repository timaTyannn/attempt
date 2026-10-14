const { chromium } = require('playwright');
const fs = require('fs');
// [comp index, frame name]
const PICK = JSON.parse(process.argv[2]);
const OUT = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>' + fs.readFileSync(process.argv[4] || 'build/tools.html', 'utf8') + '</body></html>');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  const res = await p.evaluate((pick) => {
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const comps = [...document.querySelectorAll('.comp')];
    const screens = pick.map(([i, name]) => {
      const scr = comps[i].firstElementChild.cloneNode(true);
      scr.style.transform = 'none';
      scr.style.position = 'relative';
      scr.id = name.replace(/[^A-Za-zА-Яа-яЁё0-9]+/g, '-');
      scr.setAttribute('data-name', name);
      scr.setAttribute('aria-label', name);
      return scr.outerHTML;
    });
    return { css, screens };
  }, PICK);
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Хемоформ — приборы</title>
<style>${res.css}
html, body { margin: 0; padding: 0; background: #0a0a0a; }
.wall { display: flex; flex-direction: column; gap: 200px; padding: 0; width: 1920px; }
</style></head><body><div class="wall">${res.screens.join('\n')}</div></body></html>`;
  fs.writeFileSync(OUT, html);
  console.log('wrote', OUT, html.length, 'bytes,', res.screens.length, 'screens');
  await b.close();
})();
