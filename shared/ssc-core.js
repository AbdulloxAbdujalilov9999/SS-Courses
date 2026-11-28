/* SS-Courses core: helpers, settings, the student's progress store, XP / streak / badges,
 * spaced review (Leitner) and answer checking. Everything here is plain JS on window.SS so
 * the other scripts (practice, presenter, app, cloud) share one state.
 *
 * Progress lives in localStorage ("ssc_state") and, when the student is signed in,
 * is mirrored to Firebase under ssc/progress/{uid} by shared/ssc-cloud.js (SS.onChange hook).
 */
(function(){
  "use strict";
  const C = window.SSC;
  const SS = window.SS = {};
  SS.course = window.SSC_COURSE || { id: "office", base: "data/", files: "materials/", title: C.title, apps: [] };
  SS.courses = window.SSC_COURSES || [SS.course];

  /* ---------- small helpers ---------- */
  const esc = SS.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  // course strings: escape, then **bold**; blanks (3+ underscores) become a visual gap
  SS.md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/_{3,}/g, '<span class="gap">_____</span>');
  SS.plain = s => String(s == null ? "" : s).replace(/\*\*/g, "");
  SS.$ = (sel, root) => (root || document).querySelector(sel);
  SS.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  SS.today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  SS.dayNum = (iso) => Math.floor((iso ? new Date(iso + "T12:00:00") : new Date()).getTime() / 864e5);
  SS.pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  SS.img = id => { const im = C.images[id]; return im ? SS.course.base + im.file : ""; };
  SS.file = p => SS.course.files + String(p).split("/").map(encodeURIComponent).join("/");
  SS.ext = p => { const m = /\.([a-z0-9]+)$/i.exec(p || ""); return m ? m[1].toLowerCase() : ""; };
  SS.fname = p => String(p || "").split("/").pop();

  SS.APPS = {
    word:    { name: "Word",       letter: "W", uz: "Word" },
    excel:   { name: "Excel",      letter: "X", uz: "Excel" },
    ppt:     { name: "PowerPoint", letter: "P", uz: "PowerPoint" },
    outlook: { name: "Outlook",    letter: "O", uz: "Outlook" },
    teams:   { name: "Teams",      letter: "T", uz: "Teams" },
    office:  { name: "Office + AI", letter: "★", uz: "Integratsiya" },
    ps:      { name: "Photoshop",      letter: "Ps", uz: "Photoshop" },
    ai:      { name: "Illustrator",    letter: "Ai", uz: "Illustrator" },
    pr:      { name: "Premiere Pro",   letter: "Pr", uz: "Premiere Pro" },
    ae:      { name: "After Effects",  letter: "Ae", uz: "After Effects" },
    adobe:   { name: "Adobe: hammasi", letter: "Cc", uz: "Integratsiya" },
  };
  SS.lesson = n => C.lessons.find(l => l.n === +n);
  SS.week = w => C.weeks.find(x => x.week === +w);
  SS.check = k => C.checks.find(c => c.k === +k);
  SS.project = p => C.projects.find(x => x.p === +p);

  /* ---------- settings ---------- */
  const SKEY = "ssc_settings";
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  SS.settings = Object.assign({ lang: "uz", theme: "auto", teacher: false, skipAns: true, sound: true }, load(SKEY, {}));
  SS.saveSettings = () => { save(SKEY, SS.settings); SS.applyTheme(); };
  SS.applyTheme = () => {
    const t = SS.settings.theme, h = document.documentElement;
    if (t === "light" || t === "dark") h.setAttribute("data-theme", t); else h.removeAttribute("data-theme");
    h.lang = SS.settings.lang === "en" ? "en" : "uz";
  };
  SS.L = (uz, en) => (SS.settings.lang === "en" && en != null ? en : uz);
  // teacher mode: staff accounts always, or the local switch (a classroom laptop without sign-in)
  SS.isTeacher = () => !!(SS.settings.teacher || (SS.cloud && SS.cloud.isStaff));

  /* ---------- progress store ---------- */
  // progress is kept per course (the Office course keeps the original key)
  const keyOf = id => (id === "office" ? "ssc_state" : "ssc_state_" + id);
  const PKEY = keyOf(SS.course.id);
  SS.peekState = id => load(keyOf(id), null);
  const blank = () => ({ xp: 0, days: {}, badges: {}, px: {}, hw: {}, seen: {}, exit: {}, srs: {}, wrong: {}, chk: {}, proj: {}, hs: {}, prac: {}, last: null, updatedAt: 0 });
  SS.state = null;   // loaded below, once normState exists
  let dirty = {}, saveT = null;
  SS.onChange = null;            // set by the cloud module: receives {path: value} of changed top-level keys
  SS.commit = (...keys) => {
    SS.state.updatedAt = Date.now();
    keys.concat("updatedAt").forEach(k => { dirty[k] = true; });
    save(PKEY, SS.state);
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const out = {}; Object.keys(dirty).forEach(k => { out[k] = SS.state[k] == null ? null : SS.state[k]; });
      dirty = {};
      if (SS.onChange) SS.onChange(out);
    }, 800);
  };
  SS.replaceState = (s) => { SS.state = Object.assign(blank(), SS.normState(s)); save(PKEY, SS.state); };
  SS.resetState = () => { SS.state = blank(); save(PKEY, SS.state); if (SS.onChange) SS.onChange(Object.assign({}, SS.state)); };

  // Firebase turns {1: x, 2: y} into [null, x, y]; turn such arrays back into objects (top-level maps only)
  const MAPS = ["days", "badges", "px", "hw", "seen", "exit", "srs", "wrong", "chk", "proj", "hs", "prac"];
  SS.normState = (s) => {
    s = Object.assign({}, s || {});
    MAPS.forEach(k => {
      const v = s[k];
      if (Array.isArray(v)){ const o = {}; v.forEach((x, i) => { if (x != null) o[i] = x; }); s[k] = o; }
      else if (!v || typeof v !== "object") s[k] = {};
    });
    Object.keys(s.hw).forEach(n => { const h = s.hw[n]; if (h){ ["answers", "scores", "req"].forEach(k => { if (Array.isArray(h[k])){ const o = {}; h[k].forEach((x, i) => { if (x != null) o[i] = x; }); h[k] = o; } else if (!h[k]) h[k] = {}; }); } });
    return s;
  };
  // combine two copies of the progress (this device + the cloud) without losing work
  SS.mergeState = (a, b) => {
    a = SS.normState(a); b = SS.normState(b);
    const o = Object.assign(blank(), a);
    const best = (x, y) => (!x ? y : !y ? x : (y[0] / (y[1] || 1) > x[0] / (x[1] || 1) ? y : x));
    o.xp = Math.max(a.xp || 0, b.xp || 0);
    o.reviewCount = Math.max(a.reviewCount || 0, b.reviewCount || 0);
    Object.keys(b.days).forEach(d => { o.days[d] = Math.max(a.days[d] || 0, b.days[d]); });
    Object.keys(b.badges).forEach(k => { o.badges[k] = Math.min(a.badges[k] || Infinity, b.badges[k]); });
    ["px", "exit", "hs"].forEach(m => Object.keys(b[m]).forEach(k => { o[m][k] = best(a[m][k], b[m][k]); }));
    Object.keys(b.seen).forEach(k => { o.seen[k] = Math.max(a.seen[k] || 0, b.seen[k]); });
    Object.keys(b.hw).forEach(n => {
      const x = a.hw[n], y = b.hw[n]; if (!x){ o.hw[n] = y; return; }
      o.hw[n] = { answers: Object.assign({}, y.answers, x.answers), scores: Object.assign({}, y.scores, x.scores), req: Object.assign({}, y.req, x.req), done: x.done || y.done || undefined };
      if (!o.hw[n].done) delete o.hw[n].done;
    });
    Object.keys(b.prac).forEach(n => { const x = a.prac[n], y = b.prac[n]; o.prac[n] = !x ? y : Object.assign({}, y, x, { done: x.done || y.done, ticks: Object.assign({}, y.ticks, x.ticks) }); if (!o.prac[n].done) delete o.prac[n].done; });
    Object.keys(b.chk).forEach(k => {
      const x = a.chk[k], y = b.chk[k]; if (!x){ o.chk[k] = y; return; }
      const first = x.first && y.first ? (x.first.at <= y.first.at ? x.first : y.first) : (x.first || y.first);
      const bst = [x.best, y.best].filter(Boolean).sort((p, q) => q.score - p.score)[0];
      o.chk[k] = { first, best: bst, last: [x.last, y.last].filter(Boolean).sort((p, q) => q.at - p.at)[0] };
    });
    Object.keys(b.proj).forEach(k => { const x = a.proj[k] || {}, y = b.proj[k] || {}; o.proj[k] = { musts: Object.assign({}, y.musts, x.musts), list: Object.assign({}, y.list, x.list) }; });
    Object.keys(b.srs).forEach(k => { if (!a.srs[k]) o.srs[k] = b.srs[k]; });
    Object.keys(b.wrong).forEach(k => { if (!a.wrong[k]) o.wrong[k] = b.wrong[k]; });
    o.last = a.last || b.last;
    o.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    return o;
  };

  SS.state = Object.assign(blank(), SS.normState(load(PKEY, {})));

  /* ---------- XP, streak, badges ---------- */
  SS.addXP = (n, why) => {
    if (!n) return;
    const st = SS.state, d = SS.today();
    st.xp = (st.xp || 0) + n;
    st.days[d] = (st.days[d] || 0) + n;
    SS.commit("xp", "days");
    SS.checkBadges();
    SS.updateTopbar && SS.updateTopbar();
    if (why) SS.toast("+" + n + " XP · " + why);
  };
  SS.streak = () => {
    const days = SS.state.days || {};
    let n = 0, d = SS.dayNum();
    if (!days[isoOf(d)]) d -= 1;       // today not done yet: the streak still counts until midnight
    while (days[isoOf(d)]) { n++; d--; }
    return n;
  };
  function isoOf(dn){ const t = new Date(dn * 864e5); return t.getUTCFullYear() + "-" + String(t.getUTCMonth() + 1).padStart(2, "0") + "-" + String(t.getUTCDate()).padStart(2, "0"); }

  SS.lessonProgress = (n) => {
    // share of the lesson's work done: 8 practice exercises, exit ticket, practice task, homework
    const st = SS.state, parts = [];
    const l = SS.lesson(n); if (!l) return 0;
    l.exercises.forEach(e => { const r = st.px["L" + n + "-" + e.letter]; parts.push(r ? r[0] / r[1] : 0); });
    const ex = st.exit[n]; parts.push(ex ? ex[0] / ex[1] : 0);
    parts.push(st.prac[n] ? 1 : 0);
    const hw = st.hw[n]; parts.push(hw && hw.done ? 1 : 0);
    return Math.round(100 * parts.reduce((a, b) => a + b, 0) / parts.length);
  };
  SS.lessonDone = n => SS.lessonProgress(n) >= 80;

  SS.BADGES = [
    { id: "first",   ico: "🚀", uz: "Birinchi qadam", en: "First step", d: "Birinchi mashqni bajaring",      test: s => Object.keys(s.px).length > 0 },
    { id: "xp500",   ico: "⭐", uz: "500 XP",         en: "500 XP",     d: "500 XP toʻplang",                test: s => s.xp >= 500 },
    { id: "xp2000",  ico: "🌟", uz: "2000 XP",        en: "2000 XP",    d: "2000 XP toʻplang",               test: s => s.xp >= 2000 },
    { id: "xp5000",  ico: "💫", uz: "5000 XP",        en: "5000 XP",    d: "5000 XP toʻplang",               test: s => s.xp >= 5000 },
    { id: "streak3", ico: "🔥", uz: "3 kun ketma-ket", en: "3-day streak", d: "3 kun ketma-ket shugʻullaning", test: () => SS.streak() >= 3 },
    { id: "streak7", ico: "🔥", uz: "7 kun ketma-ket", en: "7-day streak", d: "7 kun ketma-ket shugʻullaning", test: () => SS.streak() >= 7 },
    { id: "perfect", ico: "🎯", uz: "Benuqson",       en: "Perfect",    d: "Mashqni 100% bajaring",          test: s => Object.values(s.px).some(r => r[0] === r[1] && r[1] > 0) },
    { id: "hunter",  ico: "🖱️", uz: "Tugma ovchisi",  en: "Button hunter", d: "«Tugmani top» oʻyinida 100%", test: s => Object.values(s.hs).some(r => r[0] === r[1] && r[1] > 0) },
    { id: "check",   ico: "🏅", uz: "Nazoratchi",     en: "Quiz taker", d: "Onlayn nazorat ishida 90%+",     test: s => Object.values(s.chk).some(c => c.best && c.best.max && c.best.score / c.best.max >= 0.9) },
    { id: "review",  ico: "🧠", uz: "Xotira",         en: "Memory",     d: "Takrorlashda 50 ta javob",       test: s => (s.reviewCount || 0) >= 50 },
  ];
  // one "master" badge per app, from the weeks of the loaded course
  const APP_ICO = { word: "📝", excel: "📊", ppt: "🎞️", outlook: "📧", teams: "💬", ps: "🖼️", ai: "✒️", pr: "🎬", ae: "✨" };
  const byApp = {};
  C.lessons.forEach(l => { if (APP_ICO[l.app]) (byApp[l.app] = byApp[l.app] || []).push(l.n); });
  Object.keys(byApp).forEach(app => {
    const ns = byApp[app], nm = SS.APPS[app].name, rng = ns[0] + "–" + ns[ns.length - 1];
    SS.BADGES.splice(SS.BADGES.length - 2, 0, { id: app, ico: APP_ICO[app], uz: nm + " ustasi", en: nm + " master", d: nm + " darslarini (" + rng + ") tugating", test: () => ns.every(SS.lessonDone) });
  });
  function range(a, b){ const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
  SS.range = range;
  SS.checkBadges = () => {
    const st = SS.state; let got = null;
    SS.BADGES.forEach(b => { if (!st.badges[b.id] && b.test(st)) { st.badges[b.id] = Date.now(); got = b; } });
    if (got) { SS.commit("badges"); setTimeout(() => SS.toast(got.ico + " " + SS.L("Yangi nishon: ", "New badge: ") + SS.L(got.uz, got.en)), 1600); }
  };

  /* ---------- spaced review (Leitner boxes: 1, 2, 4, 7, 15 days) ---------- */
  const GAPS = [0, 1, 2, 4, 7, 15];
  // key -> [box, dueDayNum]; items: "t:L:i" term i of lesson L; "w:<id>" a wrong answer saved in state.wrong
  SS.srsAdd = (key, data) => {
    const st = SS.state;
    if (data) st.wrong[key.slice(2)] = data;
    if (!st.srs[key]) st.srs[key] = [1, SS.dayNum()];
    else st.srs[key] = [1, SS.dayNum()];
    SS.commit("srs", "wrong");
  };
  SS.srsGrade = (key, ok) => {
    const st = SS.state, cur = st.srs[key] || [1, 0];
    const box = ok ? Math.min(cur[0] + 1, 5) : 1;
    if (ok && cur[0] >= 5) { delete st.srs[key]; if (key.startsWith("w:")) delete st.wrong[key.slice(2)]; }
    else st.srs[key] = [box, SS.dayNum() + GAPS[box]];
    st.reviewCount = (st.reviewCount || 0) + 1;
    SS.commit("srs", "wrong", "reviewCount");
  };
  SS.srsDue = () => {
    const now = SS.dayNum();
    return Object.keys(SS.state.srs).filter(k => SS.state.srs[k][1] <= now);
  };
  // when a lesson is opened, its 16 terms join the review queue (due tomorrow)
  SS.seedTerms = (n) => {
    const l = SS.lesson(n), st = SS.state; let added = 0;
    l.terms.forEach((t, i) => { const k = "t:" + n + ":" + i; if (!st.srs[k]) { st.srs[k] = [1, SS.dayNum() + 1]; added++; } });
    if (added) SS.commit("srs");
  };

  /* ---------- answer checking ---------- */
  const norm = SS.norm = s => String(s == null ? "" : s)
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[‘’ʼʻ`´]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...")
    .replace(/\s*([+→=,;:()\/])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s"']+|[\s.!?"']+$/g, "")
    .trim();
  // the given answer is right if it matches the key or any " / " alternative of it
  SS.isRight = (given, key) => {
    const g = norm(given); if (!g) return false;
    const alts = String(key).split(/\s+\/\s+/).concat([key]);
    return alts.some(a => norm(a) === g || norm(a).replace(/^=/, "") === g.replace(/^=/, ""));
  };
  // lenient check for "fix" items and long answers: the key without its (parenthetical note),
  // or every English UI token of the key (Heading 1, Ctrl + E, =SUM(...)) present in the answer
  SS.isRoughlyRight = (given, key) => {
    if (SS.isRight(given, key)) return true;
    const g = norm(given); if (!g) return false;
    const core = String(key).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    if (core && norm(core) === g) return true;
    // in a full sentence the capitalised first word ("Unga …") is just grammar, not a UI name
    const body = (/\.$/.test(core) && core.split(" ").length >= 4) ? core.replace(/^\S+\s/, "") : core;
    const toks = (body.match(/(=[A-Z]+\([^)]*\)|Ctrl(?:\s*\+\s*\w+)+|[A-Z][\w.*]*(?:\s+(?:\d+|[A-Z][\w.*]*))*|\d[\d\s.,:%]*)/g) || []).map(norm).filter(t => t.length > 1);
    return toks.length > 0 && toks.every(t => g.includes(t));
  };
  SS.orderRight = (given, key) => norm(given).replace(/[^a-z]/g, "") === norm(key).replace(/[^a-z]/g, "");

  /* ---------- UI bits ---------- */
  let toastT;
  SS.toast = (msg) => {
    const t = document.getElementById("toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  };
  SS.modal = (html, onMount) => {
    const root = document.getElementById("modalRoot");
    root.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
    const bg = root.firstChild;
    bg.addEventListener("click", e => { if (e.target === bg) SS.closeModal(); });
    if (onMount) onMount(bg.firstChild);
  };
  SS.closeModal = () => { document.getElementById("modalRoot").innerHTML = ""; };
  SS.lightbox = (src) => {
    const d = document.createElement("div"); d.className = "lightbox";
    d.innerHTML = `<img src="${esc(src)}" alt="">`;
    d.onclick = () => d.remove();
    document.body.appendChild(d);
  };
  SS.confetti = () => {
    const c = document.createElement("canvas"); c.className = "confetti"; document.body.appendChild(c);
    const W = c.width = innerWidth, H = c.height = innerHeight, x = c.getContext("2d");
    const cols = ["#2B579A", "#217346", "#B7472A", "#0F6CBD", "#5B5FC7", "#F2C26B"];
    const ps = Array.from({ length: 120 }, () => ({ x: W / 2, y: H / 3, vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 2, r: Math.random() * 6 + 3, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6 }));
    let f = 0;
    (function tick(){
      x.clearRect(0, 0, W, H);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.a += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6); x.restore(); });
      if (++f < 110) requestAnimationFrame(tick); else c.remove();
    })();
  };
  // speech for English UI terms (browser voice; no server needed)
  SS.say = (text) => {
    try {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(SS.plain(text)); u.lang = "en-US"; u.rate = .92;
      speechSynthesis.speak(u);
    } catch (e) {}
  };
  SS.fileLink = (p, label) => {
    if (!p) return "";
    const e = SS.ext(p), cls = ["docx", "xlsx", "pptx", "pdf"].includes(e) ? "ext-" + e : "ext-other";
    return `<a class="file" href="${SS.file(p)}" target="_blank" rel="noopener" download><span class="ext ${cls}">${esc(e.toUpperCase() || "FILE")}</span><span class="nm">${esc(label || SS.fname(p))}</span><span class="muted">⬇</span></a>`;
  };

  SS.applyTheme();
})();
