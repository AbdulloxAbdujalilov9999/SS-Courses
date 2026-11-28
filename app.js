/* SS-Courses app: hash router, top bar, home, weeks and the lesson page.
 * Other pages (review, checks, projects, materials, me, settings) are in shared/ssc-pages.js,
 * the teacher dashboard in shared/ssc-dashboard.js.
 *
 * Routes:
 *   #/                     home
 *   #/lessons              all 12 weeks
 *   #/week/W               one week
 *   #/lesson/N[/tab]       lesson N: dars, atamalar, qanday, mashq, tugma, amaliy, chipta, uy, xulosa
 *   #/review               daily review           #/checks, #/check/K     weekly checks and the final exam
 *   #/projects, #/project/P                       #/materials            every file
 *   #/me                   my progress            #/settings             settings and account
 *   #/dashboard            teacher dashboard
 */
(function(){
  "use strict";
  const C = window.SSC, SS = window.SS, esc = SS.esc, md = SS.md, L = SS.L;
  const app = () => document.getElementById("app");
  SS.pages = SS.pages || {};

  /* ---------- top bar ---------- */
  function nav(){
    const items = [
      ["#/", L("Bosh sahifa", "Home"), r => r === ""],
      ...(SS.courses.length > 1 ? [["#/courses", L("Kurslar", "Courses"), r => r === "courses"]] : []),
      ["#/lessons", L("Darslar", "Lessons"), r => /^(lessons|week|lesson)/.test(r)],
      ["#/review", L("Takrorlash", "Review"), r => r === "review"],
      ["#/checks", L("Nazorat", "Checks"), r => /^check/.test(r)],
      ["#/projects", L("Loyihalar", "Projects"), r => /^project/.test(r)],
      ["#/materials", L("Materiallar", "Materials"), r => r === "materials"],
      ["#/me", L("Natijalarim", "My progress"), r => r === "me"],
    ];
    if (SS.isTeacher()) items.push(["#/dashboard", L("Panel", "Dashboard"), r => r === "dashboard"]);
    const r = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "";
    const routeKey = location.hash.replace(/^#\/?/, "");
    document.getElementById("mainNav").innerHTML = items.map(([h, t, on]) => `<a href="${h}" class="${on(r === "" ? routeKey : r) ? "on" : ""}">${esc(t)}</a>`).join("");
    SS.updateTopbar();
  }
  SS.updateTopbar = () => {
    const due = SS.srsDue().length, u = SS.cloud && SS.cloud.user;
    const p = SS.cloud && SS.cloud.profile;
    document.getElementById("topActions").innerHTML = `
      ${SS.isTeacher() ? `<span class="teacher-badge" title="${L("Oʻqituvchi rejimi", "Teacher mode")}">${L("OʻQITUVCHI", "TEACHER")}</span>` : ""}
      <a class="pill-xp" href="#/me" title="XP · ${L("ketma-ket kunlar", "streak")}">⚡ ${SS.state.xp || 0} · 🔥 ${SS.streak()}</a>
      ${due ? `<a class="pill-xp" href="#/review" title="${L("Bugungi takrorlash", "Today's review")}">🧠 ${due}</a>` : ""}
      <a class="icon-btn" href="#/settings" title="${L("Sozlamalar", "Settings")}">⚙</a>
      ${u ? `<a class="avatar" href="#/settings" title="${esc((p && p.name) || u.email || "")}">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="">` : esc(((p && p.name) || u.email || "?").slice(0, 1).toUpperCase())}</a>`
          : `<a class="icon-btn" href="#/settings" title="${L("Kirish", "Sign in")}" style="width:auto;padding:0 10px;font-size:13px;font-weight:600">${L("Kirish", "Sign in")}</a>`}`;
  };

  /* ---------- router ---------- */
  function route(){
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [p0, p1, p2] = parts;
    window.scrollTo(0, 0);
    nav();
    const views = {
      "": home, lessons: lessons, week: () => week(+p1), lesson: () => lesson(+p1, p2 || "dars"),
    };
    if (p0 === "courses") return courses();
    const fn = views[p0 || ""] || (SS.pages[p0] && (() => SS.pages[p0](p1, p2)));
    if (fn) fn(); else app().innerHTML = `<div class="empty"><h2>404</h2><a href="#/">${L("Bosh sahifaga", "Go home")}</a></div>`;
    document.title = (SS._title ? SS._title + " · " : "") + "SS-Courses";
    SS._title = "";
  }
  SS.route = route;
  SS.go = h => { if (location.hash === h) route(); else location.hash = h; };

  /* ---------- shared bits ---------- */
  const appLogo = (app, lg) => `<span class="app-logo ${lg ? "lg" : ""} app-${app}">${esc(SS.APPS[app].letter)}</span>`;
  SS.appLogo = appLogo;
  const weekPct = w => Math.round(w.lessons.reduce((a, n) => a + SS.lessonProgress(n), 0) / w.lessons.length);
  function nextLesson(){
    const st = SS.state;
    if (st.last && SS.lesson(st.last) && !SS.lessonDone(st.last)) return SS.lesson(st.last);
    return C.lessons.find(l => !SS.lessonDone(l.n)) || C.lessons[C.lessons.length - 1];
  }
  SS.crumbs = (arr) => `<div class="crumbs">${arr.map(([h, t], i) => (h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`) + (i < arr.length - 1 ? " <span>›</span>" : "")).join(" ")}</div>`;

  /* ---------- course picker ---------- */
  function courses(){
    document.title = L("Kurslar", "Courses") + " · SS-Courses";
    app().innerHTML = `<h1>📚 ${L("Software Squad kurslari", "Software Squad courses")}</h1>
      <p class="muted">${L("Har bir kurs – 3 oy, 12 hafta, 36 dars, 12 nazorat ishi va 4 ta loyiha. Natijalaringiz har bir kurs uchun alohida saqlanadi.", "Each course is 3 months: 12 weeks, 36 lessons, 12 checks and 4 projects. Your progress is kept separately for each course.")}</p>
      <div class="grid grid-2">${SS.courses.map(c => {
        const on = c.id === SS.course.id, st = on ? SS.state : SS.peekState(c.id);
        return `<div class="card course-card ${on ? "on" : ""}" style="--cc:${esc(c.color || "var(--accent)")}">
          <div class="row" style="gap:6px;margin-bottom:8px">${(c.apps || []).map(a => SS.appLogo(a)).join("")}</div>
          <h2 style="margin:6px 0 4px">${esc(c.title)}</h2><div class="muted small" style="margin-bottom:8px">${esc(L(c.titleUz, c.titleEn))}</div>
          <p>${esc(L(c.blurbUz, c.blurbEn))}</p>
          <div class="row small muted" style="margin-bottom:12px"><span>⚡ ${(st && st.xp) || 0} XP</span><span>· 🏅 ${st ? Object.keys(st.badges || {}).length : 0} ${L("nishon", "badges")}</span></div>
          ${on ? `<a class="btn btn-accent" href="#/">${L("Davom etish", "Continue")} →</a> <span class="tag ok">${L("Hozirgi kurs", "Current course")}</span>`
               : `<button class="btn btn-accent" data-course="${esc(c.id)}">${L("Shu kursga oʻtish", "Switch to this course")} →</button>`}
        </div>`; }).join("")}</div>`;
    SS.$$("[data-course]").forEach(b => b.onclick = () => SS.switchCourse(b.dataset.course));
  }
  SS.switchCourse = id => { try { localStorage.setItem("ssc_course", id); } catch (e) {} location.hash = "#/"; location.reload(); };

  /* ---------- home ---------- */
  function home(){
    const nl = nextLesson(), st = SS.state;
    const doneL = C.lessons.filter(l => SS.lessonDone(l.n)).length;
    const due = SS.srsDue().length;
    const CO = SS.course, apps = CO.apps && CO.apps.length ? CO.apps : [];
    app().innerHTML = `
      <section class="hero" ${CO.hero ? `style="background:${esc(CO.hero)}"` : ""}>
        <svg class="hero-deco" viewBox="0 0 100 100"><rect x="0" y="0" width="46" height="46" rx="9" fill="#fff"/><rect x="54" y="0" width="46" height="46" rx="9" fill="#fff"/><rect x="0" y="54" width="46" height="46" rx="9" fill="#fff"/><rect x="54" y="54" width="46" height="46" rx="9" fill="#fff"/></svg>
        ${SS.courses.length > 1 ? `<a class="course-switch" href="#/courses">📚 ${L("Kurslar", "Courses")}: ${SS.courses.map(c => c.id === CO.id ? `<b>${esc(c.title)}</b>` : esc(c.title)).join(" · ")} ⇄</a>` : ""}
        <div class="small" style="letter-spacing:.12em;opacity:.75;font-weight:600">SOFTWARE SQUAD · ${esc(C.title.toUpperCase())}</div>
        <h1>${esc(L(CO.titleUz || C.title, CO.titleEn))}</h1>
        <p>${esc(L(CO.blurbUz || "", CO.blurbEn))}</p>
        <div class="apps">${apps.map(a => `<span><i style="background:var(--${a})"></i>${SS.APPS[a].name}</span>`).join("")}</div>
        <div class="row">
          <a class="btn btn-accent btn-lg" href="#/lesson/${nl.n}">${st.last ? L("Davom etish", "Continue") : L("Boshlash", "Start")}: ${nl.n}-${L("dars", "lesson")} →</a>
          ${due ? `<a class="btn btn-lg" style="background:rgba(255,255,255,.14);color:#fff" href="#/review">🧠 ${L("Takrorlash", "Review")} (${due})</a>` : ""}
        </div>
        <div class="hero-stats">
          <div><b>${doneL}/36</b><span>${L("dars tugadi", "lessons done")}</span></div>
          <div><b>${st.xp || 0}</b><span>XP</span></div>
          <div><b>🔥 ${SS.streak()}</b><span>${L("kun ketma-ket", "day streak")}</span></div>
          <div><b>${Object.keys(st.badges).length}/${SS.BADGES.length}</b><span>${L("nishon", "badges")}</span></div>
        </div>
      </section>

      <div class="section-title section"><h2>${L("12 haftalik reja", "The 12-week plan")}</h2><span class="muted small">${L("3 oy · haftasiga 3 dars + nazorat ishi", "3 months · 3 lessons + a check each week")}</span></div>
      <div class="grid grid-3">${C.weeks.map(weekCard).join("")}</div>

      <div class="section-title section"><h2>${L("Kurs qanday baholanadi", "How the course is graded")}</h2></div>
      <div class="grid grid-4">
        ${[["homework", L("Uy vazifalari va amaliy ishlar", "Homework and practice tasks"), "📝"], ["projects", L("4 ta loyiha", "4 projects"), "🧩"], ["quizzes", L("Haftalik nazorat ishlari (1–11)", "Weekly checks (1–11)"), "✅"], ["finalExam", L("Yakuniy imtihon (12)", "Final exam (12)"), "🎓"]]
          .map(([k, t, i]) => `<div class="stat"><b>${i} ${C.grading.weights[k]}%</b><span>${esc(t)}</span></div>`).join("")}
      </div>
      <p class="muted small" style="margin-top:10px">${L(`Yakuniy baho ${C.grading.certificate}% va undan yuqori boʻlsa – Software Squad sertifikati beriladi.`, `A final grade of ${C.grading.certificate}% or more earns the Software Squad certificate.`)}</p>`;
  }
  function weekCard(w){
    const pct = weekPct(w);
    const ch = w.check && SS.state.chk[w.check];
    return `<a class="card week-card app-${w.app}" href="#/week/${w.week}">
      <div class="row" style="gap:10px">${appLogo(w.app)}<div><div class="wk">${w.week}-${L("hafta", "week")} · ${esc(SS.APPS[w.app].name)}</div><h3>${esc(w.titleUz)}</h3></div></div>
      <div class="muted small">${esc(w.subUz)}</div>
      <div class="items">${w.lessons.map(n => `<span class="tag ${SS.lessonDone(n) ? "ok" : ""}">${n}-${L("dars", "lesson")}</span>`).join("")}
        ${w.check ? `<span class="tag ${ch ? "ok" : ""}">${C.checks.find(c => c.k === w.check).final ? "🎓 " + L("Imtihon", "Exam") : "✅ " + w.check + "-" + L("nazorat", "check")}</span>` : ""}
        ${w.project ? `<span class="tag warn">🧩 ${w.project}-${L("loyiha", "project")}</span>` : ""}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
    </a>`;
  }

  /* ---------- all lessons ---------- */
  function lessons(){
    SS._title = L("Darslar", "Lessons");
    app().innerHTML = `<h1>${L("Darslar", "Lessons")}</h1><p class="muted">${L("36 dars, 12 hafta. Dars sahifasida: taqdimot, atamalar, rasmli qadamlar, mashqlar, «Tugmani top» oʻyini, amaliy ish, chiqish chiptasi va uy vazifasi.", "36 lessons over 12 weeks. Each lesson page has the slides, terms, step-by-step screenshots, practice, the “Find the button” game, a hands-on task, an exit ticket and homework.")}</p>
      ${C.weeks.map(w => `<div class="section app-${w.app}">
        <div class="section-title"><h2 style="color:var(--app)">${w.week}-${L("hafta", "week")}</h2><b>${esc(w.titleUz)}</b><span class="spacer"></span><a class="small" href="#/week/${w.week}">${L("Hafta sahifasi", "Week page")} →</a></div>
        ${w.lessons.map(lessonRow).join("")}
        ${w.check ? checkRow(w.check) : ""}${w.project ? projectRow(w.project) : ""}
      </div>`).join("")}`;
  }
  function lessonRow(n){
    const l = SS.lesson(n), p = SS.lessonProgress(n);
    return `<a class="lesson-row app-${l.app}" href="#/lesson/${n}"><span class="lesson-num">${n}</span>
      <span class="t"><b>${esc(l.titleUz)}</b><span>${esc(l.title)} · ${esc(SS.APPS[l.app].name)}</span>
      <span class="bar" style="display:block;margin-top:6px;max-width:260px"><i style="width:${p}%"></i></span></span>
      <span class="done-dot ${p >= 80 ? "on" : ""}">${p >= 80 ? "✓" : p + "%"}</span></a>`;
  }
  function checkRow(k){
    const c = SS.check(k), r = SS.state.chk[k];
    return `<a class="lesson-row" href="#/check/${k}" style="--app:var(--accent)"><span class="lesson-num" style="background:${c.final ? "var(--office)" : "var(--accent)"}">${c.final ? "🎓" : "✅"}</span>
      <span class="t"><b>${esc(c.titleUz)}</b><span>${esc(c.subUz)} · ${c.minutes} ${L("daqiqa", "min")}</span></span>
      <span class="done-dot ${r ? "on" : ""}" style="${r ? "width:auto;padding:0 8px;border-radius:99px" : ""}">${r ? r.first.score + "/" + r.first.max : "—"}</span></a>`;
  }
  function projectRow(p){
    const pr = SS.project(p);
    return `<a class="lesson-row app-${pr.app}" href="#/project/${p}"><span class="lesson-num" style="background:var(--warn)">🧩</span>
      <span class="t"><b>${esc(pr.titleUz)}</b><span>${esc(pr.subUz)} · ${esc(pr.due)}</span></span><span class="done-dot">→</span></a>`;
  }
  SS.lessonRow = lessonRow; SS.checkRow = checkRow; SS.projectRow = projectRow;

  /* ---------- week ---------- */
  function week(wn){
    const w = SS.week(wn); if (!w) return SS.go("#/lessons");
    SS._title = wn + "-" + L("hafta", "week");
    const secs = w.deck.sections;
    app().innerHTML = `${SS.crumbs([["#/lessons", L("Darslar", "Lessons")], [null, wn + "-" + L("hafta", "week")]])}
      <div class="lesson-head app-${w.app}">${appLogo(w.app, true)}<div><div class="muted small" style="font-weight:600;letter-spacing:.06em">${wn}-${L("HAFTA", "WEEK")} · ${esc(SS.APPS[w.app].name.toUpperCase())}</div><h1>${esc(w.titleUz)}</h1><div class="en">${esc(w.title)} · ${esc(w.subUz)}</div></div></div>
      <div class="app-${w.app}">${w.lessons.map(lessonRow).join("")}${w.check ? checkRow(w.check) : ""}${w.project ? projectRow(w.project) : ""}</div>
      <div class="section-title section"><h2>${L("Haftaning taqdimoti", "This week's slides")}</h2><span class="muted small">${w.deck.slideCount} ${L("slayd", "slides")}</span></div>
      <div class="grid grid-3">${secs.map((s, i) => (s.type === "check" && !SS.isTeacher()) ? "" : `<div class="card flat"><div class="row"><span class="tag">${esc({ intro: L("Kirish", "Intro"), lesson: L("Dars", "Lesson"), check: L("Nazorat", "Check"), project: L("Loyiha", "Project"), other: "" }[s.type] || "")}</span><span class="muted small">${L("slaydlar", "slides")} ${s.start}–${s.end}</span></div>
        <h3 style="margin:8px 0">${esc(s.name)}</h3><button class="btn btn-accent btn-sm" data-pres="${i}">▶ ${L("Koʻrsatish", "Present")}</button></div>`).join("")}</div>
      <div class="section-title section"><h2>${L("Fayllar", "Files")}</h2></div>
      <div class="file-list" style="max-width:640px">${SS.fileLink(w.deck.pptx)}${SS.fileLink(w.deck.pdf)}</div>`;
    SS.$$("[data-pres]").forEach(b => b.onclick = () => SS.present(wn, +b.dataset.pres));
  }

  /* ---------- lesson ---------- */
  const TABS = [
    ["dars", "Dars", "Lesson"], ["atamalar", "Atamalar", "Terms"], ["qanday", "Qanday qilinadi", "How-to"],
    ["mashq", "Mashq A–H", "Practice A–H"], ["tugma", "Tugmani top", "Find the button"], ["amaliy", "Amaliy ish", "Hands-on task"],
    ["chipta", "Chiqish chiptasi", "Exit ticket"], ["uy", "Uy vazifasi", "Homework"], ["xulosa", "Xulosa", "Summary"],
  ];
  function tabDone(n, t){
    const st = SS.state, l = SS.lesson(n);
    switch (t){
      case "mashq": return l.exercises.every(e => st.px["L" + n + "-" + e.letter]);
      case "tugma": return !!st.hs[n];
      case "amaliy": return !!st.prac[n];
      case "chipta": return !!st.exit[n];
      case "uy": return !!(st.hw[n] && st.hw[n].done);
      case "atamalar": return !!st.seen["A" + n];
      case "qanday": return !!st.seen["Q" + n];
    }
    return false;
  }
  function lesson(n, tab){
    const l = SS.lesson(n); if (!l) return SS.go("#/lessons");
    const w = SS.week(l.week);
    if (!TABS.some(t => t[0] === tab)) tab = "dars";
    SS._title = n + "-" + L("dars", "lesson");
    if (SS.state.last !== n){ SS.state.last = n; SS.commit("last"); }
    SS.seedTerms(n);
    const prev = SS.lesson(n - 1), next = SS.lesson(n + 1);
    app().innerHTML = `<div class="app-${l.app}">
      ${SS.crumbs([["#/lessons", L("Darslar", "Lessons")], ["#/week/" + l.week, l.week + "-" + L("hafta", "week")], [null, n + "-" + L("dars", "lesson")]])}
      <div class="lesson-head"><span class="lesson-num" style="width:58px;height:58px;font-size:26px">${n}</span>
        <div style="flex:1;min-width:0"><div class="muted small" style="font-weight:600;letter-spacing:.06em">${n}-${L("DARS", "LESSON")} · ${esc(SS.APPS[l.app].name.toUpperCase())}</div><h1>${esc(l.titleUz)}</h1><div class="en">${esc(l.title)}</div></div>
        <div class="no-print" style="text-align:right;min-width:120px"><div class="small muted">${SS.lessonProgress(n)}%</div><div class="bar" style="width:120px"><i style="width:${SS.lessonProgress(n)}%"></i></div></div></div>
      <nav class="tabs">${TABS.map(([k, uz, en]) => `<a href="#/lesson/${n}/${k}" class="${k === tab ? "on" : ""}">${esc(L(uz, en))}${tabDone(n, k) ? '<span class="tick">✓</span>' : ""}</a>`).join("")}</nav>
      <div id="tabBody"></div>
      <div class="row section no-print" style="justify-content:space-between">
        ${prev ? `<a class="btn btn-ghost" href="#/lesson/${prev.n}">← ${prev.n}-${L("dars", "lesson")}</a>` : "<span></span>"}
        ${nextTab(n, tab)}
        ${next ? `<a class="btn btn-ghost" href="#/lesson/${next.n}">${next.n}-${L("dars", "lesson")} →</a>` : "<span></span>"}
      </div></div>`;
    const body = SS.$("#tabBody");
    ({ dars: tabLesson, atamalar: tabTerms, qanday: tabHowto, mashq: tabPractice, tugma: tabHunt, amaliy: tabTask, chipta: tabExit, uy: tabHomework, xulosa: tabSummary })[tab](body, l, w);
  }
  function nextTab(n, tab){
    const i = TABS.findIndex(t => t[0] === tab), t = TABS[i + 1];
    return t ? `<a class="btn btn-accent" href="#/lesson/${n}/${t[0]}">${L("Keyingi", "Next")}: ${esc(L(t[1], t[2]))} →</a>` : "";
  }
  const lessonSec = (w, n) => w.deck.sections.findIndex(s => s.type === "lesson" && s.num === n);

  /* tab: lesson overview */
  function tabLesson(el, l, w){
    const si = lessonSec(w, l.n);
    const f = l.files;
    el.innerHTML = `
      <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr);gap:18px" id="ovGrid">
        <div>
          <div class="hook">${md(l.hook)}</div>
          <h2 class="section">${L("Bugun oʻrganamiz", "Today you will learn")}</h2>
          <ul class="goals">${l.goals.map(g => `<li>${md(g)}</li>`).join("")}</ul>
          ${l.review && l.review.length ? `<h2 class="section">${L("Takrorlash: oldingi darslardan", "Warm-up: from earlier lessons")}</h2>
            <div class="card flat" id="warm">${l.review.map((r, i) => `<div class="item"><div class="q"><span class="n">${i + 1}.</span><span>${md(r.q).replace(/<span class="gap">_____<\/span>/, `<input class="inp inline-inp" data-i="${i}" autocomplete="off">`)} <a class="small muted" href="#/lesson/${r.from}">(${r.from}-${L("dars", "lesson")})</a></span></div><div class="fb"></div></div>`).join("")}
            <div class="ex-actions"><button class="btn btn-accent btn-sm" id="warmCheck">${L("Tekshirish", "Check")}</button></div></div>` : ""}
        </div>
        <div>
          <div class="card">
            <h3>${L("Taqdimot", "Slides")}</h3>
            <p class="muted small">${si >= 0 ? (w.deck.sections[si].end - w.deck.sections[si].start + 1) + " " + L("slayd · toʻliq ekranda koʻrsatish", "slides · full-screen presenter") : ""}</p>
            ${si >= 0 ? `<button class="btn btn-accent" style="width:100%" id="presBtn">▶ ${L("Darsni boshlash", "Start the lesson")}</button>` : ""}
            <p class="small muted" style="margin:10px 0 0">${L("Tugmalar: ← → · F – toʻliq ekran · O – roʻyxat", "Keys: ← → · F fullscreen · O outline")}${SS.isTeacher() ? L(" · A – javob slaydlari", " · A answer slides") : ""}</p>
          </div>
          <div class="card flat" style="margin-top:14px">
            <h3>${L("Dars fayllari", "Lesson files")}</h3>
            <div class="file-list">
              ${SS.fileLink(w.deck.pptx, L("Hafta taqdimoti (PPTX)", "Week deck (PPTX)"))}
              ${f.practice ? SS.fileLink(f.practice, L("Amaliy ish fayli", "Practice file")) : ""}
              ${f.homework ? SS.fileLink(f.homework.pdf, L("Uy vazifasi (PDF)", "Homework (PDF)")) : ""}
              ${f.homework ? SS.fileLink(f.homework.docx, L("Uy vazifasi (DOCX)", "Homework (DOCX)")) : ""}
              ${f.homeworkFile ? SS.fileLink(f.homeworkFile, L("Uy vazifasi fayli", "Homework file")) : ""}
              ${SS.isTeacher() && f.answerKey ? SS.fileLink(f.answerKey.pdf, "🔑 " + L("Javoblar kaliti (PDF)", "Answer key (PDF)")) : ""}
            </div>
          </div>
        </div>
      </div>
      ${si >= 0 ? `<h2 class="section">${L("Slaydlar", "Slides")}</h2><div id="thumbs" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px"></div>` : ""}`;
    if (innerWidth < 900) SS.$("#ovGrid").style.gridTemplateColumns = "1fr";
    if (si >= 0){ SS.$("#presBtn").onclick = () => SS.present(w.week, si); SS.thumbs(SS.$("#thumbs"), w.week, si); }
    const wc = SS.$("#warmCheck");
    if (wc) wc.onclick = () => {
      SS.$$("#warm .item").forEach((it, i) => {
        const r = l.review[i], inp = SS.$("input", it), ok = inp ? SS.isRoughlyRight(inp.value, r.a) : false;
        if (inp){ inp.classList.toggle("right", ok); inp.classList.toggle("wrong", !ok); }
        const fb = SS.$(".fb", it); fb.className = "fb " + (ok ? "ok" : "no"); fb.innerHTML = ok ? "✓" : "✗ → " + md(r.a);
      });
    };
  }

  /* tab: terms */
  function tabTerms(el, l){
    const st = SS.state; st.seen["A" + l.n] = Date.now(); SS.commit("seen");
    el.innerHTML = `
      <div class="row" style="margin-bottom:12px"><h2 style="margin:0">${L("16 ta yangi atama", "16 new terms")}</h2><span class="spacer"></span>
        <div class="seg" id="termMode"><button data-m="list" class="on">${L("Roʻyxat", "List")}</button><button data-m="cards">${L("Kartochkalar", "Flashcards")}</button><button data-m="quiz">${L("Atama testi", "Term quiz")}</button></div></div>
      <div id="termBody"></div>
      <h2 class="section">${L("Qanday eslab qolamiz?", "How to remember them")}</h2>
      <div class="grid grid-2">${l.termHooks.map(([t, h]) => `<div class="card flat"><b>${esc(t)}</b><p class="muted" style="margin:4px 0 0">${md(h)}</p></div>`).join("")}</div>`;
    const body = SS.$("#termBody");
    const modes = {
      list(){
        body.innerHTML = `<div class="terms">${l.terms.map(([en, uz]) => `<div class="term"><div><b>${esc(en)}</b><span>${md(uz)}</span></div><button class="btn btn-ghost btn-sm say" data-say="${esc(en)}" title="${L("Tinglash", "Listen")}">🔊</button></div>`).join("")}</div>`;
      },
      cards(){
        let i = 0, dir = "en", order = l.terms.map((_, j) => j);
        const draw = () => {
          const [en, uz] = l.terms[order[i]];
          body.innerHTML = `<div class="flash">
            <div class="row" style="justify-content:center;margin-bottom:10px"><div class="seg"><button data-d="en" class="${dir === "en" ? "on" : ""}">EN → UZ</button><button data-d="uz" class="${dir === "uz" ? "on" : ""}">UZ → EN</button></div><button class="btn btn-ghost btn-sm" data-shuffle>🔀</button></div>
            <div class="flash-card" id="fc"><div class="flash-inner"><div class="flash-face">${dir === "en" ? esc(en) : md(uz)}</div><div class="flash-face back">${dir === "en" ? md(uz) : esc(en)}</div></div></div>
            <div class="row" style="justify-content:center"><button class="btn" data-nav="-1">←</button><span class="muted">${i + 1} / ${order.length}</span><button class="btn" data-nav="1">→</button><button class="btn btn-ghost" data-say="${esc(en)}">🔊</button></div>
            <p class="small muted" style="margin-top:8px">${L("Kartani bosing – orqasi ochiladi", "Tap the card to flip it")}</p></div>`;
          SS.$("#fc").onclick = () => SS.$("#fc").classList.toggle("flip");
          SS.$$("[data-nav]", body).forEach(b => b.onclick = () => { i = (i + +b.dataset.nav + order.length) % order.length; draw(); });
          SS.$$("[data-d]", body).forEach(b => b.onclick = () => { dir = b.dataset.d; draw(); });
          SS.$("[data-shuffle]", body).onclick = () => { order.sort(() => Math.random() - .5); i = 0; draw(); };
        };
        draw();
      },
      quiz(){
        body.innerHTML = `<div class="card flat"><p class="muted">${L("Oʻzbekcha maʼnosiga qarab inglizcha atamani yozing.", "Write the English term for each Uzbek meaning.")}</p>
          ${l.termQuiz.map(q => `<div class="item"><div class="q"><span class="n">${q.n}.</span><span style="flex:1">${md(q.q)}</span><input class="inp" data-n="${q.n}" autocomplete="off" spellcheck="false"></div><div class="fb"></div></div>`).join("")}
          <div class="ex-actions"><button class="btn btn-accent" id="tqCheck">${L("Tekshirish", "Check")}</button><span class="score"></span></div></div>`;
        SS.$("#tqCheck").onclick = () => {
          let r = 0; const det = [];
          l.termQuiz.forEach(q => {
            const inp = SS.$(`input[data-n="${q.n}"]`, body), ok = SS.isRight(inp.value, q.answer);
            if (ok) r++; det.push({ n: q.n, ok, q: q.q, answer: q.answer });
            inp.classList.toggle("right", ok); inp.classList.toggle("wrong", !ok);
            const fb = inp.closest(".item").querySelector(".fb"); fb.className = "fb " + (ok ? "ok" : "no"); fb.innerHTML = ok ? "✓" : "✗ → " + esc(q.answer);
          });
          SS.$(".score", body).textContent = r + " / " + l.termQuiz.length;
          SS.recordPractice("L" + l.n + "-TQ", r, l.termQuiz.length, det, l.n + "-" + L("dars atama testi", "lesson term quiz"));
        };
      },
    };
    SS.$$("#termMode button").forEach(b => b.onclick = () => { SS.$$("#termMode button").forEach(x => x.classList.toggle("on", x === b)); modes[b.dataset.m](); });
    el.addEventListener("click", e => { const s = e.target.closest("[data-say]"); if (s){ e.stopPropagation(); SS.say(s.dataset.say); } });
    modes.list();
  }

  /* tab: how-to (skills with screenshots and hotspots) */
  function tabHowto(el, l){
    const st = SS.state; st.seen["Q" + l.n] = Date.now(); SS.commit("seen");
    el.innerHTML = `<p class="muted">${L("Har bir koʻnikma: qisqa tushuntirish, menyu yoʻli, qadamlar va rasm. Qadamni bosing – rasmda u qayerda ekani yonib turadi. Rasmni bossangiz, kattalashadi.", "Each skill: a short explanation, the menu path, the steps and a screenshot. Click a step to highlight it on the picture. Click the picture to enlarge it.")}</p>
      <div class="row" style="gap:6px;margin-bottom:16px;flex-wrap:wrap">${l.skills.map((s, i) => `<a class="tag" href="#sk${i}" data-jump="${i}">${i + 1}. ${esc(SS.plain(s.title))}</a>`).join("")}</div>
      ${l.skills.map((s, i) => `<section class="card" id="sk${i}" style="margin-bottom:18px">
        <div class="skill">
          <div>
            <div class="shot" data-img="${esc(s.image)}"><img src="${SS.img(s.image)}" alt="${esc(SS.plain(s.title))}" loading="lazy"></div>
            ${s.images && s.images.length ? `<div class="thumbs"><button class="on" data-sw="${esc(s.image)}"><img src="${SS.img(s.image)}" alt="" loading="lazy"></button>${s.images.map(x => `<button data-sw="${esc(x.image)}" data-cap="${esc(x.cap)}"><img src="${SS.img(x.image)}" alt="" loading="lazy"></button>`).join("")}</div><div class="cap"></div>` : ""}
          </div>
          <div>
            <div class="skill-head"><span class="n">${i + 1}</span><h3>${md(s.title)}</h3></div>
            <p>${md(s.oneLine)}</p>
            ${s.path ? `<div class="path">${s.path.split("→").map(x => esc(x.trim())).join(" <i>→</i> ")}</div>` : ""}
            ${s.keys && s.keys.length ? `<div style="margin-bottom:10px">${s.keys.map(k => `<kbd>${esc(k)}</kbd>`).join(" ")}</div>` : ""}
            <ol class="steps">${s.steps.map((t, k) => `<li data-k="${k + 1}" class="${hasMark(s.image, k + 1) ? "" : "nomark"}">${md(t)}</li>`).join("")}</ol>
            ${s.tip ? `<div class="tipbox"><b>💡 ${L("Maslahat:", "Tip:")}</b> ${md(s.tip)}</div>` : ""}
          </div>
        </div></section>`).join("")}`;
    function hasMark(id, n){ const im = C.images[id]; return !!(im && im.marks.some(m => m.n === n)); }
    SS.$$("section.card", el).forEach((sec, i) => {
      const s = l.skills[i], shot = SS.$(".shot", sec), img = SS.$("img", shot);
      img.onclick = () => SS.lightbox(img.src);
      SS.$$(".steps li", sec).forEach(li => {
        const on = () => { SS.$$(".steps li", sec).forEach(x => x.classList.toggle("on", x === li)); highlight(shot, +li.dataset.k); };
        li.onclick = on; li.onmouseenter = () => { if (matchMedia("(hover:hover)").matches) on(); };
      });
      SS.$$("[data-sw]", sec).forEach(b => b.onclick = () => {
        SS.$$("[data-sw]", sec).forEach(x => x.classList.toggle("on", x === b));
        shot.dataset.img = b.dataset.sw; img.src = SS.img(b.dataset.sw);
        SS.$(".hl", shot) && SS.$(".hl", shot).remove();
        SS.$(".cap", sec).innerHTML = b.dataset.cap ? md(b.dataset.cap) : "";
      });
    });
    function highlight(shot, n){
      let hl = SS.$(".hl", shot);
      const im = C.images[shot.dataset.img], m = im && im.marks.find(x => x.n === n);
      if (!m){ if (hl) hl.remove(); return; }
      if (!hl){ hl = document.createElement("div"); hl.className = "hl"; shot.appendChild(hl); }
      const [x, y, w, h] = m.box, pad = .006;
      Object.assign(hl.style, { left: (x - pad) * 100 + "%", top: (y - pad * 1.7) * 100 + "%", width: (w + 2 * pad) * 100 + "%", height: (h + pad * 3.4) * 100 + "%" });
    }
  }

  /* tab: practice A–H */
  function tabPractice(el, l){
    el.innerHTML = `<div class="notice no-print" style="margin-bottom:16px">${L("8 ta mashq. Har biri darhol tekshiriladi. Notoʻgʻri javoblar «Takrorlash» boʻlimiga tushadi. Har bir yangi toʻgʻri javob – 10 XP.", "8 exercises, checked instantly. Wrong answers go into your Review. Every new right answer is 10 XP.")}</div>
      <div id="exList"></div>`;
    const list = SS.$("#exList");
    l.exercises.forEach(ex => {
      const box = document.createElement("div"); box.className = "card"; box.style.marginBottom = "16px"; list.appendChild(box);
      const key = "L" + l.n + "-" + ex.letter, prev = SS.state.px[key];
      SS.Exercise(box, ex, { mode: "practice", key, onScore: (r, t, det, silent) => { if (!silent) SS.recordPractice(key, r, t, det, l.n + "-" + L("dars", "lesson") + " · " + ex.letter); else SS.recordPractice(key, r, t, [], null); } });
      if (prev) box.querySelector(".score").textContent = L("Eng yaxshi natija: ", "Best: ") + prev[0] + " / " + prev[1];
    });
  }

  /* tab: "find the button" — click the right place on the screenshot */
  function huntQuestions(l){
    const qs = [];
    const add = (img, n, prompt, kind) => {
      const im = C.images[img]; if (!im) return;
      const m = im.marks.find(x => x.n === n); if (!m || !m.box) return;
      qs.push({ img, n, prompt, kind });
    };
    l.exercises.concat(l.homework.exercises).forEach(ex => {
      if (ex.type === "label" && ex.shot) ex.items.forEach(it => add(ex.shot, it.n, it.answer, "name"));
    });
    l.skills.forEach(s => s.steps.forEach((t, k) => add(s.image, k + 1, t, "step")));
    // names first (clear targets), then steps; at most 10, varied
    const names = qs.filter(q => q.kind === "name").sort(() => Math.random() - .5);
    const steps = qs.filter(q => q.kind === "step").sort(() => Math.random() - .5);
    return names.slice(0, 5).concat(steps).slice(0, 10).sort(() => Math.random() - .5);
  }
  function tabHunt(el, l){
    const qs = huntQuestions(l);
    if (!qs.length){ el.innerHTML = `<div class="empty">${L("Bu darsda rasmli topshiriq yoʻq.", "No picture tasks in this lesson.")}</div>`; return; }
    let i = 0, right = 0, tries = 0; const res = [];
    const prev = SS.state.hs[l.n];
    function draw(){
      const q = qs[i], im = C.images[q.img];
      el.innerHTML = `<div class="card">
        <div class="row"><h2 style="margin:0">🖱️ ${L("Tugmani top!", "Find the button!")}</h2><span class="spacer"></span><span class="muted small">${prev ? L("Eng yaxshi: ", "Best: ") + prev[0] + "/" + prev[1] + " · " : ""}${i + 1} / ${qs.length}</span></div>
        <p class="muted small">${L("Rasmdagi raqamlar yashirilgan. Topshiriqda aytilgan joyni rasmda bosing. 2 ta urinish bor.", "The numbers on the picture are hidden. Click the place the task names. You have 2 tries.")}</p>
        <div class="hs-progress">${qs.map((_, j) => `<i class="${j < i ? (res[j] ? "ok" : "no") : j === i ? "cur" : ""}"></i>`).join("")}</div>
        <div class="hs-q">${q.kind === "name" ? `${L("Bosing:", "Click:")} <b>${esc(q.prompt)}</b>` : `<span>${L("Qadam:", "Step:")} ${md(q.prompt)}</span>`}</div>
        <div class="shot cover-badges" id="hsShot" style="max-width:980px"><img src="${SS.img(q.img)}" alt="" style="cursor:crosshair">
          ${im.marks.filter(m => m.badge).map(m => `<span class="badge-cover" style="left:${m.badge[0] * 100}%;top:${m.badge[1] * 100}%"></span>`).join("")}</div>
        <div class="ex-actions"><span class="fbline"></span><span class="spacer"></span><button class="btn btn-ghost btn-sm" id="hsSkip">${L("Bilmayman – koʻrsat", "Show me")}</button></div></div>`;
      const shot = SS.$("#hsShot"), img = SS.$("img", shot);
      img.onclick = e => {
        const r = img.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        const m = im.marks.find(mm => mm.n === q.n), [bx, by, bw, bh] = m.box;
        const mx = Math.max(.012, (0.035 - bw) / 2), my = Math.max(.02, (0.06 - bh) / 2);
        const hit = x >= bx - mx && x <= bx + bw + mx && y >= by - my && y <= by + bh + my;
        if (hit) return answer(true);
        const p = document.createElement("span"); p.className = "ping"; p.style.left = x * 100 + "%"; p.style.top = y * 100 + "%"; shot.appendChild(p); setTimeout(() => p.remove(), 700);
        tries++;
        SS.$(".fbline").innerHTML = `<span style="color:var(--bad)">✗ ${L("Bu yer emas", "Not there")}${tries < 2 ? " – " + L("yana urinib koʻring", "try again") : ""}</span>`;
        if (tries >= 2) answer(false);
      };
      SS.$("#hsSkip").onclick = () => answer(false);
    }
    function answer(ok){
      const q = qs[i], im = C.images[q.img], m = im.marks.find(mm => mm.n === q.n), shot = SS.$("#hsShot");
      const box = document.createElement("div"); box.className = "hit " + (ok ? "good" : "miss");
      const [x, y, w, h] = m.box; Object.assign(box.style, { left: x * 100 + "%", top: y * 100 + "%", width: w * 100 + "%", height: h * 100 + "%" });
      shot.appendChild(box);
      SS.$("img", shot).onclick = null;
      res[i] = ok; if (ok) right++;
      if (!ok) SS.srsAdd("w:H" + l.n + "-" + q.img + "-" + q.n, { q: (q.kind === "name" ? L("Rasmda qayerda: ", "Where is: ") : L("Qadam: ", "Step: ")) + SS.plain(q.prompt), a: L("rasmdagi ", "number ") + q.n + L("-raqam (", " on the picture (") + q.img + ")", from: l.n + "-" + L("dars", "lesson"), img: q.img, n: q.n });
      SS.$(".fbline").innerHTML = ok ? `<b style="color:var(--ok)">✓ ${L("Topdingiz!", "Found it!")}</b>` : `<span style="color:var(--bad)">${L("Toʻgʻri joy yashil bilan koʻrsatildi", "The right place is outlined")}</span>`;
      const sk = SS.$("#hsSkip"); sk.textContent = i + 1 < qs.length ? L("Keyingisi →", "Next →") : L("Natija", "Result"); sk.className = "btn btn-accent btn-sm";
      sk.onclick = () => { i++; tries = 0; if (i < qs.length) draw(); else finish(); };
    }
    function finish(){
      const st = SS.state, p = st.hs[l.n], best = p ? Math.max(p[0], right) : right;
      st.hs[l.n] = [best, qs.length, Date.now()]; SS.commit("hs");
      const gain = Math.max(0, right - (p ? p[0] : 0)); if (gain) SS.addXP(gain * 10, L("Tugmani top", "Find the button"));
      if (right === qs.length) SS.confetti();
      SS.checkBadges();
      el.innerHTML = `<div class="card" style="text-align:center;padding:36px 18px"><div style="font-size:48px">${right === qs.length ? "🏆" : right >= qs.length * .7 ? "👏" : "💪"}</div>
        <h2>${right} / ${qs.length}</h2><p class="muted">${L("Har safar savollar aralashadi.", "The questions are mixed every time.")}</p>
        <div class="row" style="justify-content:center"><button class="btn btn-accent" id="hsAgain">${L("Yana oʻynash", "Play again")}</button><a class="btn btn-ghost" href="#/lesson/${l.n}/amaliy">${L("Amaliy ish", "Hands-on task")} →</a></div></div>`;
      SS.$("#hsAgain").onclick = () => tabHunt(el, l);
    }
    draw();
  }

  /* tab: hands-on task (+ scenario and class game) */
  function tabTask(el, l){
    const p = l.practice, st = SS.state;
    const ticks = (st.prac[l.n] && st.prac[l.n].ticks) || {};
    el.innerHTML = `
      <div class="skill">
        <div class="card">
          <h2>🛠️ ${md(p.title)}</h2>
          <p>${md(p.goal)}</p>
          ${p.file ? `<div class="file-list" style="margin-bottom:12px">${SS.fileLink(p.file, L("Amaliy ish fayli: ", "Practice file: ") + SS.fname(p.file))}</div>` : `<p class="small muted">${L("Fayl kerak emas – yangi hujjatdan boshlang.", "No file needed – start from a new document.")}</p>`}
          <h3>${L("Qadamlar", "Steps")}</h3>
          <ol class="steps">${p.steps.map(s => `<li class="nomark" style="cursor:default">${md(s)}</li>`).join("")}</ol>
        </div>
        <div>
          ${p.image ? `<div class="shot"><img src="${SS.img(p.image)}" alt="" loading="lazy"></div><p class="cap">${L("Natija shunday koʻrinishi kerak.", "This is what the result should look like.")}</p>` : ""}
          <div class="card" style="margin-top:12px">
            <h3>✅ ${L("Oʻzingizni tekshiring", "Check your work")}</h3>
            <ul class="checklist">${p.check.map((c, i) => `<li><input type="checkbox" data-i="${i}" ${ticks[i] ? "checked" : ""} id="pc${i}"><label for="pc${i}">${md(c)}</label></li>`).join("")}</ul>
            <button class="btn btn-ok" id="pracDone" style="margin-top:8px" ${st.prac[l.n] && st.prac[l.n].done ? "disabled" : ""}>${st.prac[l.n] && st.prac[l.n].done ? "✓ " + L("Bajarildi", "Done") : L("Amaliy ishni bajardim", "I've done the task")}</button>
          </div>
        </div>
      </div>
      ${l.scenario ? `<h2 class="section">💼 ${L("Vaziyat", "Case")}: ${md(l.scenario.title)}</h2>
        <div class="card flat">${l.scenario.text.map(t => `<p>${md(t)}</p>`).join("")}
          <ol>${l.scenario.qs.map(q => `<li style="margin-bottom:8px">${md(q.q)} <details><summary class="small muted" style="cursor:pointer">${L("Javob", "Answer")}</summary>${md(q.a)}</details></li>`).join("")}</ol></div>` : ""}
      ${l.game ? `<h2 class="section">🎲 ${L("Sinf oʻyini", "Class game")}: ${md(l.game.name)}</h2>
        <div class="card flat"><ol>${l.game.steps.map(s => `<li>${md(s)}</li>`).join("")}</ol><p class="small muted">${L("Kerak boʻladi: ", "You need: ")}${md(l.game.materials)}</p></div>` : ""}`;
    const im = SS.$(".shot img", el); if (im) im.onclick = () => SS.lightbox(im.src);
    SS.$$(".checklist input", el).forEach(cb => cb.onchange = () => {
      const pr = st.prac[l.n] = st.prac[l.n] || { ticks: {} }; pr.ticks = pr.ticks || {};
      pr.ticks[cb.dataset.i] = cb.checked; if (!pr.done) delete pr.done;
      if (!Object.values(pr.ticks).some(Boolean) && !pr.done) delete st.prac[l.n];
      SS.commit("prac");
    });
    SS.$("#pracDone").onclick = e => {
      const n = SS.$$(".checklist input:checked", el).length;
      if (n < p.check.length){ SS.toast(L("Avval hamma bandlarni tekshirib, belgilang", "Tick every item first")); return; }
      st.prac[l.n] = Object.assign(st.prac[l.n] || {}, { done: Date.now() }); SS.commit("prac");
      SS.addXP(50, L("Amaliy ish", "Hands-on task")); SS.confetti();
      e.target.disabled = true; e.target.textContent = "✓ " + L("Bajarildi", "Done");
    };
  }

  /* tab: exit ticket */
  function tabExit(el, l){
    const prev = SS.state.exit[l.n];
    el.innerHTML = `<div class="card" style="max-width:760px">
      <h2>🎟️ ${L("Chiqish chiptasi", "Exit ticket")}</h2>
      <p class="muted">${L("Dars oxirida 5 ta qisqa savol. 4 tadan koʻpiga toʻgʻri javob bersangiz – darsni oʻzlashtirdingiz.", "5 quick questions at the end of the lesson. Get 4 or more right and you've got it.")}${prev ? " " + L("Oldingi natija: ", "Last result: ") + prev[0] + "/5" : ""}</p>
      ${l.exit.map((q, i) => `<div class="item"><div class="q"><span class="n">${i + 1}.</span><span>${md(q.q).replace(/<span class="gap">_____<\/span>/, `<input class="inp inline-inp" data-i="${i}" autocomplete="off" spellcheck="false">`)}${md(q.q).includes("gap") ? "" : ` <input class="inp inline-inp" data-i="${i}" autocomplete="off">`} <span class="small muted">(${md(q.uz)})</span></span></div><div class="fb"></div></div>`).join("")}
      <div class="ex-actions"><button class="btn btn-accent" id="exCheck">${L("Tekshirish", "Check")}</button><span class="score"></span></div></div>`;
    SS.$("#exCheck").onclick = () => {
      let r = 0; const det = [];
      l.exit.forEach((q, i) => {
        const inp = SS.$(`input[data-i="${i}"]`, el), ok = SS.isRoughlyRight(inp.value, q.a);
        if (ok) r++; det.push({ n: i + 1, ok, q: q.q, answer: q.a });
        inp.classList.toggle("right", ok); inp.classList.toggle("wrong", !ok);
        const fb = inp.closest(".item").querySelector(".fb"); fb.className = "fb " + (ok ? "ok" : "no"); fb.innerHTML = ok ? "✓" : "✗ → " + md(q.a);
      });
      const st = SS.state, p = st.exit[l.n];
      st.exit[l.n] = [Math.max(r, p ? p[0] : 0), 5, Date.now()]; SS.commit("exit");
      det.filter(d => !d.ok).forEach(d => SS.srsAdd("w:E" + l.n + "-" + d.n, { q: SS.plain(d.q), a: SS.plain(d.answer), from: l.n + "-" + L("dars", "lesson") }));
      const gain = Math.max(0, r - (p ? p[0] : 0)); if (gain) SS.addXP(gain * 10, L("Chiqish chiptasi", "Exit ticket"));
      SS.$(".score", el).textContent = r + " / 5 " + (r >= 4 ? "✓ " + L("Darsni oʻzlashtirdingiz!", "Lesson mastered!") : L("– «Qanday qilinadi»ni yana koʻrib chiqing", "– look at the How-to again"));
      if (r === 5) SS.confetti();
    };
  }

  /* tab: homework */
  function tabHomework(el, l){
    const st = SS.state, hw = st.hw[l.n] = st.hw[l.n] || { answers: {}, scores: {}, req: {} };
    hw.answers = hw.answers || {}; hw.scores = hw.scores || {}; hw.req = hw.req || {};
    const t = l.homework.task, f = l.files, grade = SS.cloud && SS.cloud.myGrades && SS.cloud.myGrades.task && SS.cloud.myGrades.task[l.n];
    el.innerHTML = `
      <div class="notice" style="margin-bottom:16px">${L("Uy vazifasi 2 qismdan iborat: 6 ta mashq (shu yerda bajariladi va tekshiriladi, har bir mashqni bir marta tekshirish mumkin) va kompyuterda bajariladigan topshiriq (faylni oʻqituvchiga topshirasiz).", "Homework has 2 parts: 6 exercises (done and checked here, each can be checked once) and a computer task (you hand the file to your teacher).")}
        ${hw.done ? `<br><b style="color:var(--ok)">✓ ${L("Topshirilgan", "Handed in")}: ${new Date(hw.done).toLocaleDateString()}</b>` : ""}${grade != null ? `<br><b>${L("Oʻqituvchi bahosi (topshiriq): ", "Teacher's mark (task): ")}${grade}/10</b>` : ""}</div>
      <div class="file-list no-print" style="max-width:640px;margin-bottom:18px">
        ${f.homework ? SS.fileLink(f.homework.pdf, L("Uy vazifasi – chop etish uchun (PDF)", "Homework – to print (PDF)")) : ""}
        ${f.homework ? SS.fileLink(f.homework.docx, L("Uy vazifasi (DOCX)", "Homework (DOCX)")) : ""}
        ${SS.isTeacher() && f.answerKey ? SS.fileLink(f.answerKey.pdf, "🔑 " + L("Javoblar kaliti (PDF)", "Answer key (PDF)")) : ""}
      </div>
      <div id="hwList"></div>
      <div class="card" style="margin-top:6px">
        <h2>💻 ${md(t.title)}</h2>
        <p>${md(t.taskUz)}</p>
        ${t.file ? `<div class="file-list" style="max-width:560px;margin-bottom:12px">${SS.fileLink(t.file, L("Topshiriq fayli: ", "Task file: ") + SS.fname(t.file))}</div>` : ""}
        <h3>${L("Talablar", "Requirements")}</h3>
        <ul class="checklist">${t.requirements.map((r, i) => `<li><input type="checkbox" id="rq${i}" data-i="${i}" ${hw.req[i] ? "checked" : ""}><label for="rq${i}">${md(r)}</label></li>`).join("")}</ul>
        <div class="ex-actions"><button class="btn btn-ok" id="hwDone" ${hw.done ? "disabled" : ""}>${hw.done ? "✓ " + L("Topshirildi", "Handed in") : L("Uy vazifasini topshirdim", "Hand in homework")}</button>
          <span class="small muted">${L("Faylni oʻqituvchingiz aytgan joyga yuboring (Teams, Telegram yoki e-mail).", "Send the file where your teacher asked (Teams, Telegram or e-mail).")}</span></div>
      </div>`;
    const list = SS.$("#hwList");
    const hwL = (ex, idx) => ex.letter || String(idx + 1);
    l.homework.exercises.forEach((ex0, idx) => {
      const ex = Object.assign({}, ex0, { letter: hwL(ex0, idx) });
      const box = document.createElement("div"); box.className = "card"; box.style.marginBottom = "16px"; list.appendChild(box);
      const key = "H" + l.n + "-" + ex.letter, done = hw.scores[ex.letter];
      const api = SS.Exercise(box, ex, {
        mode: "homework", key, answers: hw.answers[ex.letter] || {},
        onChange: a => { hw.answers[ex.letter] = a; SS.commit("hw"); },
        onScore: (r, tt, det, silent) => {
          if (silent && hw.scores[ex.letter]) return;
          hw.scores[ex.letter] = [r, tt, Date.now()]; SS.commit("hw");
          det.filter(d => !d.ok).forEach(d => SS.srsAdd("w:" + key + "-" + d.n, { q: SS.plain(d.q), a: SS.plain(d.answer), from: l.n + "-" + L("uy vazifasi", "homework") }));
          if (!silent) SS.addXP(r * 10, L("Uy vazifasi", "Homework"));
        },
      });
      if (done){ api.check(true); box.querySelector(".score").textContent = done[0] + " / " + done[1]; }
    });
    SS.$$(".checklist input", el).forEach(cb => cb.onchange = () => { hw.req[cb.dataset.i] = cb.checked; SS.commit("hw"); });
    SS.$("#hwDone").onclick = e => {
      const notChecked = l.homework.exercises.filter((ex, idx) => !hw.scores[hwL(ex, idx)]).length;
      if (notChecked){ SS.toast(L(`Avval ${notChecked} ta mashqni tekshiring`, `Check the ${notChecked} remaining exercise(s) first`)); return; }
      hw.done = Date.now(); SS.commit("hw"); SS.addXP(50, L("Uy vazifasi topshirildi", "Homework handed in")); SS.confetti();
      e.target.disabled = true; e.target.textContent = "✓ " + L("Topshirildi", "Handed in");
    };
  }

  /* tab: summary */
  function tabSummary(el, l){
    el.innerHTML = `
      <div class="grid grid-2">
        <div class="card"><h2>📌 ${L("Bugun nimani oʻrgandik", "What we learned")}</h2><ol>${l.recap.map(r => `<li style="margin-bottom:6px">${md(r)}</li>`).join("")}</ol></div>
        <div class="mnemonic"><h2>🧠 ${md(l.mnemonic.title)}</h2><p>${md(l.mnemonic.text)}</p>${l.mnemonic.chant && l.mnemonic.chant.length ? `<div class="chant">${l.mnemonic.chant.map(esc).join("<br>")}</div>` : ""}</div>
      </div>
      ${l.table ? `<h2 class="section">${md(l.table.title)}</h2><div class="tbl-wrap"><table class="tbl"><thead><tr>${l.table.header.map(h => `<th>${md(h)}</th>`).join("")}</tr></thead><tbody>${l.table.rows.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
      <h2 class="section">⚠️ ${L("Koʻp uchraydigan xatolar", "Common mistakes")}</h2>
      <div class="tbl-wrap"><table class="tbl mistakes"><thead><tr><th>✗ ${L("Notoʻgʻri", "Wrong")}</th><th>✓ ${L("Toʻgʻri", "Right")}</th><th>${L("Nega", "Why")}</th></tr></thead><tbody>${l.mistakes.map(m => `<tr><td>${md(m[0])}</td><td>${md(m[1])}</td><td>${md(m[2])}</td></tr>`).join("")}</tbody></table></div>
      <h2 class="section">💡 ${L("Maslahatlar", "Tips")}</h2>
      <div class="grid grid-2">${l.tips.map(t => `<div class="card flat">${md(t)}</div>`).join("")}</div>`;
  }

  /* ---------- start ---------- */
  function start(){
    SS.applyTheme();
    addEventListener("hashchange", route);
    route();
    SS.checkBadges();
  }
  SS.start = start;
})();
