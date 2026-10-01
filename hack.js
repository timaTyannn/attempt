(function () {
  // уже разбудила терминал разработчика и обновила страницу -> сразу обратно в терминал
  if (window.DevTerm && DevTerm.shouldResume()) { DevTerm.resume(); return; }
  var Q = window.QUEST || {};
  var WHO = Q.who || "?";
  var $ = function (id) { return document.getElementById(id); };
  var HEXCH = "0123456789ABCDEF";
  var GLYPHS = "█▓▒░#@$%&01ABCDEF<>/\\|=+*";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STORE = "quest_hacked_at", REV = "quest_row";
  var unread = 0, ringTimer = null, hacked = false, dead = false;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function rg() { return GLYPHS[Math.random() * GLYPHS.length | 0]; }
  function loop(fn, a, b) { (function t() { setTimeout(function () { if (dead) return; fn(); t(); }, rnd(a, b)); })(); }
  function store(k, v) { try { if (v === null) sessionStorage.removeItem(k); else if (v !== undefined) sessionStorage.setItem(k, v); return sessionStorage.getItem(k); } catch (e) { return null; } }
  // перезагрузка страницы (F5) начинает всё заново; переход по ссылкам внутри сайта состояние сохраняет
  var nav = window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  if ((nav && nav.type === "reload") || /[?&]reset\b/.test(location.search)) { store(STORE, null); store(REV, null); }

  // ---------- "подключившийся": на экране мельтешат символы, настоящее значение только в коде элемента ----------
  function whoSpan() {
    var s = document.createElement("span");
    s.className = "who";
    s.setAttribute("data-user", WHO);
    s.textContent = scr();
    return s;
  }
  function scr() { var t = ""; for (var i = 0; i < WHO.length; i++) t += rg(); return t; }
  setInterval(function () {
    var w = document.querySelectorAll(".who");
    for (var i = 0; i < w.length; i++) w[i].textContent = scr();
    var q = document.querySelectorAll(".scr");
    for (var j = 0; j < q.length; j++) { var n = +q[j].getAttribute("data-len") || 10, t = ""; while (n--) t += rg(); q[j].textContent = t; }
  }, 80);

  // ---------- меню шапки и колокольчик ----------
  function closeMenus(except) {
    var o = document.querySelectorAll(".navbar-nav > li.open");
    for (var i = 0; i < o.length; i++) if (o[i] !== except) o[i].classList.remove("open");
  }
  var toggles = document.querySelectorAll(".dropdown-toggle");
  for (var ti = 0; ti < toggles.length; ti++) toggles[ti].addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    var li = this.parentNode, opening = !li.classList.contains("open");
    closeMenus(li);
    li.classList.toggle("open", opening);
    if (li.id === "bell-wrap") { ring(); if (opening) { unread = 0; $("bell-badge").style.display = "none"; } }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".dropdown-menu")) closeMenus(null);
  });
  // скрытая 11-я строка таблицы: открывается кликом по подписи столбца "балл"
  function revealRow() {
    var r = $("row11");
    if (!r || r.style.display === "") return;
    r.style.display = ""; r.classList.add("reveal-row"); store(REV, "1");
  }
  var bb = $("ballbtn");
  if (bb) bb.addEventListener("click", function () { if (document.body.classList.contains("infected")) revealRow(); });
  // на телефоне колокольчик выносится из свёрнутого меню в шапку, чтобы его было видно
  (function () {
    var bw = $("bell-wrap"), home = bw && bw.parentNode, hdr = document.querySelector(".navbar-header");
    if (!bw || !hdr || !window.matchMedia) return;
    var ul = document.createElement("ul"); ul.className = "mobile-bell";
    var mq = matchMedia("(max-width: 767px)");
    function place() {
      if (mq.matches) { if (bw.parentNode !== ul) { ul.appendChild(bw); hdr.insertBefore(ul, hdr.querySelector(".navbar-brand")); } }
      else if (bw.parentNode !== home) { home.insertBefore(bw, home.firstChild); if (ul.parentNode) ul.remove(); }
    }
    place();
    if (mq.addEventListener) mq.addEventListener("change", place); else mq.addListener(place);
  })();
  var nt = $("nav-toggle");
  if (nt) nt.addEventListener("click", function () { $("nav-collapse").classList.toggle("in"); });

  function ring() {
    var b = $("bell");
    b.classList.remove("ring"); void b.getBoundingClientRect(); b.classList.add("ring");
  }
  function bellPost(text) {
    var d = document.createElement("div");
    d.className = "bell-item";
    d.textContent = text;
    var list = $("bell-list");
    list.insertBefore(d, list.firstChild);
    $("bell-empty").style.display = "none";
    unread++;
    var b = $("bell-badge");
    b.textContent = unread; b.style.display = "block";
    ring();
    // пока сообщение не открыто, колокольчик время от времени снова качается
    if (!ringTimer) ringTimer = setInterval(function () { if (unread > 0) ring(); }, 6000);
  }

  // ---------- эффект печати ----------
  // последние W символов мелькают случайными знаками, потом встают на место; \u0001 = мельтешащий "подключившийся"
  function typeLines(el, lines, cb) {
    var W = 4, li = 0, p = 0, done = "";
    function render(t) {
      el.textContent = "";
      var parts = t.split("\u0001");
      for (var i = 0; i < parts.length; i++) {
        if (i > 0) { el.appendChild(whoSpan()); el.appendChild(document.createComment(" " + WHO + " ")); }
        el.appendChild(document.createTextNode(parts[i]));
      }
      var c = document.createElement("span"); c.className = "cur"; el.appendChild(c);
    }
    (function step() {
      if (li >= lines.length) { render(done); return cb && cb(); }
      var ln = lines[li];
      if (p <= ln.length + W) {
        var from = Math.max(0, p - W), noise = "";
        for (var k = from; k < Math.min(p, ln.length); k++) noise += (ln[k] === " " || ln[k] === "\u0001") ? ln[k] : rg();
        render(done + ln.slice(0, from) + noise);
        p++; setTimeout(step, 30);
      } else { done += ln + "\n"; li++; p = 0; setTimeout(step, 260); }
    })();
  }

  function scrambleHex(instant) {
    var cells = document.querySelectorAll(".grade");
    var t0 = Date.now();
    function paint(done) {
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        c.classList.add("hexed");
        c.textContent = done ? c.getAttribute("data-hex") : HEXCH[Math.random() * 16 | 0] + HEXCH[Math.random() * 16 | 0];
      }
    }
    if (instant) return paint(true);
    var iv = setInterval(function () {
      var done = Date.now() - t0 > 1100;
      paint(done);
      if (done) clearInterval(iv);
    }, 60);
  }
  function blips() {
    var pool = document.querySelectorAll(".well b, td, th, .breadcrumb li");
    setInterval(function () {
      var el = pool[Math.random() * pool.length | 0];
      if (!el) return;
      el.classList.remove("blip"); void el.offsetWidth; el.classList.add("blip");
    }, 1400);
  }

  // ---------- хоррор-слой: включается после взлома ----------
  var CREEPY = ["ТЫ НЕ ОДНА В КАНАЛЕ", "ОНИ ЧИТАЮТ", "НЕ ЗАКРЫВАЙ", "ТИШЕ", "КТО-ТО СМОТРИТ", "ТЫ СЛЫШИШЬ?",
                "ОН ЗДЕСЬ", "НЕ ОБОРАЧИВАЙСЯ", "ОН ЖДЁТ", "ЕЩЁ РАНО", "ПОЗДНО"];
  var ZW = ["̀", "́", "̂", "̃", "̈", "̊", "̕", "̖", "̛", "̣", "̤", "̴", "̵", "̶", "̷", "̸"];
  var TICK = ["узел-3 → прокси .......... ok", "handshake 0x4F2A9C", "чтение /home/student/…", "раскодирование сессии",
              "exfil 14 KB", "соединение удерживается", "▒▒▒▒▒▒▒▒▒▒", "в сети есть кто-то ещё", "ключ шифрования ротирован", "тишина в канале"];
  function zalgo(s) {
    return s.split("").map(function (c) {
      var n = 1 + (Math.random() * 3 | 0), z = "";
      while (n--) z += ZW[Math.random() * ZW.length | 0];
      return c + z;
    }).join("");
  }
  function mk(tag, id, cls) {
    var e = document.createElement(tag);
    if (id) e.id = id;
    e.className = "fx " + (cls || "");
    document.body.appendChild(e);
    return e;
  }
  var horrorOn = false;
  function horror() {
    if (horrorOn) return; horrorOn = true;
    mk("div", "vignette"); mk("div", "scan");
    if (!reduce) mk("div", "roll");

    // индикатор "запись"
    var rec = mk("div", "rec"), s0 = Date.now();
    function recTick() { var s = (Date.now() - s0) / 1000 | 0; rec.innerHTML = "<i></i>REC " + pad(s / 3600 | 0) + ":" + pad(s / 60 % 60 | 0) + ":" + pad(s % 60); }
    recTick(); setInterval(recTick, 1000);

    // бегущий лог; первая строка закреплена: кто подключился (символы мельтешат)
    var onHelp = !!$("chat");          // на странице переписки лог не показываем, чтобы не мешал читать
    var tk = mk("div", "ticker"), lines = [];
    if (onHelp) tk.style.display = "none";
    var pin = document.createElement("div"), rows = document.createElement("div");
    pin.appendChild(document.createTextNode("подключён: ")); pin.appendChild(whoSpan()); pin.appendChild(document.createComment(" " + WHO + " "));
    tk.appendChild(pin); tk.appendChild(rows);
    loop(function () {
      var d = new Date();
      lines.push("[" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "] " + TICK[Math.random() * TICK.length | 0]);
      if (lines.length > 4) lines.shift();
      rows.textContent = lines.join("\n");
    }, 700, 2200);

    // (сильные эффекты - подёргивание страницы, полосы-"разрывы", "сломанные" символы - убраны ради читаемости)
    // редко одно короткое слово на странице на миг подменяется чужим
    var pool = [].slice.call(document.querySelectorAll("#content td, #content th, #content b, .breadcrumb a, .label")).filter(function (e) {
      return !e.children.length && !e.classList.contains("grade") && e.textContent.trim().length > 2;
    });
    loop(function () {
      var e = pool[rnd(0, pool.length) | 0];
      if (!e || e._c) return;
      e._c = 1;
      var o = e.textContent, t = CREEPY[rnd(0, CREEPY.length) | 0];
      e.classList.add("corrupt"); e.textContent = t;
      setTimeout(function () { e.textContent = o; e.classList.remove("corrupt"); e._c = 0; }, rnd(200, 450));
    }, 7000, 15000);

    // hex-ячейки моргают
    loop(function () {
      var g = document.querySelectorAll(".grade"), e = g[rnd(0, g.length) | 0];
      if (!e) return;
      e.style.opacity = ".25"; setTimeout(function () { e.style.opacity = ""; }, rnd(60, 160));
    }, 900, 2500);

    // заголовок вкладки
    var T0 = document.title;
    loop(function () {
      document.title = Math.random() < .5 ? zalgo("не закрывай") : "▒▒▒▒▒▒▒▒";
      setTimeout(function () { document.title = T0; }, rnd(300, 900));
    }, 9000, 20000);

    // редкая вспышка полной темноты
    var bo = mk("div", "blackout");
    loop(function () {
      if (reduce) return;
      bo.textContent = Math.random() < .5 ? "" : "ТИХО";
      bo.classList.add("on");
      setTimeout(function () { bo.classList.remove("on"); }, rnd(90, 260));
    }, 45000, 100000);
  }

  // ---------- переписка на странице "Помощь" ----------
  // финал: череп из символов "расшифровывается" посередине, сайт глохнет, остаётся "/ конец /"
  var SKULL = [
    [[20, ":PB@Bk:"]],
    [[16, ",jB@@B@B@B@BBL."]],
    [[13, "7G@B@B@BMMMMMB@B@B@Nr"]],
    [[9, ":kB@B@@@MMOMOMOMOMMMM@B@B@B1,"]],
    [[5, ":5@B@B@B@BBMMOMOMOMOMOMOMOMM@@@B@B@BBu."]],
    [[2, "7O@@@B@B@B@BXBBOMOMOMOMOMOMOMMBMPB@B@B@B@B@Nr"]],
    [[0, "G@@@BJ 1B@B@@  OBMOMOMOMOMOMOM@2  B@B@B. EB@B@S"]],
    [[0, "@@BM@GJBU.  1SuB@OMOMOMOMOMOMM@OU1:  .kBLM@M@B@"]],
    [[0, "B@MMB@B"], [14, "7@BBMMOMOMOMOMOBB@:"], [40, "B@BMM@B"]],
    [[0, "@@@B@B"], [15, "7@@@MMOMOMOMM@B@:"], [41, "@@B@B@"]],
    [[0, "@@OLB."], [16, "BNB@MMOMOMM@BEB"], [41, "rBjM@B"]],
    [[0, "@@  @"], [16, "M  OBOMOMM@q  M"], [41, ".@  @@"]],
    [[0, "@@OvB"], [16, "B:u@MMOMOMMBJiB"], [41, ".BvM@B"]],
    [[0, "@B@B@J"], [15, "O@B@MMOMOMOMB@B@u"], [41, "q@@@B@"]],
    [[0, "B@MBB@v"], [14, "G@@BMMMMMMMMMMMBB@5"], [40, "F@BMM@B"]],
    [[0, "@BBM@BPNi   LMEB@OMMMM@B@MMOMM@BZM7   rEqB@MBB@"]],
    [[0, "B@@@BM  B@B@B  qBMOMB@B@B@BMOMBL  B@B@B  @B@B@M"]],
    [[1, "J@@@@PB@B@B@B7G@OMBB.    ,@MMM@qLB@B@@@BqB@BBv"]],
    [[4, "iGB@,iO@M@B@MMO@E  :  M@OMM@@@B@Pii@@N:"]],
    [[7, "."], [11, "B@M@B@MMM@B@B@B@MMM@@@M@B"]],
    [[11, "@B@B.i@MBB@B@B@@BM@::B@B@"]],
    [[11, "B@@@ .B@B.:@B@ :B@B  @B@O"]],
    [[13, ":O r@B@  B@@ .@B@: P:"]],
    [[17, "vMB :@B@ :B07"]],
    [[21, ",B@B"]]
  ].map(function (segs) {
    var row = new Array(48).join(" ").split("");
    segs.forEach(function (sg) { for (var i = 0; i < sg[1].length; i++) row[sg[0] + i] = sg[1][i]; });
    return row;
  });
  // каждый символ появляется мусором в случайный момент и быстро "встаёт" на место
  function decodeArt(el, ms, cb) {
    var cells = [];
    SKULL.forEach(function (row, r) { row.forEach(function (ch, c) {
      if (ch !== " ") { var a = rnd(0, ms * .45); cells.push({ r: r, c: c, ch: ch, a: a, z: a + rnd(120, ms * .55) }); }
    }); });
    var t0 = Date.now();
    var iv = setInterval(function () {
      var t = Date.now() - t0, grid = SKULL.map(function (row) { return row.map(function () { return " "; }); }), done = true;
      cells.forEach(function (p) {
        if (t >= p.z) grid[p.r][p.c] = p.ch;
        else { done = false; if (t >= p.a) grid[p.r][p.c] = rg(); }
      });
      el.textContent = grid.map(function (row) { return row.join(""); }).join("\n");
      if (done) { clearInterval(iv); cb && cb(); }
    }, 35);
  }
  // волны кода расходятся от центра и "съедают" сайт (эффект близости: символы ярче у фронта волны)
  function codeWave(o, cb) {
    var cv = document.createElement("canvas"); cv.id = "wave"; o.appendChild(cv);
    var W = cv.width = (innerWidth || document.documentElement.clientWidth || 800), H = cv.height = (innerHeight || document.documentElement.clientHeight || 600), ctx = cv.getContext("2d");
    var cell = W < 600 ? 12 : 14, cx = W / 2, cy = H / 2, maxR = Math.sqrt(cx * cx + cy * cy) + 80;
    var dur = 1000, band = W < 600 ? 60 : 90, t0 = performance.now();
    ctx.font = "700 " + (cell - 2) + "px Consolas, 'Courier New', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (function frame() {
      var k = Math.min(1, (performance.now() - t0) / dur), r = maxR * (1 - Math.pow(1 - k, 2));
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - band * .5), 0, Math.PI * 2); ctx.fill();
      for (var y = cell / 2; y < H; y += cell) for (var x = cell / 2; x < W; x += cell) {
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        var p1 = 1 - Math.abs(d - r) / band, p2 = .45 * (1 - Math.abs(d - r * .62) / band), p = Math.max(p1, p2);
        if (p <= 0) continue;
        ctx.fillStyle = p > .8 ? "rgba(255,255,255," + p + ")" : "rgba(190,140,255," + p + ")";
        ctx.fillText(rg(), x, y);
      }
      if (k < 1) setTimeout(frame, 16);
      else { o.classList.add("black"); setTimeout(function () { cv.remove(); cb(); }, 120); }
    })();
  }
  // "?" в "/ конец...? /" становится кнопкой: по нажатию появляется строка для ключа из Морзе
  function endQuestion() {
    var et = $("endtext");
    et.innerHTML = '/ конец...<button type="button" id="endq" class="endq">?</button> /';
    $("endq").addEventListener("click", function () {
      if ($("endinput")) { $("endinput").focus(); return; }
      var wrap = document.createElement("div"); wrap.className = "endwrap";
      wrap.innerHTML = '<input id="endinput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ключ">' +
                       '<button type="button" id="endgo" class="endgo">ввод ⏎</button>';
      et.parentNode.appendChild(wrap);
      var inp = $("endinput"); inp.focus();
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") submitKey(); });
      $("endgo").addEventListener("click", submitKey);
      function submitKey() {
        if (inp.disabled || !inp.value.trim()) return;
        var v = inp.value; inp.disabled = true; $("endgo").disabled = true;
        (window.DevTerm ? DevTerm.wake(v) : Promise.resolve(false)).then(function (ok) {
          if (ok) { wrap.remove(); return; }
          inp.disabled = false; $("endgo").disabled = false; inp.value = ""; inp.placeholder = "не тот ключ";
          wrap.classList.remove("deny"); void wrap.offsetWidth; wrap.classList.add("deny"); inp.focus();
        });
      }
    });
  }
  function theEnd() {
    dead = true;
    var o = document.createElement("div");
    o.id = "theend";
    o.innerHTML = '<pre id="skullart"></pre><div id="endtext"></div>';
    document.body.appendChild(o);
    codeWave(o, function () {
      decodeArt($("skullart"), 600, function () {
        // череп продолжает "переливаться": часть символов каждый кадр подменяется мусором
        var el = $("skullart"), base = el.textContent;
        var shimmer = setInterval(function () {
          var a = base.split("");
          for (var i = 0; i < a.length; i++) if (a[i] > " " && Math.random() < .06) a[i] = rg();
          el.textContent = a.join("");
        }, 70);
        setTimeout(function () { clearInterval(shimmer); }, 3600);
        setTimeout(function () { o.classList.add("skullout"); }, 2500);
        setTimeout(function () { typeLines($("endtext"), ["/ конец...? /"], endQuestion); }, 3700);
      });
    });
  }

  // интерактивный диалог: Q.chat = {intro, steps:[{q, opts:[[ответ, [реплики]]]}], ask, final, me}
  var chatStarted = false;
  function chat() {
    var box = $("chat"), C = Q.chat;
    if (!box || chatStarted || !C) return;
    chatStarted = true;
    // слабые глюки по уже напечатанным репликам: пара символов на миг подменяется мусором, строка чуть дрожит
    loop(function () {
      var done = [].filter.call(box.querySelectorAll(".chat-line"), function (l) { return l._done; });
      var l = done[rnd(0, done.length) | 0];
      if (!l || l._g) return;
      var tn = l.lastChild;
      while (tn && tn.nodeType !== 3) tn = tn.previousSibling;
      if (!tn || tn.data.length < 4) return;
      l._g = 1;
      var orig = tn.data, a = orig.split(""), n = 1 + (Math.random() * 3 | 0);
      while (n--) { var i = rnd(0, a.length) | 0; if (a[i] !== " " && a[i] !== "\n") a[i] = rg(); }
      tn.data = a.join("");
      l.classList.add("chat-glitch");
      setTimeout(function () { tn.data = orig; l.classList.remove("chat-glitch"); l._g = 0; }, rnd(80, 170));
    }, 900, 2600);
    function scroll(el) { if (el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    // реплика собеседника (имя мельтешит символами), печатается с эффектом
    function say(text, cb) {
      var line = document.createElement("div");
      line.className = "chat-line chat-b";
      box.appendChild(line); scroll(line);
      typeLines(line, ["\u0001: " + text], function () {
        var c = line.querySelector(".cur"); if (c) c.remove();
        line._done = true;
        setTimeout(cb, rnd(500, 1000));
      });
    }
    function sayAll(lines, cb) {
      var k = 0;
      (function n() { if (k >= lines.length) return cb && cb(); say(lines[k++], n); })();
    }
    // варианты ответа кнопками (можно и цифрами 1-3)
    function ask(options, cb) {
      var wrap = document.createElement("div");
      wrap.className = "chat-opts";
      function pick(idx) {
        document.removeEventListener("keydown", onKey);
        wrap.remove();
        var me = document.createElement("div");
        me.className = "chat-line chat-me";
        box.appendChild(me); scroll(me);
        // её ответ тоже печатается с мельканием символов
        typeLines(me, [(C.me || "ТЫ") + ": " + options[idx][0]], function () {
          var c = me.querySelector(".cur"); if (c) c.remove();
          me._done = true;
          setTimeout(function () { cb(idx); }, rnd(500, 900));
        });
      }
      function onKey(e) { var n = parseInt(e.key, 10); if (n >= 1 && n <= options.length) pick(n - 1); }
      options.forEach(function (o, idx) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "chat-opt";
        b.textContent = "[" + (idx + 1) + "] " + o[0];
        b.addEventListener("click", function () { pick(idx); });
        wrap.appendChild(b);
      });
      box.appendChild(wrap); scroll(wrap);
      document.addEventListener("keydown", onKey);
    }
    function end() {
      var e = document.createElement("div");
      e.className = "chat-line chat-end"; e.innerHTML = '> <span class="cur"></span>';
      box.appendChild(e);
      setTimeout(theEnd, 3000);
    }
    var si = 0;
    function step() {
      if (si >= C.steps.length) {
        return ask([[C.ask, C.final]], function () { sayAll(C.final, end); });
      }
      var s = C.steps[si++];
      say(s.q, function () {
        ask(s.opts, function (idx) { sayAll(s.opts[idx][1], step); });
      });
    }
    sayAll(C.intro, step);
  }

  // ---------- состояние "взломано" (общее для страниц) ----------
  // instant: страница открыта уже после взлома, без анимации
  function infect(instant, since) {
    document.body.classList.add("infected");
    scrambleHex(instant);
    if (!instant) blips();
    horror();
    if (store(REV)) revealRow();
    if ($("cmdbar")) $("cmdbar").style.display = "flex";
    setTimeout(chat, instant ? 1200 : 2500);
    (Q.bell || []).forEach(function (m) {
      var wait = m[0] * 1000 - (since || 0);
      if (wait <= 0) bellPost(m[1]);
      else setTimeout(function () { bellPost(m[1]); }, wait);
    });
  }

  // ---------- сам взлом ----------
  function hack() {
    if (hacked) return; hacked = true;
    document.body.classList.add("glitching");
    var hk = document.createElement("div");
    hk.id = "hk"; document.body.appendChild(hk);
    setTimeout(function () {
      document.body.classList.remove("glitching");
      typeLines(hk, [
        "> соединение с сервером ......... ПОТЕРЯНО",
        "> внешний узел подключён к сессии",
        "> учётная запись студента скомпрометирована",
        "> данные успеваемости перезаписаны",
        "> к серверу подключился: \u0001"
      ], function () {
        setTimeout(function () {
          hk.classList.add("out");
          store(STORE, String(Date.now()));
          setTimeout(function () { hk.remove(); }, 1000);
          setTimeout(function () { infect(false, -1200); }, 1000);
        }, 900);
      });
    }, 1300);
  }

  var at = parseInt(store(STORE), 10);
  if (at) infect(true, Date.now() - at);          // уже взломано раньше (другая страница или перезагрузка)
  else if ($("cmdbar")) setTimeout(hack, Q.delay || 3000);   // взлом запускается только на главной

  // ---------- проверка ключа ----------
  function b64(s) { var a = atob(s), u = new Uint8Array(a.length); for (var i = 0; i < a.length; i++) u[i] = a.charCodeAt(i); return u; }
  function decrypt(key) {
    var raw = b64(Q.payload), enc = new TextEncoder();
    var salt = raw.slice(0, 16), iv = raw.slice(16, 28), ct = raw.slice(28);
    return crypto.subtle.importKey("raw", enc.encode(key), "PBKDF2", false, ["deriveKey"]).then(function (km) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, km,
        { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, k, ct); })
      .then(function (buf) { return new TextDecoder().decode(buf); });
  }
  var busy = false, cmd = $("cmd");
  function submit() {
    var inp = cmd;
    if (!inp || busy) return;
    var v = inp.value.trim().toUpperCase();
    if (!v) return;
    if (!window.crypto || !crypto.subtle) { alert("Открой страницу по https или локально (нужен WebCrypto)."); return; }
    busy = true;
    decrypt(v).then(function (txt) {
      inp.disabled = true; inp.value = "";
      var go = $("cmd-go"); if (go) go.disabled = true;
      var out = $("cmdout"); out.style.display = "block";
      typeLines(out, txt.split("\n"));
    }).catch(function () {
      var bar = $("cmdbar"); bar.classList.remove("deny"); void bar.offsetWidth; bar.classList.add("deny");
      inp.value = ""; inp.placeholder = "ДОСТУП ЗАПРЕЩЁН";
      setTimeout(function () { inp.placeholder = "слово-ключ"; }, 1600);
    }).then(function () { busy = false; });
  }
  if (cmd) cmd.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  if ($("cmd-go")) $("cmd-go").addEventListener("click", submit);
})();
