/* =========================================================
   NOURIA · Dojo du calcul mental (CM2)
   Vanilla JS, sans dépendance. Fonctionne hors-ligne.
   6 familles de calcul, mode Entraînement (avec astuces) et
   Défi chrono (score, combos), ceintures de progression.
   ========================================================= */
(function () {
  "use strict";
  var app = document.getElementById("app");

  /* ---------- Sauvegarde ---------- */
  var KEY = "nouria_dojo_v1";
  var save = { xp: 0, best: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) save = Object.assign(save, JSON.parse(raw)); } catch (e) {}
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- Utilitaires ---------- */
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function clear() { app.innerHTML = ""; }
  function fmt(n) {
    // arrondi propre puis virgule française
    var r = Math.round(n * 1000) / 1000;
    return String(r).replace(".", ",");
  }
  function eq(a, b) { return Math.abs(a - b) < 1e-6; }

  /* ---------- Ceintures ---------- */
  var BELTS = [
    { name: "Blanche", color: "#f4f5ff", xp: 0 },
    { name: "Jaune",   color: "#ffd166", xp: 30 },
    { name: "Orange",  color: "#ff9f45", xp: 80 },
    { name: "Verte",   color: "#7ef0a2", xp: 160 },
    { name: "Bleue",   color: "#39d0ff", xp: 280 },
    { name: "Marron",  color: "#b5651d", xp: 450 },
    { name: "Noire",   color: "#20233f", xp: 700 }
  ];
  function beltFor(xp) { var b = BELTS[0]; for (var i = 0; i < BELTS.length; i++) if (xp >= BELTS[i].xp) b = BELTS[i]; return b; }
  function nextBelt(xp) { for (var i = 0; i < BELTS.length; i++) if (xp < BELTS[i].xp) return BELTS[i]; return null; }

  /* =========================================================
     LES 6 FAMILLES DE CALCUL
     chaque gen(d) renvoie { q, a, tip }  (d = difficulté 1..3)
     ========================================================= */
  var CATS = {
    tables: {
      name: "Tables ×", emoji: "✖️", desc: "Multiplications de mémoire",
      gen: function (d) {
        var a, b;
        if (d === 1) { a = rnd(2, 9); b = rnd(2, 9); }
        else if (d === 2) { a = rnd(2, 12); b = rnd(2, 12); }
        else { a = rnd(2, 12); b = rnd(11, 25); }
        var tip;
        if (a === 9 || b === 9) tip = "Multiplier par 9 : fais ×10 puis enlève le nombre. Ex. 9×7 = 70 − 7 = 63.";
        else if (a === 11 || b === 11) tip = "×11 (nombre < 10) : écris le chiffre deux fois. 11×6 = 66.";
        else if (a >= 11 || b >= 11) { var big = Math.max(a, b), sm = Math.min(a, b); tip = "Décompose : " + big + "×" + sm + " = (" + big + "×10) + (" + big + "×" + (sm - 10 >= 0 ? sm - 10 : sm) + ")… découpe le plus grand en dizaines + unités."; }
        else tip = "Une table oubliée ? Repars d'une voisine : 7×8 = 7×7 + 7 = 49 + 7 = 56.";
        return { q: a + " × " + b, a: a * b, tip: tip };
      }
    },
    complements: {
      name: "Compléments", emoji: "🧩", desc: "Ce qu'il manque pour 10, 100, 1000",
      gen: function (d) {
        var base = d === 1 ? 10 : d === 2 ? 100 : 1000;
        var x;
        if (base === 10) x = rnd(1, 9);
        else if (base === 100) x = rnd(1, 99);
        else x = rnd(1, 999);
        var tip = "Complément à " + base + " : complète les unités pour aller à la dizaine, puis les dizaines… " +
          "Ex. 100 − 63 → 63 + 7 = 70, + 30 = 100, donc 37.";
        return { q: x + " + ⬜ = " + base, a: base - x, tip: tip };
      }
    },
    pow10: {
      name: "×10, ×100…", emoji: "🔟", desc: "Multiplier par 10, 100, 1000",
      gen: function (d) {
        var mult = d === 1 ? 10 : pick(d === 2 ? [10, 100] : [100, 1000]);
        var n;
        if (d < 3) { n = rnd(2, 99); return { q: n + " × " + mult, a: n * mult, tip: "×" + mult + " : le nombre garde sa valeur, on décale les chiffres et on ajoute " + String(mult).slice(1) + ". Ce ne sont PAS des zéros « collés » par hasard : chaque chiffre monte d'un rang." }; }
        // décimal × 100/1000
        n = rnd(11, 999) / 10; // un chiffre après la virgule
        var rangs = mult === 100 ? "deux rangs" : "trois rangs";
        return { q: fmt(n) + " × " + mult, a: n * mult, tip: "Pour ×" + mult + ", la virgule se décale de " + rangs + " vers la droite. " + fmt(n) + " × " + mult + " = " + fmt(n * mult) + "." };
      }
    },
    doubles: {
      name: "Doubles & moitiés", emoji: "➗", desc: "Doubler, prendre la moitié",
      gen: function (d) {
        var half = Math.random() < 0.5;
        var n;
        if (d === 1) n = rnd(2, 50); else if (d === 2) n = rnd(20, 250); else n = rnd(100, 900);
        if (half) {
          n = n - (n % 2); if (n < 2) n = 2;             // moitié entière
          return { q: "Moitié de " + n, a: n / 2, tip: "Moitié = ÷2. Coupe en dizaines : moitié de 68 = moitié de 60 (30) + moitié de 8 (4) = 34." };
        }
        return { q: "Double de " + n, a: n * 2, tip: "Double = ×2. Double de 47 = double de 40 (80) + double de 7 (14) = 94." };
      }
    },
    rapide: {
      name: "Calcul rapide", emoji: "⚡", desc: "Additions & soustractions malines",
      gen: function (d) {
        var add = Math.random() < 0.5, a, b;
        if (d === 1) { a = rnd(11, 89); b = rnd(11, 89); }
        else if (d === 2) { a = rnd(100, 500); b = rnd(20, 199); }
        else { a = rnd(200, 900); b = rnd(100, 400); }
        if (!add && b > a) { var t = a; a = b; b = t; } // pas de négatif
        if (add) return { q: a + " + " + b, a: a + b, tip: "Arrondis puis ajuste : " + a + " + " + b + " → arrondis " + b + " à la dizaine du dessus, additionne, puis enlève ce que tu as ajouté." };
        return { q: a + " − " + b, a: a - b, tip: "Soustraire malin : arrondis le nombre à enlever. 342 − 98 = 342 − 100 + 2 = 244." };
      }
    },
    decimaux: {
      name: "Décimaux", emoji: "🔢", desc: "Additions et compléments à virgule",
      gen: function (d) {
        var kind = d === 1 ? "add" : pick(["add", "comp"]);
        if (kind === "comp") {
          var x = rnd(1, 9) / 10;             // 0,1 .. 0,9
          return { q: fmt(x) + " + ⬜ = 1", a: 1 - x, tip: "Complément à 1 : les dixièmes doivent faire 10. 0,3 + 0,7 = 1." };
        }
        var a, b;
        if (d === 1) { a = rnd(1, 9) / 10; b = rnd(1, 9) / 10; }
        else if (d === 2) { a = rnd(5, 95) / 10; b = rnd(5, 95) / 10; }
        else { a = rnd(50, 995) / 100; b = rnd(50, 995) / 100; }
        return { q: fmt(a) + " + " + fmt(b), a: a + b, tip: "Aligne les virgules. Additionne d'abord les parties entières, puis les décimales : 2,5 + 1,7 = (2+1) + (0,5+0,7) = 3 + 1,2 = 4,2." };
      }
    }
  };
  var CAT_ORDER = ["tables", "complements", "pow10", "doubles", "rapide", "decimaux"];

  /* =========================================================
     ÉCRAN : ACCUEIL
     ========================================================= */
  function screenHome() {
    clear();
    var bar = el("div", "bar");
    var back = el("a", "iconbtn"); back.href = "../"; back.textContent = "← Accueil";
    var belt = beltFor(save.xp);
    var pill = el("div", "belt-pill");
    var dot = el("span", "belt-dot"); dot.style.background = belt.color;
    pill.appendChild(dot);
    pill.appendChild(el("span", null, "Ceinture " + belt.name));
    bar.appendChild(back); bar.appendChild(pill);
    app.appendChild(bar);

    var stage = el("div", "stage");
    var hero = el("div", "hero");
    hero.appendChild(el("div", "logo", "🥋"));
    hero.appendChild(el("h1", null, "Dojo du calcul mental"));
    hero.appendChild(el("p", null, "Salut Nouria ! Entraîne ta tête à calculer vite et juste. Choisis une famille de calcul."));
    stage.appendChild(hero);

    // carte ceinture + XP
    var nb = nextBelt(save.xp), belt2 = beltFor(save.xp);
    var card = el("div", "belt-card");
    var bb = el("div", "big-belt"); bb.style.background = belt2.color; card.appendChild(bb);
    var info = el("div", "info");
    info.appendChild(el("b", null, "Ceinture " + belt2.name));
    var xpTxt = nb ? (save.xp + " XP · encore " + (nb.xp - save.xp) + " pour la ceinture " + nb.name)
                   : (save.xp + " XP · ceinture maximale atteinte 🎉");
    info.appendChild(el("div", "xp", xpTxt));
    var bar2 = el("div", "xpbar"); var fill = el("i");
    var prev = belt2.xp, span = nb ? (nb.xp - prev) : 1, prog = nb ? (save.xp - prev) / span : 1;
    fill.style.width = Math.max(4, Math.min(100, prog * 100)) + "%"; bar2.appendChild(fill);
    info.appendChild(bar2);
    card.appendChild(info);
    stage.appendChild(card);

    stage.appendChild(el("div", "section-title", "Familles de calcul"));
    var grid = el("div", "grid");
    CAT_ORDER.forEach(function (id) {
      var c = CATS[id];
      var b = el("button", "cat");
      b.appendChild(el("div", "ce", c.emoji));
      b.appendChild(el("b", null, c.name));
      b.appendChild(el("span", null, c.desc));
      var best = save.best[id];
      if (best) b.appendChild(el("div", "best", "🏅 Record : " + best + " pts"));
      b.addEventListener("click", function () { screenSetup(id); });
      grid.appendChild(b);
    });
    stage.appendChild(grid);
    app.appendChild(stage);
  }

  /* =========================================================
     ÉCRAN : CHOIX MODE + DIFFICULTÉ
     ========================================================= */
  var chosenDiff = 2;
  function screenSetup(catId) {
    clear();
    var c = CATS[catId];
    var bar = el("div", "bar");
    var back = el("button", "iconbtn"); back.textContent = "←"; back.addEventListener("click", screenHome);
    bar.appendChild(back);
    bar.appendChild(el("div", "belt-pill", c.emoji + "  " + c.name));
    app.appendChild(bar);

    var stage = el("div", "stage");
    var wrap = el("div", "modewrap");

    wrap.appendChild(el("div", "section-title", "Difficulté"));
    var seg = el("div", "seg");
    [["1", "Facile"], ["2", "Moyen"], ["3", "Costaud"]].forEach(function (p) {
      var b = el("button", null, p[1]);
      if (+p[0] === chosenDiff) b.classList.add("active");
      b.addEventListener("click", function () { chosenDiff = +p[0]; seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); });
      seg.appendChild(b);
    });
    wrap.appendChild(seg);

    wrap.appendChild(el("div", "section-title", "Mode"));
    var t = el("button", "opt");
    t.innerHTML = "<span class='oe'>🎯</span><span><b>Entraînement</b><small>Sans chrono. Une astuce s'affiche à chaque calcul.</small></span>";
    t.addEventListener("click", function () { startGame(catId, "train"); });
    wrap.appendChild(t);

    var ch = el("button", "opt");
    ch.innerHTML = "<span class='oe'>⏱️</span><span><b>Défi chrono</b><small>90 secondes. Enchaîne les bonnes réponses pour un gros combo !</small></span>";
    ch.addEventListener("click", function () { startGame(catId, "chrono"); });
    wrap.appendChild(ch);

    stage.appendChild(wrap);
    app.appendChild(stage);
  }

  /* =========================================================
     JEU
     ========================================================= */
  var game = null;
  function startGame(catId, mode) {
    game = {
      catId: catId, mode: mode, diff: chosenDiff,
      score: 0, correct: 0, wrong: 0, combo: 0, maxCombo: 0,
      input: "", cur: null, over: false,
      timeLeft: 90, timer: null, locked: false
    };
    renderPlay();
    nextQuestion();
    if (mode === "chrono") startTimer();
  }

  function startTimer() {
    var TOTAL = 90;
    game.timeLeft = TOTAL;
    var barI = document.getElementById("timeFill");
    game.timer = setInterval(function () {
      game.timeLeft -= 0.25;
      if (barI) barI.style.width = Math.max(0, (game.timeLeft / TOTAL) * 100) + "%";
      var tc = document.getElementById("timeChip");
      if (tc) tc.textContent = Math.max(0, Math.ceil(game.timeLeft)) + "s";
      if (game.timeLeft <= 0) endGame();
    }, 250);
  }

  function renderPlay() {
    clear();
    var bar = el("div", "bar");
    var quit = el("button", "iconbtn"); quit.textContent = game.mode === "chrono" ? "✕ Arrêter" : "✕ Terminer";
    quit.addEventListener("click", endGame);
    bar.appendChild(quit);
    bar.appendChild(el("div", "belt-pill", CATS[game.catId].emoji + "  " + CATS[game.catId].name));
    app.appendChild(bar);

    var stage = el("div", "stage");

    var top = el("div", "play-top");
    var s = el("div", "chip"); s.id = "scoreChip"; s.innerHTML = "<span class='lab'>SCORE</span>0";
    var cb = el("div", "chip combo"); cb.id = "comboChip"; cb.innerHTML = "<span class='lab'>COMBO</span>×1";
    top.appendChild(s); top.appendChild(cb);
    if (game.mode === "chrono") {
      var tm = el("div", "chip time"); tm.innerHTML = "<span class='lab'>TEMPS</span><span id='timeChip'>90s</span>";
      top.appendChild(tm);
    } else {
      var st = el("div", "chip"); st.id = "streakChip"; st.innerHTML = "<span class='lab'>SÉRIE</span>0";
      top.appendChild(st);
    }
    stage.appendChild(top);

    if (game.mode === "chrono") {
      var tb = el("div", "timebar"); var fi = el("i"); fi.id = "timeFill"; tb.appendChild(fi); stage.appendChild(tb);
    }

    var qc = el("div", "question"); qc.id = "qcard";
    qc.appendChild(el("div", "q", "…"));
    qc.appendChild(el("div", "ans", ""));
    stage.appendChild(qc);

    var fb = el("div", "feedback"); fb.id = "feedback"; stage.appendChild(fb);

    if (game.mode === "train") {
      var tip = el("div", "tip"); tip.id = "tip"; tip.hidden = true; stage.appendChild(tip);
    }

    stage.appendChild(buildPad());
    app.appendChild(stage);
  }

  function buildPad() {
    var pad = el("div", "pad");
    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
    keys.forEach(function (k) {
      var b = el("button", "key" + (k === "⌫" ? " del" : ""), k);
      b.addEventListener("click", function () { press(k); });
      pad.appendChild(b);
    });
    var ok = el("button", "key ok", "OK ✓"); ok.style.gridColumn = "span 3";
    ok.addEventListener("click", submit);
    pad.appendChild(ok);
    return pad;
  }

  function press(k) {
    if (game.locked) return;
    if (k === "⌫") game.input = game.input.slice(0, -1);
    else if (k === ".") { if (game.input.indexOf(".") < 0 && game.input !== "") game.input += "."; }
    else game.input += k;
    var a = document.getElementById("qcard").querySelector(".ans");
    a.textContent = game.input === "" ? "" : game.input.replace(".", ",");
  }

  function nextQuestion() {
    game.locked = false;
    game.input = "";
    game.cur = CATS[game.catId].gen(game.diff);
    var qc = document.getElementById("qcard");
    qc.className = "question";
    qc.querySelector(".q").textContent = game.cur.q;
    qc.querySelector(".ans").textContent = "";
    var fb = document.getElementById("feedback"); fb.textContent = ""; fb.className = "feedback";
    var tip = document.getElementById("tip"); if (tip) { tip.hidden = true; tip.textContent = ""; }
  }

  function submit() {
    if (game.locked || game.over) return;
    if (game.input === "" || game.input === ".") return;
    var val = parseFloat(game.input.replace(",", "."));
    var ok = eq(val, game.cur.a);
    var qc = document.getElementById("qcard");
    var fb = document.getElementById("feedback");

    if (ok) {
      game.locked = true;
      game.correct++;
      save.xp++; persist();
      qc.classList.add("correct");
      game.combo++;
      if (game.combo > game.maxCombo) game.maxCombo = game.combo;
      var pts = 10 + Math.min(game.combo - 1, 10) * 2; // bonus de combo
      game.score += pts;
      fb.className = "feedback ok";
      fb.textContent = "✓ " + praiseOk() + "  +" + pts + " pts" + (game.combo >= 3 ? "  🔥 combo ×" + game.combo : "");
      updateChips();
      if (game.mode === "train") advanceTrain(true);
      else setTimeout(nextQuestion, 550);
    } else {
      game.wrong++;
      game.combo = 0;
      qc.classList.add("wrong");
      fb.className = "feedback no";
      fb.textContent = "✗ La réponse était " + fmt(game.cur.a);
      updateChips();
      if (game.mode === "train") { game.locked = true; advanceTrain(false); }
      else { game.locked = true; setTimeout(nextQuestion, 1200); }
    }
  }

  function advanceTrain(wasOk) {
    var tip = document.getElementById("tip");
    if (tip) { tip.hidden = false; tip.innerHTML = "<b>💡 Astuce.</b> " + game.cur.tip; }
    // bouton continuer
    var fb = document.getElementById("feedback");
    var cont = el("button", "btn primary", "Continuer →");
    cont.style.marginTop = "10px";
    cont.addEventListener("click", nextQuestion);
    fb.appendChild(document.createElement("br"));
    fb.appendChild(cont);
  }

  function updateChips() {
    var s = document.getElementById("scoreChip"); if (s) s.innerHTML = "<span class='lab'>SCORE</span>" + game.score;
    var c = document.getElementById("comboChip"); if (c) c.innerHTML = "<span class='lab'>COMBO</span>×" + Math.max(1, game.combo);
    var st = document.getElementById("streakChip"); if (st) st.innerHTML = "<span class='lab'>SÉRIE</span>" + game.correct;
  }

  var OKW = ["Parfait", "Excellent", "Bravo", "Impec", "Juste", "Nickel", "Bien vu"];
  function praiseOk() { return OKW[Math.floor(Math.random() * OKW.length)]; }

  /* =========================================================
     FIN DE PARTIE
     ========================================================= */
  function endGame() {
    if (game.over) return;
    game.over = true;
    if (game.timer) clearInterval(game.timer);

    var newBest = false;
    if (game.mode === "chrono") {
      var prev = save.best[game.catId] || 0;
      if (game.score > prev) { save.best[game.catId] = game.score; newBest = true; persist(); }
    }

    clear();
    var bar = el("div", "bar");
    var back = el("button", "iconbtn"); back.textContent = "← Accueil"; back.addEventListener("click", screenHome);
    bar.appendChild(back);
    app.appendChild(bar);

    var stage = el("div", "stage");
    var res = el("div", "result");
    res.appendChild(el("div", "big", game.correct > game.wrong ? "🎉" : "💪"));
    res.appendChild(el("h2", null, game.mode === "chrono" ? "Temps écoulé !" : "Séance terminée"));
    res.appendChild(el("div", "score", game.score + " pts"));
    var total = game.correct + game.wrong;
    var pct = total ? Math.round((game.correct / total) * 100) : 0;
    res.appendChild(el("div", "line", "✓ " + game.correct + " justes · ✗ " + game.wrong + " erreurs · " + pct + "% de réussite"));
    res.appendChild(el("div", "line", "Meilleur combo : ×" + game.maxCombo + " · +" + game.correct + " XP"));
    if (newBest) res.appendChild(el("div", "newbest", "🏅 NOUVEAU RECORD !"));
    var belt = beltFor(save.xp);
    res.appendChild(el("div", "line", "Ceinture actuelle : " + belt.name));

    var acts = el("div", "actions");
    var again = el("button", "btn primary", "Rejouer"); again.addEventListener("click", function () { startGame(game.catId, game.mode); });
    var other = el("button", "btn", "Autre calcul"); other.addEventListener("click", screenHome);
    acts.appendChild(again); acts.appendChild(other);
    res.appendChild(acts);
    stage.appendChild(res);
    app.appendChild(stage);
  }

  /* ---------- Clavier physique ---------- */
  document.addEventListener("keydown", function (e) {
    if (!game || game.over) return;
    if (e.key >= "0" && e.key <= "9") press(e.key);
    else if (e.key === "." || e.key === ",") press(".");
    else if (e.key === "Backspace") { press("⌫"); e.preventDefault(); }
    else if (e.key === "Enter") {
      var tip = document.getElementById("tip");
      if (game.mode === "train" && game.locked) nextQuestion();
      else submit();
      e.preventDefault();
    }
  });

  /* ---------- démarrage ---------- */
  screenHome();
})();
