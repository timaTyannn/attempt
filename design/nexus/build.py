#!/usr/bin/env python3
"""Собирает страницы из src/ в build/: встраивает шрифт Disket Mono, фоны и растения из img/ (base64)
и SVG из Figma (img/nx-svg.js: эмблема, клавиши Q/E, иконки лабораторий).

Шрифт берётся из ../chemoform/fonts/ (DISKET-MONO-REGULAR.TTF и DISKET-MONO-BOLD.TTF, в git их нет).
"""
import base64
import pathlib

root = pathlib.Path(__file__).parent
fonts = root.parent / "chemoform" / "fonts"
b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
subs = {
    "__DISKET_REG__": b64(fonts / "DISKET-MONO-REGULAR.TTF"),
    "__DISKET_BOLD__": b64(fonts / "DISKET-MONO-BOLD.TTF"),
    "__BG_HUB__": b64(root / "img" / "bg-hub.jpg"),
    "__BG_INV__": b64(root / "img" / "bg-inv.jpg"),
    "__P_CHER__": b64(root / "img" / "p-cher.png"),
    "__P_POTATO__": b64(root / "img" / "p-potato.png"),
    "__P_SCAB__": b64(root / "img" / "p-scab.png"),
    "/*__NXSVG__*/": (root / "img" / "nx-svg.js").read_text(encoding="utf-8"),
}
out = root / "build"
out.mkdir(exist_ok=True)
for f in sorted((root / "src").glob("*.html")):
    s = f.read_text(encoding="utf-8")
    for k, v in subs.items():
        s = s.replace(k, v)
    (out / f.name).write_text(s, encoding="utf-8")
    print("built", f.name)
