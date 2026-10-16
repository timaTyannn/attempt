# Хемоформ — интерфейс терминала

Макеты интерфейса модуля «Хемоформ» (лабораторный стол, экран на меше, 1920×1080).
Исходники страниц — `src/`, перенос в Figma — `figma/`. Решения и история — в
`GameDesignVault/05 Art & Audio/UI Хемоформ.md`.

## Где что лежит

| Файл | Что внутри | Опубликовано |
|---|---|---|
| `src/sample.html` | Вкладка «Образец» (заменила Обзор и Анализ, «Улики» убраны): подвкладки «обзор · отчёт · + новый образец»; обзор с мерной пробиркой и списком расхода пробы, отчёт «определено» и «провал», выбор новой пробы — всё по одному шаблону. Внизу шапка с Q/E, без них и с геймпадом | [LyhvNksiBRhM7LYidGo5z9](https://claude.ai/artifact/LyhvNksiBRhM7LYidGo5z9) |
| `src/database.html` | «База данных»: что внутри (инструкции к приборам, таблица Менделеева, справочник, вещества) и три варианта — учебник, энциклопедия, схема — на статье об ИК-спектрометре и таблице | [MBjEnkYy3EdRKVCTpWDdSd](https://claude.ai/artifact/MBjEnkYy3EdRKVCTpWDdSd) |
| `src/overview.html` | «Обзор» — три варианта в стиле нового выбора приборов (подсветка снизу, бирюзовый чертёж за краем карточки). Вкладка убрана, страница — эталон моушна полос | [Kn2qxEfttir2tiXgDwaR2w](https://claude.ai/artifact/Kn2qxEfttir2tiXgDwaR2w) |
| `rive-motion-strips.md` | ТЗ на моушн полос-аккордеона для Rive: промпт, геометрия, тайминги, устройство машины состояний | — |
| `src/sections.html` | Все разделы терминала, 17 экранов: загрузка, обзор, анализ (стол пуст, образец, улики, отчёт), приборы (масс, ИК, молекула), база данных, журнал, улучшения | [Wmqv6JyKujYqVTJ9YxQtAD](https://claude.ai/artifact/Wmqv6JyKujYqVTJ9YxQtAD) |
| `src/tools.html` | Шапка Б и все варианты вкладки «Приборы»: простые, аккордеон, постеры, чертежи ISO и 2D | [claude.ai/artifact/GY5kVhwCugeGEPdY2idrj4](https://claude.ai/artifact/GY5kVhwCugeGEPdY2idrj4) |
| `src/upgrades.html` | Улучшения — дерево в стиле Alters | [HxegxjbDuLsqXJoN64ZLFp](https://claude.ai/artifact/HxegxjbDuLsqXJoN64ZLFp) |
| `src/variants.html` | Масштабирование приборов и варианты меню улучшений | [4sJSWHY9veM9ocSGkkt1X7](https://claude.ai/artifact/4sJSWHY9veM9ocSGkkt1X7) |
| `src/home.html` | Обзор (главная) | [TSzQBrX7squnGv9j8yVexN](https://claude.ai/artifact/TSzQBrX7squnGv9j8yVexN) |
| `src/directions.html` | Контракт дизайна и три направления | [6LiiomTHwayPUArwpvzmc2](https://claude.ai/artifact/6LiiomTHwayPUArwpvzmc2) |
| `src/terminal-v2.html` | Терминал со шрифтами | [3FWXtTM2wrogeVhfMTwoA3](https://claude.ai/artifact/3FWXtTM2wrogeVhfMTwoA3) |
| `src/terminal-v1.html` | Терминал в стиле Bioform | [PyU9oitadC9PZcrzbNbVkD](https://claude.ai/artifact/PyU9oitadC9PZcrzbNbVkD) |
| `src/select.html`, `src/lab.html`, `src/hive.html` | Ранние поиски: экран выбора, лаборатория Alters, улей | [select](https://claude.ai/artifact/LftuWan8ADeA8bVboP7v3m) · [lab](https://claude.ai/artifact/16aNmwFVFEphN11Zs3YsVG) · [hive](https://claude.ai/artifact/YJP8XnnF8PMsy8aVV262ze) |

Figma: файл ED.MIET-4course.
- Страница [«Хемоформ · Образец»](https://www.figma.com/design/hU6l0OOkps8tAgoZQbZfVO/ED.MIET-4course?node-id=328-2283) —
  кадры «Образец · Обзор», «Отчёт · определено», «Отчёт · провал», «Новый образец» и компоненты
  «CF/Header · 5 вкладок», «CF/Footer · корень».
- Ранние экраны приборов (4 избранных и 15 с чертежами) переносились на страницу «Хемоформ · Приборы».

## Сборка

Шрифт Disket Mono встраивается в страницы при сборке. Положите в `fonts/` файлы
`DISKET-MONO-REGULAR.TTF` и `DISKET-MONO-BOLD.TTF` (в git они не попадают), затем:

```
python3 build.py        # src/*.html -> build/*.html
```

## Перенос в Figma

Экраны переносятся редактируемыми слоями: прямоугольники, текст, векторные чертежи,
шапка и низ — экземпляры компонентов. Нужны Node и Playwright.

```
node figma/export-screens.js '[[23,"Приборы · Постер"]]' figma/screens.html build/tools.html   # [индекс экрана на странице, имя кадра]
node figma/extract-spec.js figma/screens.html figma/spec.json
python3 figma/gen-code.py PAGE_ID HEADER_ID FOOTER_ID 4                                        # -> figma/batch-N.js
```

Каждый `batch-N.js` выполняется через `use_figma` (Figma MCP).

Вкладка «Образец» переносится своими скриптами из `figma/sample/` — с шапкой и низом
в виде компонентов и статичной пробиркой. Отчёт построен по шаблону карточки, поэтому
собирается теми же скриптами, меняется только номер экрана на странице, имя кадра и x:

```
node figma/sample/card-extract.js build/sample.html figma/sample/card-spec.json        # экран 0 — обзор
python3 figma/sample/gen.py comps                                                       # -> out-comps.js: страница и компоненты
python3 figma/sample/gen.py frame PAGE_ID HDR_ID FTR_ID                                 # -> out-frame.js: кадр обзора

node figma/sample/card-extract.js build/sample.html figma/sample/ok-spec.json 1         # экран 1 — отчёт «определено»
python3 figma/sample/gen.py frame PAGE_ID HDR_ID FTR_ID figma/sample/ok-spec.json "Образец · Отчёт · определено" 2040 figma/sample/out-ok.js
``` Disket Mono недоступен
облачному Figma, поэтому моно-текст ставится шрифтом Martian Mono. В десктопном Figma
выделите любой такой текст → Select matching layers → смените семейство на Disket Mono:
размеры и начертания сохранятся.
