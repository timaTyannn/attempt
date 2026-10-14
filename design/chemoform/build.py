#!/usr/bin/env python3
"""Собирает страницы из src/ в build/ и встраивает шрифт Disket Mono (base64).

Перед сборкой положите в fonts/ файлы DISKET-MONO-REGULAR.TTF и DISKET-MONO-BOLD.TTF.
Страницы без Disket (hive, lab, select, terminal-v1) копируются как есть.
"""
import base64
import pathlib

root = pathlib.Path(__file__).parent
fonts = root / "fonts"
reg = base64.b64encode((fonts / "DISKET-MONO-REGULAR.TTF").read_bytes()).decode()
bold = base64.b64encode((fonts / "DISKET-MONO-BOLD.TTF").read_bytes()).decode()
out = root / "build"
out.mkdir(exist_ok=True)
for f in sorted((root / "src").glob("*.html")):
    s = f.read_text(encoding="utf-8").replace("__DISKET_REG__", reg).replace("__DISKET_BOLD__", bold)
    (out / f.name).write_text(s, encoding="utf-8")
    print("built", f.name)
