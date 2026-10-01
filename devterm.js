// Терминал разработчика (этап 4). Содержимое зашифровано фразой из азбуки Морзе.
(function () {
  var Q = window.QUEST || {};
  var KEY_STORE = "quest_dev_key", LOCK_STORE = "quest_dev_locks";
  var GL = "█▓▒░#@$%&01ABCDEF<>/\\|=+*";
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function b64(s) { var a = atob(s), u = new Uint8Array(a.length); for (var i = 0; i < a.length; i++) u[i] = a.charCodeAt(i); return u; }
  function normPhrase(p) { return (p || "").toUpperCase().replace(/Ё/g, "Е").replace(/[^A-ZА-Я0-9]/g, ""); }
  function normAns(a) { return (a || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]/g, ""); }
  function sha(x) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(x)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
    });
  }
  function tryWrap(wrap, phrase) {
    var raw = b64(wrap), salt = raw.slice(0, 16), iv = raw.slice(16, 28), ct = raw.slice(28);
    return crypto.subtle.importKey("raw", new TextEncoder().encode(phrase), "PBKDF2", false, ["deriveKey"]).then(function (km) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, k, ct); });
  }
  function openData(phrase) {
    var wraps = (Q.dev && Q.dev.wraps) || [], i = 0;
    function next() {
      if (i >= wraps.length) return Promise.reject("bad");
      return tryWrap(wraps[i++], phrase).catch(next);
    }
    return next().then(function (master) {
      var raw = b64(Q.dev.blob), iv = raw.slice(0, 12), ct = raw.slice(12);
      return crypto.subtle.importKey("raw", master, "AES-GCM", false, ["decrypt"]).then(function (k) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, k, ct);
      });
    }).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }

  // ---------------- терминал ----------------
  var D, root, out, inp, promptEl, cwd = ["home", "admin"], hist = [], hi = 0, mode = null, opened = {}, fails = {};
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function scrollDown() { out.scrollTop = out.scrollHeight; }
  function print(lines, cls, delay) {
    lines = [].concat(lines);
    if (!delay) { lines.forEach(function (l) { out.appendChild(el("div", "dt-line " + (cls || ""), l === "" ? " " : l)); }); scrollDown(); return Promise.resolve(); }
    return new Promise(function (res) {
      var i = 0;
      (function step() {
        if (i >= lines.length) return res();
        out.appendChild(el("div", "dt-line " + (cls || ""), lines[i] === "" ? " " : lines[i])); i++; scrollDown();
        setTimeout(step, delay);
      })();
    });
  }
  function glitchType(text, cls) {          // строка с мельканием символов
    var line = el("div", "dt-line " + (cls || "")); out.appendChild(line);
    return new Promise(function (res) {
      var p = 0, W = 4;
      (function step() {
        var fr = Math.max(0, p - W), s = text.slice(0, fr);
        for (var k = fr; k < Math.min(p, text.length); k++) s += text[k] === " " ? " " : GL[Math.random() * GL.length | 0];
        line.textContent = s || " "; scrollDown();
        if (p++ <= text.length + W) setTimeout(step, 28); else { line.textContent = text || " "; res(); }
      })();
    });
  }
  function pathStr() { var p = "/" + cwd.join("/"); return p.replace(/^\/home\/admin/, "~") || "/"; }
  function setPrompt() { promptEl.textContent = mode ? mode.prompt : ("guest@node-7:" + pathStr() + "$"); }
  function resolve(p) {
    var parts = (p || "").split("/"), stack = (p || "").charAt(0) === "/" ? [] : cwd.slice();
    if (p === "~" || (p || "").indexOf("~/") === 0) { stack = ["home", "admin"]; parts = p.slice(2).split("/"); }
    parts.forEach(function (x) { if (!x || x === "." || x === "~") return; if (x === "..") stack.pop(); else stack.push(x); });
    var node = D.fs;
    for (var i = 0; i < stack.length; i++) { if (!node || typeof node !== "object" || Array.isArray(node) || !(stack[i] in node)) return null; node = node[stack[i]]; }
    return { node: node, path: stack };
  }
  function findLock(name) {
    name = (name || "").toLowerCase().replace(/\.lock$/, "");
    for (var i = 0; i < D.locks.length; i++) if (D.locks[i].names.map(function (n) { return n.toLowerCase(); }).indexOf(name) >= 0) return D.locks[i];
    return null;
  }
  function saveLocks() { ls(LOCK_STORE, JSON.stringify(opened)); }

  var CMD = {
    help: function () {
      return print(["доступные команды:",
        "  ls [-a] [путь]   что здесь лежит",
        "  cd <путь>        перейти в папку",
        "  cat <файл>       прочитать файл",
        "  mail [номер]     почта администратора",
        "  locks            замки на двери",
        "  unlock <замок>   попробовать открыть замок",
        "  hint <замок>     подсказка (после неверного ответа)",
        "  door             дверь",
        "  whoami  pwd  date  history  clear"]);
    },
    ls: function (a) {
      var all = a.indexOf("-a") >= 0, target = a.filter(function (x) { return x !== "-a"; })[0];
      var r = resolve(target || "."); if (!r) return print("ls: нет такого пути: " + target, "dt-err");
      if (Array.isArray(r.node)) return print(target);
      var names = Object.keys(r.node).filter(function (n) { return all || n.charAt(0) !== "."; }).map(function (n) { return Array.isArray(r.node[n]) ? n : n + "/"; });
      if (all) names = ["./", "../"].concat(names);
      return print(names.length ? names.join("    ") : "(пусто)", "dt-ls");
    },
    cd: function (a) {
      var r = resolve(a[0] || "~"); if (!r || Array.isArray(r.node)) return print("cd: нет такой папки: " + (a[0] || ""), "dt-err");
      cwd = r.path; return Promise.resolve();
    },
    pwd: function () { return print("/" + cwd.join("/")); },
    cat: function (a) {
      if (!a[0]) return print("cat: укажи файл", "dt-err");
      var r = resolve(a[0]); if (!r) return print("cat: нет такого файла: " + a[0], "dt-err");
      if (!Array.isArray(r.node)) return print("cat: " + a[0] + ": это папка", "dt-err");
      return print(r.node, "dt-file", 35);
    },
    whoami: function () { return print(["guest", "…но сессия — администратора. Странно, правда?"]); },
    date: function () { return print(new Date().toString().replace(/GMT.*/, "") + " (часы на node-7 давно сломаны)"); },
    history: function () { return print(hist.map(function (h, i) { return "  " + (i + 1) + "  " + h; })); },
    clear: function () { out.innerHTML = ""; return Promise.resolve(); },
    mail: function (a) {
      if (!a[0]) return print(["входящие:"].concat(D.mail.map(function (m, i) { return "  " + (i + 1) + ". от " + m.from + " — «" + m.subj + "»"; }), ["", "прочитать: mail <номер>"]));
      var m = D.mail[parseInt(a[0], 10) - 1]; if (!m) return print("mail: нет письма с таким номером", "dt-err");
      return print(["от: " + m.from, "тема: " + m.subj, "—"].concat(m.body), "dt-file", 60);
    },
    locks: function () {
      var n = 0, lines = D.locks.map(function (L) { var o = !!opened[L.id]; if (o) n++; return "  " + L.id + "   " + (o ? "ОТКРЫТ   фрагмент " + L.id + " = " + L.digit : "закрыт"); });
      return print(["замки на двери (" + n + "/" + D.locks.length + "):"].concat(lines, n < D.locks.length ? ["", "открыть: unlock <замок>   например: unlock δ"] : ["", "все замки открыты. дверь: door"]));
    },
    unlock: function (a) {
      var L = findLock(a[0]);
      if (!L) return print(a[0] ? "unlock: нет такого замка: " + a[0] : "unlock: какой замок? (δ ε ζ η)", "dt-err");
      if (opened[L.id]) return print("замок " + L.id + " уже открыт. фрагмент " + L.id + " = " + L.digit);
      return print(["ЗАМОК " + L.id, ""]).then(function () { return glitchType(L.q, "dt-q"); }).then(function () {
        mode = { prompt: "ответ>", lock: L }; setPrompt();
      });
    },
    hint: function (a) {
      var L = findLock(a[0]); if (!L) return print("hint: для какого замка? (δ ε ζ η)", "dt-err");
      if (!fails[L.id]) return print("hint: сначала попробуй ответить сама.", "dt-err");
      return print("подсказка " + L.id + ": " + L.hint, "dt-q");
    },
    door: function () {
      var n = D.locks.filter(function (L) { return opened[L.id]; }).length;
      if (n < D.locks.length) return print(["дверь закрыта. замков открыто: " + n + "/" + D.locks.length + ".", "команда locks покажет, какие остались."]);
      return print(["все четыре замка открыты.", "введи всё, что собрала, по порядку: α β γ δ ε ζ η"]).then(function () { mode = { prompt: "код>", door: true }; setPrompt(); });
    },
    sudo: function () { return print("sudo: ты не в списке sudoers. Об этом будет доложено.", "dt-err"); },
    rm: function () { return print("rm: не сегодня.", "dt-err"); },
    exit: function () { return print("отсюда так просто не выйти."); },
    logout: function () { return print("отсюда так просто не выйти."); },
    echo: function (a) { return print(a.join(" ")); },
    uname: function () { return print("node-7 0.9.13-dev #1 SMP ▒▒▒ x86_64 GNU/Linux"); },
    ping: function () { return print(["PING объект: 64 bytes from ОБЪЕКТ: icmp_seq=1 time=0.1 ms", "она ближе, чем кажется."]); },
    whois: function () { return print("whois: имя администратора скрыто. попробуй найти иначе."); },
    tree: function () {
      var lines = [];
      (function walk(node, pre) {
        Object.keys(node).filter(function (n) { return n.charAt(0) !== "."; }).forEach(function (n) {
          lines.push(pre + (Array.isArray(node[n]) ? n : n + "/")); if (!Array.isArray(node[n])) walk(node[n], pre + "  ");
        });
      })(resolve(".").node, "");
      return print(lines);
    },
  };
  CMD.dir = CMD.ls; CMD.type = CMD.cat; CMD["?"] = CMD.help; CMD.man = CMD.help;

  function answer(text) {
    if (mode.lock) {
      var L = mode.lock; mode = null; setPrompt();
      return sha("attempt:" + normAns(text)).then(function (h) {
        if (L.hashes.indexOf(h) >= 0) {
          opened[L.id] = true; saveLocks();
          root.classList.add("dt-flash"); setTimeout(function () { root.classList.remove("dt-flash"); }, 400);
          return glitchType("ЗАМОК " + L.id + " ОТКРЫТ.  фрагмент " + L.id + " = " + L.digit, "dt-ok");
        }
        fails[L.id] = (fails[L.id] || 0) + 1;
        root.classList.add("dt-deny"); setTimeout(function () { root.classList.remove("dt-deny"); }, 400);
        return print(["ACCESS DENIED", "попробуй ещё раз: unlock " + L.id + (fails[L.id] >= 1 ? "   ·   или: hint " + L.id : "")], "dt-err");
      });
    }
    if (mode.door) {
      mode = null; setPrompt();
      return sha("door:" + text.replace(/\D/g, "")).then(function (h) {
        if (h !== D.door) return print(["не тот порядок. или не всё.", "α β γ — до терминала. δ ε ζ η — здесь."], "dt-err");
        return finale();
      });
    }
  }
  function finale() {
    inp.disabled = true; root.classList.add("dt-final");
    return new Promise(function (r) { setTimeout(r, 900); }).then(function () {
      out.innerHTML = "";
      var chain = Promise.resolve();
      D.final.forEach(function (l) { chain = chain.then(function () { return glitchType(l, "dt-final-line"); }).then(function () { return new Promise(function (r) { setTimeout(r, 350); }); }); });
      return chain;
    });
  }
  function run(line) {
    var t = line.trim(); out.appendChild(el("div", "dt-line dt-cmd", promptEl.textContent + " " + line)); scrollDown();
    if (mode) return answer(t);
    if (!t) return Promise.resolve();
    hist.push(t); hi = hist.length;
    if (/^rm\s+-rf/.test(t)) return CMD.rm([]);
    var parts = t.split(/\s+/), c = parts[0].toLowerCase(), a = parts.slice(1);
    if (CMD[c]) return CMD[c](a);
    return print(c + ": команда не найдена. help — список команд.", "dt-err");
  }

  function build() {
    root = el("div"); root.id = "devterm";
    var bar = el("div", "dt-bar"); bar.innerHTML = "<span>ADMIN · dev build 0.9.13</span><span class='dt-rec'>● node-7</span>";
    out = el("div", "dt-out");
    var row = el("div", "dt-row"); promptEl = el("span", "dt-prompt");
    inp = el("input"); inp.type = "text"; inp.autocomplete = "off"; inp.setAttribute("autocapitalize", "off"); inp.spellcheck = false; inp.className = "dt-in";
    var go = el("button", "dt-go", "⏎"); go.type = "button";
    row.appendChild(promptEl); row.appendChild(inp); row.appendChild(go);
    root.appendChild(bar); root.appendChild(out); root.appendChild(row);
    document.body.appendChild(root);
    var busy = false;
    function submit() {
      if (busy || inp.disabled) return; var v = inp.value; inp.value = ""; busy = true;
      Promise.resolve(run(v)).then(function () { busy = false; setPrompt(); inp.focus(); });
    }
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
      else if (e.key === "ArrowUp" && hist.length) { hi = Math.max(0, hi - 1); inp.value = hist[hi] || ""; e.preventDefault(); }
      else if (e.key === "ArrowDown" && hist.length) { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; e.preventDefault(); }
    });
    go.addEventListener("click", submit);
    out.addEventListener("click", function () { inp.focus(); });
    setPrompt();
  }
  // волна кода от центра: символы ярче у фронта волны, за волной - чернота
  function codeWave(cb) {
    var cv = document.createElement("canvas"); cv.className = "dt-wave"; document.body.appendChild(cv);
    var W = cv.width = innerWidth || 800, H = cv.height = innerHeight || 600, ctx = cv.getContext("2d");
    var cell = W < 600 ? 12 : 14, cx = W / 2, cy = H / 2, maxR = Math.sqrt(cx * cx + cy * cy) + 80, band = W < 600 ? 60 : 90, dur = 1100, t0 = Date.now();
    ctx.font = "700 " + (cell - 2) + "px Consolas, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (function frame() {
      var k = Math.min(1, (Date.now() - t0) / dur), r = maxR * (1 - Math.pow(1 - k, 2));
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r - band * .5), 0, Math.PI * 2); ctx.fill();
      for (var y = cell / 2; y < H; y += cell) for (var x = cell / 2; x < W; x += cell) {
        var dd = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        var p = Math.max(1 - Math.abs(dd - r) / band, .45 * (1 - Math.abs(dd - r * .62) / band));
        if (p <= 0) continue;
        ctx.fillStyle = p > .8 ? "rgba(255,255,255," + p + ")" : "rgba(190,140,255," + p + ")";
        ctx.fillText(GL[Math.random() * GL.length | 0], x, y);
      }
      if (k < 1) setTimeout(frame, 16); else { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); setTimeout(function () { cb(); setTimeout(function () { cv.remove(); }, 700); }, 80); }
    })();
  }
  function start(data, fast) {
    D = data; try { opened = JSON.parse(ls(LOCK_STORE) || "{}") || {}; } catch (e) { opened = {}; }
    if (fast) {
      build();
      print(["ADMIN · dev build 0.9.13 · node-7", "сессия восстановлена. help — список команд."], "dt-boot").then(function () { inp.focus(); });
      return;
    }
    codeWave(function () {
      build(); root.classList.add("dt-open");                  // включение, как у старого монитора
      setTimeout(function () {
        root.classList.remove("dt-open");
        var chain = Promise.resolve();
        data.boot.forEach(function (l) { chain = chain.then(function () { return glitchType(l, "dt-boot"); }); });
        chain.then(function () { inp.focus(); });
      }, 650);
    });
  }

  window.DevTerm = {
    // вызывается с экрана "/ конец...? /"
    wake: function (phrase) {
      var p = normPhrase(phrase);
      if (!p || !window.crypto || !crypto.subtle) return Promise.resolve(false);
      return openData(p).then(function (data) {
        ls(KEY_STORE, p);
        try { history.replaceState(null, "", "#dev"); } catch (e) { location.hash = "dev"; }
        start(data, false); return true;
      }).catch(function () { return false; });
    },
    shouldResume: function () { return location.hash === "#dev" && !!ls(KEY_STORE); },
    resume: function () {
      document.body.style.background = "#000";
      return openData(ls(KEY_STORE)).then(function (data) { start(data, true); }).catch(function () { ls(KEY_STORE, null); location.hash = ""; location.reload(); });
    },
  };
})();
