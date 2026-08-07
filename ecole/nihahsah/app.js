/* =========================================================
   NIHAHSAH · Grande section — moteur du jeu
   Vanilla JS, sans dépendance. Fonctionne hors-ligne.
   Principes : sessions courtes (5 étapes), consignes vocales,
   grandes cibles, renforcement positif, rituel d'attention.
   ========================================================= */
(function () {
  "use strict";

  var app = document.getElementById("app");

  /* ---------- Voix (Web Speech API) ---------- */
  var voiceFR = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    var vs = window.speechSynthesis.getVoices();
    // préférence : voix française, si possible féminine
    var fr = vs.filter(function (v) { return /fr(-|_)/i.test(v.lang) || /fran/i.test(v.name); });
    voiceFR = fr.find(function (v) { return /f(e|é)m|marie|julie|amelie|audrey|virginie|google fran/i.test(v.name); }) || fr[0] || null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
  var lastSpoken = "";
  function speak(text, opts) {
    opts = opts || {};
    lastSpoken = text;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      if (voiceFR) u.voice = voiceFR;
      u.rate = opts.rate || 0.92;   // un peu lent pour bien articuler
      u.pitch = opts.pitch || 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function replay() { if (lastSpoken) speak(lastSpoken); }

  /* ---------- Sauvegarde ---------- */
  var KEY = "nihah_progress_v1";
  var save = {
    stars: 0,
    lettres: { level: 1 },
    chiffres: { level: 1 }
  };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) save = Object.assign(save, JSON.parse(raw));
  } catch (e) {}
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- Utilitaires ---------- */
  function rand(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sample(arr, k) { return shuffle(arr).slice(0, k); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function clear() { app.innerHTML = ""; }

  /* ---------- Données ---------- */
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  // nom parlé des lettres pour une voix française
  var LETTER_SAY = {
    A:"a",B:"bé",C:"cé",D:"dé",E:"e",F:"effe",G:"jé",H:"ache",I:"i",J:"ji",
    K:"ka",L:"elle",M:"emme",N:"enne",O:"o",P:"pé",Q:"ku",R:"erre",S:"esse",
    T:"té",U:"u",V:"vé",W:"double vé",X:"ixe",Y:"i grec",Z:"zède"
  };
  var NUM_SAY = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix",
    "onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf","vingt",
    "vingt et un","vingt-deux","vingt-trois","vingt-quatre","vingt-cinq","vingt-six","vingt-sept","vingt-huit","vingt-neuf","trente"];
  var COUNT_ITEMS = [
    {e:"🍎",s:"pomme",p:"pommes"},{e:"🐟",s:"poisson",p:"poissons"},
    {e:"⭐",s:"étoile",p:"étoiles"},{e:"🐝",s:"abeille",p:"abeilles"},
    {e:"🦋",s:"papillon",p:"papillons"},{e:"🍓",s:"fraise",p:"fraises"},
    {e:"🐞",s:"coccinelle",p:"coccinelles"},{e:"🎈",s:"ballon",p:"ballons"},
    {e:"🐢",s:"tortue",p:"tortues"},{e:"🌸",s:"fleur",p:"fleurs"}
  ];
  var PRAISE = ["Bravo !","Super !","Génial !","Bien joué !","Tu es un champion... une championne !","Wouah, parfait !","Trop fort !"];
  function praise() { return PRAISE[rand(PRAISE.length)]; }

  /* niveaux : combien de lettres / quel nombre max */
  function letterPool() {
    var lv = save.lettres.level;
    if (lv <= 1) return ALPHABET.slice(0, 6);    // A-F
    if (lv === 2) return ALPHABET.slice(0, 13);   // A-M
    if (lv === 3) return ALPHABET.slice(0, 20);   // A-T
    return ALPHABET;                              // A-Z
  }
  function numberMax() {
    var lv = save.chiffres.level;
    if (lv <= 1) return 5;
    if (lv === 2) return 10;
    return 10;
  }

  /* =========================================================
     ÉCRAN : ACCUEIL
     ========================================================= */
  function screenHome() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    clear();

    var bar = el("div", "bar");
    var back = el("a", "iconbtn"); back.textContent = "🏠"; back.href = "../"; back.setAttribute("aria-label", "Retour");
    var pill = el("div", "stars-pill");
    pill.appendChild(el("span", null, "⭐"));
    pill.appendChild(el("span", "n", String(save.stars)));
    bar.appendChild(back);
    bar.appendChild(pill);
    app.appendChild(bar);

    var stage = el("div", "stage");
    stage.appendChild(el("div", "hero-emoji", "🦋"));
    stage.appendChild(el("div", "title", "Bonjour Nihahsah !"));
    stage.appendChild(el("div", "subtitle", "Choisis un jeu. On commence par allumer ton attention ✨"));

    var worlds = el("div", "worlds");
    worlds.appendChild(worldBtn("🔤", "Les Lettres", "Reconnaître l'alphabet", "Niveau " + save.lettres.level, function () { startWorld("lettres"); }));
    worlds.appendChild(worldBtn("🔢", "Les Chiffres", "Compter et reconnaître", "Niveau " + save.chiffres.level, function () { startWorld("chiffres"); }));
    stage.appendChild(worlds);

    app.appendChild(stage);
    speak("Bonjour Nihahsah ! Choisis un jeu : les lettres, ou les chiffres.");
  }
  function worldBtn(emoji, title, sub, lvl, onClick) {
    var b = el("button", "world");
    b.appendChild(el("span", "wemoji", emoji));
    var t = el("span", "wtxt");
    t.appendChild(el("b", null, title));
    t.appendChild(el("span", null, sub));
    b.appendChild(t);
    b.appendChild(el("span", "lvl", lvl));
    b.addEventListener("click", onClick);
    return b;
  }

  /* =========================================================
     RITUEL D'ATTENTION  (avant chaque monde)
     respiration guidée puis 3 “étoiles qui brillent” à toucher
     ========================================================= */
  function startWorld(world) {
    ritualBreathing(function () {
      ritualFocus(0, function () {
        playSession(world);
      });
    });
  }

  function simpleBar(showStars) {
    var bar = el("div", "bar");
    var back = el("button", "iconbtn"); back.textContent = "🏠"; back.setAttribute("aria-label", "Accueil");
    back.addEventListener("click", screenHome);
    bar.appendChild(back);
    var replayBtn = el("button", "iconbtn replay"); replayBtn.textContent = "🔊"; replayBtn.setAttribute("aria-label", "Réécouter");
    replayBtn.addEventListener("click", replay);
    if (showStars) {
      var pill = el("div", "stars-pill");
      pill.appendChild(el("span", null, "⭐"));
      pill.appendChild(el("span", "n", String(save.stars)));
      bar.appendChild(pill);
    }
    bar.appendChild(replayBtn);
    return bar;
  }

  function ritualBreathing(done) {
    clear();
    app.appendChild(simpleBar(false));
    var stage = el("div", "stage");
    stage.appendChild(el("div", "title", "On allume notre attention 🌟"));
    var bubble = el("div", "breath", "Respire");
    stage.appendChild(bubble);
    var hint = el("div", "subtitle", "Regarde la bulle. Gonfle… dégonfle…");
    stage.appendChild(hint);
    var skip = el("button", "big-btn ghost", "Passer ⏭️");
    skip.addEventListener("click", function () { cleanup(); done(); });
    stage.appendChild(skip);
    app.appendChild(stage);

    speak("On respire tranquillement. Gonfle le ventre… et souffle doucement.");
    // rythme calé sur l'animation (8s = 1 cycle) : 2 cycles
    var t1 = setTimeout(function () { bubble.textContent = "Souffle"; speak("Souffle…"); }, 4000);
    var t2 = setTimeout(function () { bubble.textContent = "Respire"; speak("Encore une fois. Gonfle…"); }, 8000);
    var t3 = setTimeout(function () { bubble.textContent = "Souffle"; speak("Et souffle…"); }, 12000);
    var t4 = setTimeout(function () { cleanup(); done(); }, 16000);
    function cleanup() { [t1, t2, t3, t4].forEach(clearTimeout); }
  }

  function ritualFocus(round, done) {
    if (round === 0) {
      clear();
      app.appendChild(simpleBar(false));
      var stage = el("div", "stage");
      stage.appendChild(el("div", "title", "Touche l'étoile qui brille ⭐"));
      var field = el("div", "focus-field"); field.id = "focusField";
      stage.appendChild(field);
      var count = el("div", "subtitle"); count.id = "focusCount";
      stage.appendChild(count);
      app.appendChild(stage);
    }
    var TOTAL = 3;
    if (round >= TOTAL) {
      // terminé
      clear();
      app.appendChild(simpleBar(false));
      var s2 = el("div", "stage");
      s2.appendChild(el("div", "hero-emoji", "💡"));
      s2.appendChild(el("div", "title", "Ton attention est allumée !"));
      s2.appendChild(el("div", "subtitle", "Bravo, on peut jouer maintenant."));
      var go = el("button", "big-btn mint", "C'est parti ! 🎉");
      go.addEventListener("click", done);
      s2.appendChild(go);
      app.appendChild(s2);
      speak("Bravo ! Ton attention est allumée. On peut jouer !");
      return;
    }
    var field = document.getElementById("focusField");
    var cEl = document.getElementById("focusCount");
    cEl.textContent = "Étoile " + (round + 1) + " sur " + TOTAL;
    field.innerHTML = "";
    var n = 5;
    var glowIndex = rand(n);
    for (var i = 0; i < n; i++) {
      var sp = el("button", "spark", "★");
      var w = field.clientWidth || 480, h = field.clientHeight || 340;
      sp.style.left = (18 + Math.random() * (w - 96 - 36)) + "px";
      sp.style.top = (18 + Math.random() * (h - 96 - 36)) + "px";
      if (i === glowIndex) {
        sp.classList.add("glow");
        (function (btn) {
          btn.addEventListener("click", function () {
            speak(praise());
            confettiBurst(6);
            setTimeout(function () { ritualFocus(round + 1, done); }, 500);
          });
        })(sp);
      } else {
        sp.addEventListener("click", function () { speak("Touche celle qui brille."); });
      }
      field.appendChild(sp);
    }
    if (round === 0) speak("Touche l'étoile qui brille.");
  }

  /* =========================================================
     SESSION DE JEU  (5 étapes)
     ========================================================= */
  var session = null;
  function playSession(world) {
    session = { world: world, step: 0, total: 5, correct: 0 };
    nextStep();
  }

  function nextStep() {
    if (session.step >= session.total) return celebrate();
    var q = session.world === "lettres" ? makeLetterQ() : makeNumberQ();
    renderQuestion(q);
  }

  function makeLetterQ() {
    var pool = letterPool();
    var modes = ["hear"];
    if (pool.length >= 6) modes.push("case"); // trouver la même lettre (majuscule/minuscule)
    var mode = modes[rand(modes.length)];
    var target = pool[rand(pool.length)];
    var distractors = shuffle(pool.filter(function (l) { return l !== target; })).slice(0, 2);
    var options = shuffle([target].concat(distractors));

    if (mode === "case") {
      return {
        type: "letters",
        say: "Trouve la même lettre que " + LETTER_SAY[target] + ".",
        hero: target,           // grande majuscule affichée
        heroLabel: "Trouve la même lettre",
        display: function (l) { return l.toLowerCase(); }, // options en minuscules
        options: options, answer: target
      };
    }
    return {
      type: "letters",
      say: "Touche la lettre " + LETTER_SAY[target] + ".",
      hero: null, heroLabel: "Touche la lettre… (écoute 🔊)",
      display: function (l) { return l; },
      options: options, answer: target
    };
  }

  function makeNumberQ() {
    var max = numberMax();
    var kinds = ["count", "digit"];
    if (save.chiffres.level >= 2) { kinds.push("compare"); kinds.push("die"); }
    var kind = kinds[rand(kinds.length)];

    if (kind === "digit") {
      var t = 1 + rand(max);
      var others = [];
      while (others.length < 2) { var d = 1 + rand(max); if (d !== t && others.indexOf(d) < 0) others.push(d); }
      return { type: "digits", say: "Touche le chiffre " + NUM_SAY[t] + ".",
        heroLabel: "Touche le chiffre… (écoute 🔊)",
        options: shuffle([t].concat(others)), answer: t, display: function (x){return x;} };
    }
    if (kind === "count") {
      var item = COUNT_ITEMS[rand(COUNT_ITEMS.length)];
      var n = 1 + rand(max);
      var opts = [n];
      while (opts.length < 3) { var v = 1 + rand(max); if (opts.indexOf(v) < 0) opts.push(v); }
      return { type: "count", item: item, n: n,
        say: "Compte les " + item.p + ". Combien y a-t-il de " + item.p + " ?",
        options: shuffle(opts), answer: n };
    }
    if (kind === "die") {
      var d1 = 1 + rand(6);
      var o = [d1];
      while (o.length < 3) { var x = 1 + rand(6); if (o.indexOf(x) < 0) o.push(x); }
      return { type: "die", n: d1, say: "Combien de points sur le dé ?", options: shuffle(o), answer: d1 };
    }
    // compare
    var a = 1 + rand(max), b = 1 + rand(max);
    while (b === a) b = 1 + rand(max);
    var it = COUNT_ITEMS[rand(COUNT_ITEMS.length)];
    return { type: "compare", item: it, a: a, b: b,
      say: "Touche le groupe où il y a le plus de " + it.p + ".",
      answer: a > b ? "A" : "B" };
  }

  function renderQuestion(q) {
    clear();
    app.appendChild(simpleBar(true));

    var stage = el("div", "stage");

    // points de progression
    var dots = el("div", "dots");
    for (var i = 0; i < session.total; i++) {
      var d = el("i");
      if (i < session.step) d.classList.add("on");
      if (i === session.step) d.classList.add("cur");
      dots.appendChild(d);
    }
    stage.appendChild(dots);

    // consigne
    stage.appendChild(el("div", "title", q.heroLabel || ""));

    // corps selon le type
    if (q.type === "letters" && q.hero) {
      stage.appendChild(el("div", "hero-emoji", q.hero));
    }

    if (q.type === "count") {
      var objs = el("div", "objs");
      for (var k = 0; k < q.n; k++) objs.appendChild(el("span", "o", q.item.e));
      stage.appendChild(objs);
      var help = el("button", "big-btn ghost", "👉 Compter avec moi");
      help.addEventListener("click", function () { countAloud(objs, q.n, q.item); });
      stage.appendChild(help);
    }

    if (q.type === "die") {
      stage.appendChild(makeDie(q.n));
    }

    if (q.type === "compare") {
      var comp = el("div", "compare");
      comp.appendChild(makeGroup("A", q.a, q.item, q));
      comp.appendChild(makeGroup("B", q.b, q.item, q));
      stage.appendChild(comp);
    } else {
      // grille de choix (lettres / chiffres / count / die)
      var choices = el("div", "choices " + (q.options.length === 2 ? "c2" : "c3"));
      q.options.forEach(function (opt) {
        var b = el("button", "choice");
        b.textContent = q.display ? q.display(opt) : String(opt);
        b.addEventListener("click", function () { onAnswer(b, opt, q, choices); });
        choices.appendChild(b);
      });
      stage.appendChild(choices);
    }

    app.appendChild(stage);
    setTimeout(function () { speak(q.say); }, 250);
  }

  function makeDie(n) {
    var die = el("div", "die");
    // positions des points pour 1..6 (index 0..8 de la grille 3x3)
    var MAP = { 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
    for (var i = 0; i < 9; i++) {
      var p = el("span", "pip");
      if (MAP[n].indexOf(i) >= 0) p.classList.add("on");
      die.appendChild(p);
    }
    return die;
  }

  function makeGroup(id, n, item, q) {
    var g = el("div", "group");
    g.dataset.id = id;
    for (var i = 0; i < n; i++) g.appendChild(el("span", "o", item.e));
    g.addEventListener("click", function () {
      if (id === q.answer) {
        g.classList.add("correct");
        good(q);
      } else {
        g.classList.add("wrong");
        bad();
        setTimeout(function () { g.classList.remove("wrong"); }, 500);
      }
    });
    return g;
  }

  function countAloud(objsEl, n, item) {
    var nodes = objsEl.querySelectorAll(".o");
    var i = 0;
    (function tick() {
      if (i > 0) nodes[i - 1].classList.remove("count");
      if (i >= n) { speak("Il y a " + NUM_SAY[n] + " " + (n > 1 ? item.p : item.s) + "."); return; }
      nodes[i].classList.add("count");
      speak(NUM_SAY[i + 1]);
      i++;
      setTimeout(tick, 750);
    })();
  }

  function onAnswer(btn, opt, q, container) {
    var ok = opt === q.answer;
    if (ok) {
      btn.classList.add("correct");
      // griser les autres
      container.querySelectorAll(".choice").forEach(function (c) { if (c !== btn) c.classList.add("dim"); });
      good(q);
    } else {
      btn.classList.add("wrong");
      bad();
      setTimeout(function () { btn.classList.remove("wrong"); }, 500);
    }
  }

  function good(q) {
    session.correct++;
    save.stars++;
    persist();
    speak(praise());
    confettiBurst(10);
    session.step++;
    setTimeout(nextStep, 1100);
  }
  function bad() {
    speak("Essaie encore. Écoute bien.");
  }

  /* =========================================================
     RÉCOMPENSE + montée de niveau
     ========================================================= */
  function celebrate() {
    // montée de niveau si sans-faute (ou presque) et pas au max
    var w = session.world;
    var perfect = session.correct >= session.total;
    var maxLevel = w === "lettres" ? 4 : 3;
    var leveledUp = false;
    if (perfect && save[w].level < maxLevel) { save[w].level++; leveledUp = true; persist(); }

    clear();
    app.appendChild(simpleBar(true));
    var stage = el("div", "stage");
    stage.appendChild(el("div", "hero-emoji", "🏆"));
    stage.appendChild(el("div", "title", "Bravo Nihahsah !"));
    stage.appendChild(el("div", "subtitle", "Tu as gagné " + session.correct + " étoiles ⭐"));
    if (leveledUp) {
      var up = el("div", "subtitle");
      up.innerHTML = "🎉 Tu montes au <b>niveau " + save[w].level + "</b> !";
      stage.appendChild(up);
    }
    var again = el("button", "big-btn mint", "Rejouer 🔁");
    again.addEventListener("click", function () { startWorld(w); });
    var home = el("button", "big-btn ghost", "Choisir un autre jeu 🏠");
    home.addEventListener("click", screenHome);
    stage.appendChild(again);
    stage.appendChild(home);
    app.appendChild(stage);

    confettiBurst(40);
    speak("Bravo Nihahsah ! Tu as gagné " + session.correct + " étoiles !" + (leveledUp ? " Et tu montes de niveau !" : ""));
  }

  /* ---------- confettis ---------- */
  function confettiBurst(count) {
    var EM = ["🎉","⭐","✨","🌈","💛","🎈","🦋"];
    for (var i = 0; i < count; i++) {
      (function () {
        var c = el("span", "confetti", EM[rand(EM.length)]);
        c.style.left = Math.random() * 100 + "vw";
        c.style.animationDuration = (1.4 + Math.random() * 1.4) + "s";
        c.style.fontSize = (18 + Math.random() * 22) + "px";
        document.body.appendChild(c);
        setTimeout(function () { c.remove(); }, 2900);
      })();
    }
  }

  /* ---------- démarrage ---------- */
  screenHome();
})();
