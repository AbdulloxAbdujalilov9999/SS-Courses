/* SS-Courses pages: daily review, checks (online test + practical), projects, materials,
 * my progress (XP, badges, grade estimate) and settings. Registered on SS.pages[route].
 */
(function(){
  "use strict";
  const C = window.SSC, SS = window.SS, esc = SS.esc, md = SS.md, L = SS.L;
  const app = () => document.getElementById("app");
  const P = SS.pages = SS.pages || {};

  /* ================= daily review ================= */
  P.review = function(){
    SS._title = L("Takrorlash", "Review");
    const due = SS.srsDue().sort(() => Math.random() - .5).slice(0, 15);
    const total = Object.keys(SS.state.srs).length;
    if (!due.length){
      app().innerHTML = `<h1>🧠 ${L("Bugungi takrorlash", "Today's review")}</h1>
        <div class="card empty"><div style="font-size:46px">✨</div><h2>${L("Bugun takrorlash yoʻq", "Nothing to review today")}</h2>
        <p>${L(`Navbatda ${total} ta element bor. Yangi darsni oching – uning atamalari ertadan takrorlashga tushadi. Notoʻgʻri javoblaringiz ham shu yerga keladi.`, `${total} items are in your queue. Open a new lesson and its terms join tomorrow's review. Your wrong answers come here too.`)}</p>
        <a class="btn btn-accent" href="#/lessons">${L("Darslarga", "To lessons")}</a></div>${boxesHTML()}`;
      return;
    }
    let i = 0, right = 0;
    function card(key){
      if (key.startsWith("t:")){
        const [, n, j] = key.split(":"), l = SS.lesson(n), t = l && l.terms[+j];
        if (!t) return null;
        const dir = Math.random() < .5;
        return { prompt: dir ? md(t[1]) : esc(t[0]), ask: dir ? L("Inglizcha atamasini yozing", "Write the English term") : L("Maʼnosini eslang", "Recall the meaning"), answer: dir ? t[0] : t[1], typed: dir, from: n + "-" + L("dars", "lesson"), say: t[0] };
      }
      const w = SS.state.wrong[key.slice(2)]; if (!w) return null;
      return { prompt: md(w.q), ask: L("Avval xato qilgan savolingiz", "A question you got wrong before"), answer: w.a, typed: !w.img, from: w.from, img: w.img };
    }
    function draw(){
      if (i >= due.length) return finish();
      const key = due[i], c = card(key);
      if (!c){ SS.srsGrade(key, true); i++; return draw(); }
      app().innerHTML = `<h1>🧠 ${L("Bugungi takrorlash", "Today's review")}</h1>
        <div class="hs-progress" style="max-width:640px">${due.map((_, j) => `<i class="${j < i ? "ok" : j === i ? "cur" : ""}"></i>`).join("")}</div>
        <div class="card" style="max-width:640px">
          <div class="row"><span class="tag">${esc(c.from || "")}</span><span class="spacer"></span><span class="muted small">${i + 1} / ${due.length}</span></div>
          <p class="muted small" style="margin:12px 0 4px">${esc(c.ask)}</p>
          <div style="font:600 22px var(--font-display);margin-bottom:14px">${c.prompt}</div>
          ${c.img ? `<div class="shot" style="margin-bottom:12px"><img src="${SS.img(c.img)}" alt=""></div>` : ""}
          ${c.typed ? `<input class="inp" id="rvIn" style="width:100%" autocomplete="off" spellcheck="false" placeholder="${L("Javobingiz…", "Your answer…")}">` : ""}
          <div id="rvAns" class="hidden" style="margin-top:12px;padding:12px;border-radius:10px;background:var(--surface-2)"><b>${md(c.answer)}</b></div>
          <div class="ex-actions" id="rvAct">${c.typed ? `<button class="btn btn-accent" id="rvCheck">${L("Tekshirish", "Check")}</button>` : `<button class="btn btn-accent" id="rvShow">${L("Javobni koʻrish", "Show answer")}</button>`}
            ${c.say ? `<button class="btn btn-ghost" id="rvSay">🔊</button>` : ""}</div>
        </div>${boxesHTML()}`;
      const show = (auto) => {
        SS.$("#rvAns").classList.remove("hidden");
        SS.$("#rvAct").innerHTML = auto != null
          ? `<b style="color:${auto ? "var(--ok)" : "var(--bad)"}">${auto ? "✓ " + L("Toʻgʻri", "Right") : "✗ " + L("Notoʻgʻri", "Wrong")}</b><span class="spacer"></span>${auto ? "" : `<button class="btn btn-ghost btn-sm" data-g="1">${L("Men toʻgʻri yozdim", "I was right")}</button>`}<button class="btn btn-accent" data-g="${auto ? 1 : 0}">${L("Keyingisi", "Next")} →</button>`
          : `<button class="btn" data-g="0" style="background:var(--bad-soft);color:var(--bad)">✗ ${L("Bilmadim", "Didn't know")}</button><button class="btn btn-ok" data-g="1">✓ ${L("Bildim", "Knew it")}</button>`;
        SS.$$("[data-g]").forEach(b => b.onclick = () => { const ok = b.dataset.g === "1"; if (ok) right++; SS.srsGrade(key, ok); if (ok) SS.addXP(5); i++; draw(); });
      };
      const inp = SS.$("#rvIn");
      if (inp){ inp.focus(); inp.onkeydown = e => { if (e.key === "Enter") SS.$("#rvCheck") && SS.$("#rvCheck").click(); }; SS.$("#rvCheck").onclick = () => { const ok = SS.isRoughlyRight(inp.value, c.answer); inp.classList.add(ok ? "right" : "wrong"); show(ok); }; }
      const sh = SS.$("#rvShow"); if (sh) sh.onclick = () => show(null);
      const sy = SS.$("#rvSay"); if (sy) sy.onclick = () => SS.say(c.say);
    }
    function finish(){
      SS.checkBadges();
      app().innerHTML = `<h1>🧠 ${L("Bugungi takrorlash", "Today's review")}</h1><div class="card empty" style="max-width:640px"><div style="font-size:46px">🎉</div>
        <h2>${right} / ${due.length}</h2><p>${L("Bugungi takrorlash tugadi. Ertaga yana keling – ketma-ket kunlar seriyangiz uzilmasin!", "Today's review is done. Come back tomorrow to keep your streak!")}</p>
        <div class="row" style="justify-content:center"><a class="btn btn-accent" href="#/">${L("Bosh sahifa", "Home")}</a>${SS.srsDue().length ? `<button class="btn" onclick="SS.route()">${L("Yana", "More")} (${SS.srsDue().length})</button>` : ""}</div></div>${boxesHTML()}`;
      SS.updateTopbar();
    }
    draw();
  };
  function boxesHTML(){
    const b = [0, 0, 0, 0, 0, 0]; Object.values(SS.state.srs).forEach(v => { b[v[0]]++; });
    return `<div class="card flat" style="max-width:640px;margin-top:16px"><h3>${L("Xotira qutilari", "Memory boxes")}</h3>
      <p class="small muted">${L("Toʻgʻri javob – keyingi qutiga (1, 2, 4, 7, 15 kundan keyin), xato – 1-qutiga qaytadi.", "Right moves an item to the next box (1, 2, 4, 7, 15 days later); wrong sends it back to box 1.")}</p>
      <div class="row" style="gap:8px">${[1, 2, 3, 4, 5].map(k => `<div class="stat" style="flex:1;min-width:80px;text-align:center;padding:10px"><b>${b[k]}</b><span>${k}-${L("quti", "box")}</span></div>`).join("")}</div></div>`;
  }

  /* ================= checks ================= */
  P.checks = function(){
    SS._title = L("Nazorat ishlari", "Checks");
    app().innerHTML = `<h1>✅ ${L("Nazorat ishlari", "Checks")}</h1>
      <p class="muted">${L("Har hafta oxirida nazorat ishi: test qismi (60 ball) shu yerda onlayn, vaqt bilan; amaliy qismi (40 ball) – kompyuterda, oʻqituvchi baholaydi. 12-hafta – yakuniy imtihon.", "A check at the end of every week: the test part (60 points) online here, timed; the practical part (40 points) on the computer, graded by the teacher. Week 12 is the final exam.")}</p>
      ${C.checks.map(c => SS.checkRow(c.k)).join("")}`;
  };
  P.check = function(k){
    const c = SS.check(k); if (!c) return SS.go("#/checks");
    SS._title = c.titleUz;
    const st = SS.state, r = st.chk[k], teacher = SS.isTeacher();
    const testMin = c.minutes - (c.practical ? c.practical.minutes : 0);
    const maxTest = c.sections.reduce((a, s) => a + s.items.length * (s.points || 1), 0);
    const pg = SS.cloud && SS.cloud.myGrades && SS.cloud.myGrades.prac && SS.cloud.myGrades.prac[k];
    app().innerHTML = `${SS.crumbs([["#/checks", L("Nazorat", "Checks")], [null, c.titleUz]])}
      <div class="lesson-head"><span class="lesson-num" style="width:58px;height:58px;font-size:26px;background:${c.final ? "var(--office)" : "var(--accent)"}">${c.final ? "🎓" : "✅"}</span>
        <div><h1>${esc(c.titleUz)}</h1><div class="en">${esc(c.subUz)}</div>
        <div class="row small muted" style="margin-top:6px"><span>⏱ ${c.minutes} ${L("daqiqa", "min")}</span><span>· ${L("Test", "Test")} ${c.totals.test} + ${L("Amaliy", "Practical")} ${c.totals.practical} = ${c.totals.total} ${L("ball", "points")}</span><span>· ${L("Darslar", "Lessons")} ${c.covers[0]}–${c.covers[c.covers.length - 1]}</span></div></div></div>
      ${c.coversUz ? `<div class="notice" style="margin-bottom:14px">${c.coversUz.map(md).join("<br>")}</div>` : ""}
      <div class="grid grid-2">
        <div class="card">
          <h2>📝 ${L("Test qismi", "Test part")} · ${maxTest} ${L("ball", "points")}</h2>
          <p class="muted">${c.sections.length} ${L("boʻlim", "sections")}, ${c.sections.reduce((a, s) => a + s.items.length, 0)} ${L("savol", "questions")}, ${testMin} ${L("daqiqa. Boshlaganingizdan keyin vaqt toʻxtamaydi.", "minutes. The timer doesn't stop once you start.")}</p>
          ${r ? `<p><b>${L("Birinchi urinish", "First attempt")}: ${r.first.score} / ${r.first.max}</b> (${new Date(r.first.at).toLocaleDateString()})${r.best && r.best.score !== r.first.score ? ` · ${L("eng yaxshisi", "best")}: ${r.best.score}` : ""}</p>
            <p class="small muted">${L("Bahoga birinchi urinish olinadi. Qayta ishlash – mashq uchun.", "The first attempt counts for the grade. Retakes are for practice.")}</p>` : ""}
          <button class="btn btn-accent" id="startTest">${r ? L("Qayta ishlash (mashq)", "Retake (practice)") : L("Testni boshlash", "Start the test")}</button>
        </div>
        ${c.practical ? `<div class="card">
          <h2>💻 ${md(c.practical.titleUz)} · ${c.totals.practical} ${L("ball", "points")}</h2>
          <p>${md(c.practical.taskUz)}</p>
          <p class="small muted">⏱ ${c.practical.minutes} ${L("daqiqa", "min")}</p>
          ${c.practical.file ? `<div class="file-list" style="margin-bottom:10px">${SS.fileLink(c.practical.file)}</div>` : ""}
          ${pg != null ? `<p><b>${L("Oʻqituvchi bahosi: ", "Teacher's mark: ")}${pg} / ${c.totals.practical}</b></p>` : ""}
          <details><summary style="cursor:pointer;font-weight:600">${L("Baholash mezonlari", "Marking scheme")}</summary>
            <table class="tbl" style="margin-top:8px"><tbody>${c.practical.rubric.map(([t, p]) => `<tr><td>${md(t)}</td><td style="text-align:right;white-space:nowrap"><b>${p}</b></td></tr>`).join("")}</tbody></table></details>
        </div>` : ""}
      </div>
      <div class="card flat" style="margin-top:14px"><h3>${L("Fayllar", "Files")}</h3><div class="file-list" style="max-width:620px">
        ${teacher ? SS.fileLink(c.files.paper.pdf, L("Nazorat ishi qogʻozda (PDF)", "Paper version (PDF)")) + SS.fileLink(c.files.paper.docx, L("Nazorat ishi (DOCX)", "Paper version (DOCX)")) + SS.fileLink(c.files.answerKey.pdf, "🔑 " + L("Javoblar kaliti", "Answer key")) : ""}
        ${c.files.practice ? SS.fileLink(c.files.practice, L("Amaliy qism fayli", "Practical file")) : ""}
        ${!teacher && !c.files.practice ? `<span class="muted small">${L("Qogʻoz nusxa va kalit oʻqituvchida.", "The paper copy and key are with your teacher.")}</span>` : ""}
      </div></div>
      <div id="testArea"></div>`;
    SS.$("#startTest").onclick = () => runTest(c, testMin, maxTest);
  };
  function runTest(c, minutes, maxTest){
    const area = SS.$("#testArea"), k = c.k;
    area.innerHTML = `<div class="card" style="position:sticky;top:60px;z-index:5;margin:16px 0;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <span class="timer" id="tmr"></span><span class="muted small">${L("qoldi", "left")}</span><span class="spacer"></span>
        <span class="small muted" id="answered"></span><button class="btn btn-accent" id="submitTest">${L("Topshirish", "Hand in")}</button></div><div id="secs"></div>`;
    area.scrollIntoView({ behavior: "smooth" });
    const apis = [];
    const secs = SS.$("#secs");
    const totalQ = c.sections.reduce((a, s) => a + s.items.length, 0);
    const counts = c.sections.map(() => 0);
    c.sections.forEach((s, i) => {
      const box = document.createElement("div"); box.className = "card"; box.style.marginBottom = "14px"; secs.appendChild(box);
      apis.push(SS.Exercise(box, s, { mode: "test", points: s.points || 1, onChange: a => { counts[i] = Object.values(a).filter(v => v !== "" && v != null).length; upd(); } }));
    });
    const upd = () => { SS.$("#answered").textContent = counts.reduce((a, b) => a + b, 0) + " / " + totalQ + " " + L("javob", "answered"); };
    upd();
    const end = Date.now() + minutes * 60000;
    const tick = () => {
      const left = Math.max(0, end - Date.now()), m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60, t = SS.$("#tmr");
      if (!t){ clearInterval(iv); return; }
      t.textContent = m + ":" + String(s).padStart(2, "0"); t.classList.toggle("low", left < 120000);
      if (!left){ clearInterval(iv); SS.toast(L("Vaqt tugadi", "Time is up")); submit(); }
    };
    const iv = setInterval(tick, 500); tick();
    const leave = () => { clearInterval(iv); removeEventListener("hashchange", leave); };
    addEventListener("hashchange", leave);
    SS.$("#submitTest").onclick = () => {
      const left = totalQ - counts.reduce((a, b) => a + b, 0);
      if (left && !confirmBox()) return;
      submit();
      function confirmBox(){ return window.confirm(L(`${left} ta savolga javob berilmagan. Topshirasizmi?`, `${left} question(s) unanswered. Hand in anyway?`)); }
    };
    function submit(){
      clearInterval(iv);
      let score = 0;
      const answers = {};
      apis.forEach((api, i) => {
        const res = api.check(), pts = c.sections[i].points || 1;
        score += res.right * pts; api.reveal(); answers[c.sections[i].letter] = api.answers();
        res.details.filter(d => !d.ok).forEach(d => SS.srsAdd("w:K" + k + "-" + c.sections[i].letter + d.n, { q: SS.plain(d.q), a: SS.plain(d.answer), from: c.titleUz }));
      });
      const st = SS.state, prev = st.chk[k], now = { score, max: maxTest, at: Date.now() };
      st.chk[k] = prev ? Object.assign(prev, { best: !prev.best || score > prev.best.score ? now : prev.best, last: now }) : { first: Object.assign({ answers }, now), best: now, last: now };
      SS.commit("chk");
      if (!prev) SS.addXP(score * 2, c.titleUz);
      if (score / maxTest >= .9) SS.confetti();
      SS.checkBadges();
      const bar = SS.$("#submitTest").parentNode;
      bar.innerHTML = `<b style="font:600 22px var(--font-display)">${score} / ${maxTest}</b><span class="muted">${L("ball (test qismi)", "points (test part)")}${prev ? " · " + L("mashq urinish", "practice attempt") : ""}</span><span class="spacer"></span><a class="btn btn-ghost" href="#/check/${k}">${L("Yopish", "Close")}</a>`;
      bar.style.position = "static";
      window.scrollTo({ top: area.offsetTop - 70, behavior: "smooth" });
    }
  }

  /* ================= projects ================= */
  P.projects = function(){
    SS._title = L("Loyihalar", "Projects");
    app().innerHTML = `<h1>🧩 ${L("Portfolio loyihalari", "Portfolio projects")}</h1>
      <p class="muted">${L("Kurs davomida 4 ta katta loyiha. Har biri 100 ball, yakuniy bahoning 30%. Natijada portfoliongizda ish beruvchiga koʻrsatsa boʻladigan haqiqiy ishlar boʻladi.", "4 big projects across the course, 100 points each, 30% of the final grade. You finish with real work to show an employer.")}</p>
      <div class="grid grid-2">${C.projects.map(p => {
        const g = SS.cloud && SS.cloud.myGrades && SS.cloud.myGrades.proj && SS.cloud.myGrades.proj[p.p];
        return `<a class="card week-card app-${p.app}" href="#/project/${p.p}"><div class="wk">${p.week}-${L("hafta", "week")} · ${esc(SS.APPS[p.app].name)}</div><h3>${esc(p.titleUz)}</h3><p class="muted small">${esc(p.subUz)}</p>
        <div class="items"><span class="tag">${esc(p.mode)}</span><span class="tag">⏳ ${esc(p.due)}</span>${g != null ? `<span class="tag ok">${g}/100</span>` : ""}</div></a>`; }).join("")}</div>`;
  };
  P.project = function(pn){
    const p = SS.project(pn); if (!p) return SS.go("#/projects");
    SS._title = p.titleUz;
    const st = SS.state, pr = st.proj[pn] = st.proj[pn] || { musts: {}, list: {} };
    const g = SS.cloud && SS.cloud.myGrades && SS.cloud.myGrades.proj && SS.cloud.myGrades.proj[pn];
    const w = SS.week(p.week), si = w.deck.sections.findIndex(s => s.type === "project" && s.num === p.p);
    app().innerHTML = `<div class="app-${p.app}">${SS.crumbs([["#/projects", L("Loyihalar", "Projects")], [null, p.titleUz]])}
      <div class="lesson-head">${SS.appLogo(p.app, true)}<div><div class="muted small" style="font-weight:600;letter-spacing:.06em">${p.week}-${L("HAFTA", "WEEK")} · ${esc(p.title.toUpperCase())}</div><h1>${esc(p.titleUz)}</h1><div class="en">${esc(p.subUz)}</div>
        <div class="row" style="margin-top:8px"><span class="tag">${esc(p.mode)}</span><span class="tag">⏳ ${esc(p.due)}</span><span class="tag">${p.total} ${L("ball", "points")}</span>${g != null ? `<span class="tag ok">${L("Baho", "Mark")}: ${g}/100</span>` : ""}${si >= 0 ? `<button class="btn btn-sm btn-accent" id="pPres">▶ ${L("Taqdimot", "Slides")}</button>` : ""}</div></div></div>
      <div class="hook">${md(p.hook)}</div>
      <h2 class="section">${L("Vazifa", "The brief")}</h2>
      <div class="card flat">${p.brief.map(b => `<p>${md(b)}</p>`).join("")}<p><b>${md(p.outcome)}</b></p></div>
      <h2 class="section">${L("Nimalarni topshirasiz", "What you hand in")}</h2>
      <div class="grid grid-3">${p.deliverables.map((d, i) => `<div class="card"><h3>${esc(d.name)}</h3><p class="small muted">${esc(d.file)}</p><p>${md(d.descUz)}</p>
        <ul class="checklist">${d.musts.map((m, j) => `<li><input type="checkbox" data-m="${i}-${j}" id="pm${i}-${j}" ${pr.musts[i + "-" + j] ? "checked" : ""}><label for="pm${i}-${j}">${md(m)}</label></li>`).join("")}</ul></div>`).join("")}</div>
      ${p.images && p.images.length ? `<h2 class="section">${L("Namunalar", "Examples")}</h2><div class="grid grid-2">${p.images.map(im => `<div class="card flat"><div class="shot"><img src="${SS.img(im.image)}" alt="" loading="lazy"></div><p class="cap">${md(im.cap)}</p>${im.notes && im.notes.length ? `<ul class="small">${im.notes.map(n => `<li>${md(n)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div>` : ""}
      <div class="grid grid-2 section">
        <div class="card"><h2>🗓️ ${L("Reja", "Timeline")}</h2><table class="tbl"><tbody>${p.timeline.map(t => `<tr><td style="white-space:nowrap"><b>${md(t.when)}</b></td><td>${md(t.what)}</td></tr>`).join("")}</tbody></table></div>
        <div class="card"><h2>✅ ${L("Topshirishdan oldin", "Before you hand in")}</h2><ul class="checklist">${p.checklist.map((c, i) => `<li><input type="checkbox" data-l="${i}" id="pl${i}" ${pr.list[i] ? "checked" : ""}><label for="pl${i}">${md(c)}</label></li>`).join("")}</ul>
          <h3 style="margin-top:12px">${L("Qanday topshiriladi", "How to hand in")}</h3><ol class="small">${p.submit.map(s => `<li>${md(s)}</li>`).join("")}</ol></div>
      </div>
      <h2 class="section">${L("Baholash", "Marking")} · ${p.total} ${L("ball", "points")}</h2>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${L("Mezon", "Criterion")}</th><th style="width:70px">${L("Ball", "Pts")}</th><th>${L("Qanday tekshiriladi", "How it's checked")}</th></tr></thead><tbody>
        ${p.rubric.map(a => `<tr><td colspan="3" style="background:var(--surface-2)"><b>${md(a.area)}</b> · ${a.items.reduce((s, x) => s + x.pts, 0)}</td></tr>${a.items.map(x => `<tr><td>${md(x.t)}</td><td><b>${x.pts}</b></td><td class="small muted">${md(x.how)}</td></tr>`).join("")}`).join("")}
      </tbody></table></div>
      <h2 class="section">💡 ${L("Maslahatlar", "Tips")}</h2><div class="grid grid-2">${p.tips.map(t => `<div class="card flat">${md(t)}</div>`).join("")}</div>
      <h2 class="section">${L("Fayllar", "Files")}</h2>
      <div class="file-list" style="max-width:680px">${SS.fileLink(p.files.brief.pdf, L("Loyiha topshirigʻi (PDF)", "Project brief (PDF)"))}${SS.fileLink(p.files.brief.docx, L("Loyiha topshirigʻi (DOCX)", "Project brief (DOCX)"))}
        ${p.files.starter.map(s => SS.fileLink(s.path, s.name + " – " + SS.plain(s.purpose))).join("")}
        ${SS.isTeacher() ? SS.fileLink(p.files.grading.pdf, "🔑 " + L("Baholash varaqasi (PDF)", "Grading sheet (PDF)")) + SS.fileLink(p.files.grading.docx, "🔑 " + L("Baholash varaqasi (DOCX)", "Grading sheet (DOCX)")) : ""}</div></div>`;
    SS.$$("img", app()).forEach(im => { if (im.closest(".shot")) im.onclick = () => SS.lightbox(im.src); });
    SS.$$("[data-m]").forEach(cb => cb.onchange = () => { pr.musts[cb.dataset.m] = cb.checked; SS.commit("proj"); });
    SS.$$("[data-l]").forEach(cb => cb.onchange = () => { pr.list[cb.dataset.l] = cb.checked; SS.commit("proj"); });
    const pb = SS.$("#pPres"); if (pb) pb.onclick = () => SS.present(p.week, si);
  };

  /* ================= materials ================= */
  P.materials = function(){
    SS._title = L("Materiallar", "Materials");
    const teacher = SS.isTeacher();
    app().innerHTML = `<h1>📁 ${L("Materiallar", "Materials")}</h1>
      <p class="muted">${L("Kursning barcha fayllari: haftalik taqdimotlar, uy vazifalari, amaliy ish fayllari, loyihalar", "Every course file: weekly decks, homework, practice files, projects")}${teacher ? L(", nazorat ishlari va javoblar kalitlari.", ", checks and answer keys.") : "."}</p>
      <div class="row" style="margin-bottom:14px"><input class="inp" id="mSearch" placeholder="🔍 ${L("Qidirish…", "Search…")}" style="flex:1;max-width:420px"></div>
      <div id="mList">${C.weeks.map(w => {
        const ls = w.lessons.map(SS.lesson), ch = w.check && SS.check(w.check), pr = w.project && SS.project(w.project);
        const files = [[w.deck.pptx, L("Taqdimot", "Deck") + " (PPTX)"], [w.deck.pdf, L("Taqdimot", "Deck") + " (PDF)"]];
        ls.forEach(l => {
          files.push([l.files.homework && l.files.homework.pdf, l.n + "-" + L("dars uy vazifasi", "lesson homework") + " (PDF)"], [l.files.homework && l.files.homework.docx, l.n + "-" + L("dars uy vazifasi", "lesson homework") + " (DOCX)"]);
          if (l.files.practice) files.push([l.files.practice, l.n + "-" + L("dars amaliy ish fayli", "lesson practice file")]);
          if (l.files.homeworkFile) files.push([l.files.homeworkFile, l.n + "-" + L("dars uy vazifasi fayli", "lesson homework file")]);
          if (teacher && l.files.answerKey) files.push([l.files.answerKey.pdf, "🔑 " + l.n + "-" + L("dars javoblari", "lesson answer key") + " (PDF)"]);
        });
        if (ch){
          if (ch.files.practice) files.push([ch.files.practice, ch.titleUz + " – " + L("amaliy fayl", "practical file")]);
          if (teacher) files.push([ch.files.paper.pdf, ch.titleUz + " (PDF)"], [ch.files.paper.docx, ch.titleUz + " (DOCX)"], [ch.files.answerKey.pdf, "🔑 " + ch.titleUz + " – " + L("javoblar", "answer key")]);
        }
        if (pr){
          files.push([pr.files.brief.pdf, pr.titleUz + " (PDF)"]);
          pr.files.starter.forEach(s => files.push([s.path, pr.p + "-" + L("loyiha", "project") + ": " + s.name]));
          if (teacher) files.push([pr.files.grading.pdf, "🔑 " + pr.titleUz + " – " + L("baholash", "grading")]);
        }
        return `<div class="section app-${w.app}" data-week><div class="section-title"><h2 style="color:var(--app)">${w.week}-${L("hafta", "week")}</h2><b>${esc(w.titleUz)}</b></div>
          <div class="grid grid-2" style="gap:6px">${files.filter(f => f[0]).map(f => `<div data-f="${esc((f[1] + " " + f[0]).toLowerCase())}">${SS.fileLink(f[0], f[1])}</div>`).join("")}</div></div>`;
      }).join("")}</div>`;
    SS.$("#mSearch").oninput = e => {
      const q = e.target.value.toLowerCase().trim();
      SS.$$("[data-f]").forEach(d => { d.style.display = !q || d.dataset.f.includes(q) ? "" : "none"; });
      SS.$$("[data-week]").forEach(s => { s.style.display = SS.$$("[data-f]", s).some(d => d.style.display !== "none") ? "" : "none"; });
    };
  };

  /* ================= grade estimate ================= */
  // returns {homework, projects, quizzes, finalExam, total, known} in percent; null parts are not graded yet
  SS.gradeOf = (st, grades) => {
    grades = grades || {};
    const G = C.grading;
    // homework: every lesson's 6 auto-checked exercises (70%) + the teacher's task mark (30%, out of 10) when given
    const hwParts = [];
    C.lessons.forEach(l => {
      const hw = st.hw && st.hw[l.n]; if (!hw || !hw.scores) return;
      const sc = Object.values(hw.scores); if (!sc.length) return;
      const ex = sc.reduce((a, s) => a + s[0], 0) / Math.max(1, sc.reduce((a, s) => a + s[1], 0));
      const tm = grades.task && grades.task[l.n] != null ? grades.task[l.n] / 10 : null;
      const prac = st.prac && st.prac[l.n] && st.prac[l.n].done ? 1 : 0;
      hwParts.push(tm != null ? ex * .6 + tm * .3 + prac * .1 : ex * .85 + prac * .15);
    });
    const homework = hwParts.length ? 100 * hwParts.reduce((a, b) => a + b, 0) / hwParts.length : null;
    const pj = C.projects.map(p => grades.proj && grades.proj[p.p]).filter(v => v != null);
    const projects = pj.length ? pj.reduce((a, b) => a + +b, 0) / pj.length : null;
    const checkPct = k => {
      const r = st.chk && st.chk[k], c = SS.check(k); if (!r) return null;
      const prac = grades.prac && grades.prac[k];
      return prac != null ? (r.first.score / r.first.max) * c.totals.test + +prac : 100 * r.first.score / r.first.max;
    };
    const qz = G.quizChecks.map(checkPct).filter(v => v != null);
    const quizzes = qz.length ? qz.reduce((a, b) => a + b, 0) / qz.length : null;
    const finalExam = checkPct(G.finalExamCheck);
    const parts = { homework, projects, quizzes, finalExam };
    let tot = 0, w = 0;
    Object.keys(parts).forEach(k => { if (parts[k] != null){ tot += parts[k] * G.weights[k]; w += G.weights[k]; } });
    return Object.assign(parts, { total: w ? tot / w : null, known: w, full: Object.keys(parts).reduce((a, k) => a + (parts[k] || 0) * G.weights[k] / 100, 0) });
  };

  /* ================= my progress ================= */
  P.me = function(){
    SS._title = L("Natijalarim", "My progress");
    const st = SS.state, gr = SS.gradeOf(st, SS.cloud && SS.cloud.myGrades);
    const doneL = C.lessons.filter(l => SS.lessonDone(l.n)).length;
    const days = []; for (let i = 83; i >= 0; i--){ const d = new Date(Date.now() - i * 864e5); const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); days.push([iso, st.days[iso] || 0]); }
    const f = v => v == null ? "—" : Math.round(v) + "%";
    app().innerHTML = `<h1>📈 ${L("Natijalarim", "My progress")}</h1>
      <div class="grid grid-4">
        <div class="stat"><b>⚡ ${st.xp || 0}</b><span>XP</span></div>
        <div class="stat"><b>🔥 ${SS.streak()}</b><span>${L("kun ketma-ket", "day streak")}</span></div>
        <div class="stat"><b>${doneL} / 36</b><span>${L("dars tugadi", "lessons done")}</span></div>
        <div class="stat"><b>${Object.keys(st.chk).length} / 12</b><span>${L("nazorat ishi", "checks taken")}</span></div>
      </div>
      <div class="grid grid-2 section">
        <div class="card"><h2>🎓 ${L("Taxminiy yakuniy baho", "Estimated final grade")}</h2>
          <div class="row" style="gap:22px;align-items:center">
            <div class="grade-ring" style="--p:${Math.round(gr.total || 0)}"><div><div><b>${gr.total == null ? "—" : Math.round(gr.total) + "%"}</b><div class="small muted">${L("hozirgacha", "so far")}</div></div></div></div>
            <table class="tbl" style="flex:1;min-width:220px"><tbody>
              <tr><td>${L("Uy vazifalari", "Homework")} (${C.grading.weights.homework}%)</td><td><b>${f(gr.homework)}</b></td></tr>
              <tr><td>${L("Loyihalar", "Projects")} (${C.grading.weights.projects}%)</td><td><b>${f(gr.projects)}</b></td></tr>
              <tr><td>${L("Nazorat ishlari", "Checks")} (${C.grading.weights.quizzes}%)</td><td><b>${f(gr.quizzes)}</b></td></tr>
              <tr><td>${L("Yakuniy imtihon", "Final exam")} (${C.grading.weights.finalExam}%)</td><td><b>${f(gr.finalExam)}</b></td></tr></tbody></table>
          </div>
          <p class="small muted" style="margin-top:10px">${L(`Faqat baholangan qismlar hisobga olingan (${gr.known}% vazn). Sertifikat uchun – ${C.grading.certificate}%. Loyiha va amaliy qismlar bahosini oʻqituvchi qoʻyadi (hisobga kirgan boʻlsangiz, shu yerda koʻrinadi).`, `Only graded parts are counted (${gr.known}% of the weight). The certificate needs ${C.grading.certificate}%. Project and practical marks come from the teacher (shown here when you're signed in).`)}</p></div>
        <div class="card"><h2>📅 ${L("Faollik", "Activity")}</h2><p class="small muted">${L("Oxirgi 12 hafta. Har bir katak – bir kun.", "The last 12 weeks. Each square is a day.")}</p>
          <div style="display:grid;grid-template-columns:repeat(12,1fr);grid-auto-flow:column;grid-template-rows:repeat(7,1fr);gap:3px;max-width:420px">
            ${days.map(([d, x]) => `<i title="${d}: ${x} XP" style="aspect-ratio:1;border-radius:3px;background:${x ? `color-mix(in srgb, var(--ok) ${Math.min(100, 25 + x / 3)}%, var(--surface-2))` : "var(--surface-2)"}"></i>`).join("")}</div></div>
      </div>
      <h2 class="section">🏅 ${L("Nishonlar", "Badges")}</h2>
      <div class="badges">${SS.BADGES.map(b => `<div class="badge-card ${st.badges[b.id] ? "" : "off"}"><div class="ico">${b.ico}</div><b>${esc(L(b.uz, b.en))}</b><span>${esc(b.d)}</span></div>`).join("")}</div>
      <h2 class="section">📚 ${L("Darslar boʻyicha", "By lesson")}</h2>
      ${C.weeks.map(w => `<div class="app-${w.app}" style="margin-bottom:10px"><div class="row" style="margin-bottom:6px"><b style="color:var(--app)">${w.week}-${L("hafta", "week")}</b><span class="muted small">${esc(w.titleUz)}</span></div>
        <div class="grid grid-3" style="gap:8px">${w.lessons.map(n => { const p = SS.lessonProgress(n); return `<a class="card flat" style="padding:10px 12px" href="#/lesson/${n}"><div class="row"><b>${n}.</b><span class="small" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(SS.lesson(n).titleUz)}</span><span class="small muted">${p}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${p}%"></i></div></a>`; }).join("")}</div></div>`).join("")}`;
  };

  /* ================= settings ================= */
  P.settings = function(){
    SS._title = L("Sozlamalar", "Settings");
    const s = SS.settings, cl = SS.cloud, u = cl && cl.user;
    app().innerHTML = `<h1>⚙ ${L("Sozlamalar", "Settings")}</h1>
      <div class="grid grid-2">
        <div class="card"><h2>👤 ${L("Hisob", "Account")}</h2><div id="acct">${acctHTML()}</div></div>
        <div class="card"><h2>🎨 ${L("Koʻrinish", "Display")}</h2>
          <div class="field"><label>${L("Til (interfeys)", "Language (interface)")}</label><div class="seg" data-set="lang"><button data-v="uz">Oʻzbekcha</button><button data-v="en">English</button></div></div>
          <div class="field"><label>${L("Mavzu", "Theme")}</label><div class="seg" data-set="theme"><button data-v="auto">${L("Avto", "Auto")}</button><button data-v="light">${L("Yorugʻ", "Light")}</button><button data-v="dark">${L("Qorongʻi", "Dark")}</button></div></div>
          <p class="small muted">${L("Dars materiallari oʻzbek tilida, dastur menyu nomlari – inglizcha.", "Lesson content is in Uzbek; menu names in the apps stay in English.")}</p></div>
        <div class="card"><h2>🧑‍🏫 ${L("Oʻqituvchi rejimi", "Teacher mode")}</h2>
          <p class="small muted">${L("Javob slaydlari, javoblar kalitlari, nazorat ishlarining qogʻoz nusxasi va oʻqituvchi paneli koʻrinadi. Oʻqituvchi hisobi bilan kirsangiz, avtomatik yoqiladi.", "Shows answer slides, answer keys, paper checks and the dashboard. Turns on automatically for teacher accounts.")}</p>
          <label class="row"><input type="checkbox" id="tMode" ${s.teacher ? "checked" : ""} ${cl && cl.isStaff ? "checked disabled" : ""}> ${L("Bu qurilmada oʻqituvchi rejimi", "Teacher mode on this device")}</label></div>
        <div class="card"><h2>💾 ${L("Maʼlumotlar", "Data")}</h2>
          <p class="small muted">${L("Natijalaringiz shu brauzerda saqlanadi", "Your progress is saved in this browser")}${u ? L(" va hisobingizga sinxronlanadi.", " and synced to your account.") : L(". Boshqa qurilmada davom etish uchun hisobga kiring.", ". Sign in to continue on another device.")}</p>
          <div class="row"><button class="btn btn-ghost btn-sm" id="exp">⬇ ${L("Natijalarni yuklab olish", "Export progress")}</button><label class="btn btn-ghost btn-sm">⬆ ${L("Yuklash", "Import")}<input type="file" id="imp" accept=".json" hidden></label><button class="btn btn-ghost btn-sm" id="rst" style="color:var(--bad)">${L("Hammasini oʻchirish", "Reset all")}</button></div></div>
      </div>
      <p class="small muted section">SS-Courses · Software Squad · ${esc(C.title)} · ${L("maʼlumotlar versiyasi", "data version")} ${C.version}</p>`;
    SS.$$("[data-set]").forEach(seg => {
      const k = seg.dataset.set;
      SS.$$("button", seg).forEach(b => { b.classList.toggle("on", s[k] === b.dataset.v); b.onclick = () => { s[k] = b.dataset.v; SS.saveSettings(); SS.route(); }; });
    });
    SS.$("#tMode").onchange = e => { s.teacher = e.target.checked; SS.saveSettings(); SS.route(); };
    SS.$("#exp").onclick = () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(SS.state)], { type: "application/json" }));
      a.download = "ss-courses-progress-" + SS.today() + ".json"; a.click();
    };
    SS.$("#imp").onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => { const d = JSON.parse(t); SS.replaceState(SS.mergeState ? SS.mergeState(SS.state, d) : d); SS.commit("xp", "days", "badges", "px", "hw", "seen", "exit", "srs", "wrong", "chk", "proj", "hs", "prac"); SS.toast(L("Yuklandi", "Imported")); SS.route(); }).catch(() => SS.toast(L("Fayl notoʻgʻri", "Invalid file")));
    };
    SS.$("#rst").onclick = () => { if (confirm(L("Hamma natijalar oʻchiriladi. Ishonchingiz komilmi?", "All progress will be deleted. Are you sure?"))){ SS.resetState(); SS.route(); } };
    wireAcct();
  };
  function acctHTML(){
    const cl = SS.cloud;
    if (!cl) return `<p class="muted small">${L("Hisob xizmati yuklanmoqda…", "Loading the account service…")}</p>`;
    if (!cl.available) return `<p class="muted small">${L("Hisob xizmati ishlamayapti (internet yoki sozlama). Natijalar shu qurilmada saqlanadi.", "The account service isn't available (offline or not set up). Progress is saved on this device.")}</p>`;
    if (cl.user){
      const p = cl.profile || {};
      return `<p><b>${esc(p.name || cl.user.displayName || "")}</b><br><span class="muted small">${esc(cl.user.email || "")}</span></p>
        <p class="small">${L("Rol", "Role")}: <span class="tag">${esc(p.role || "student")}</span> ${p.status && p.status !== "approved" ? `<span class="tag warn">${esc(p.status)}</span>` : ""}</p>
        <p class="small muted">${cl.syncMsg || ""}</p><button class="btn btn-ghost btn-sm" id="soBtn">${L("Chiqish", "Sign out")}</button>`;
    }
    return `<p class="small muted">${L("SpeakUp hisobingiz bilan ham kirishingiz mumkin. Kirsangiz, natijalaringiz saqlanadi va oʻqituvchingiz koʻradi.", "Your SpeakUp account works here too. Signing in saves your progress and lets your teacher see it.")}</p>
      ${cl.err ? `<div class="auth-error">${esc(cl.err)}</div>` : ""}
      <button class="btn btn-accent" id="gBtn" style="width:100%;margin-bottom:10px">G · ${L("Google orqali kirish", "Continue with Google")}</button>
      <form id="emForm"><div class="field"><label>Email</label><input class="inp" id="em" type="email" required autocomplete="email"></div>
      <div class="field"><label>${L("Parol", "Password")}</label><input class="inp" id="pw" type="password" required minlength="6" autocomplete="current-password"></div>
      <div class="field hidden" id="nmF"><label>${L("Ism familiya", "Full name")}</label><input class="inp" id="nm" autocomplete="name"></div>
      <div class="row"><button class="btn btn-accent btn-sm" id="inBtn">${L("Kirish", "Sign in")}</button><button type="button" class="btn btn-ghost btn-sm" id="upBtn">${L("Roʻyxatdan oʻtish", "Sign up")}</button><button type="button" class="btn btn-ghost btn-sm" id="fgBtn">${L("Parolni unutdim", "Forgot password")}</button></div></form>`;
  }
  function wireAcct(){
    const cl = SS.cloud; if (!cl || !cl.available) return;
    const so = SS.$("#soBtn"); if (so) so.onclick = () => cl.signOut().then(() => SS.route());
    const g = SS.$("#gBtn"); if (g) g.onclick = () => cl.google();
    let signup = false;
    const up = SS.$("#upBtn"); if (up) up.onclick = () => { signup = !signup; SS.$("#nmF").classList.toggle("hidden", !signup); SS.$("#inBtn").textContent = signup ? L("Hisob yaratish", "Create account") : L("Kirish", "Sign in"); };
    const fg = SS.$("#fgBtn"); if (fg) fg.onclick = () => { const e = SS.$("#em").value.trim(); if (!e) return SS.toast(L("Emailni yozing", "Enter your email")); cl.reset(e).then(() => SS.toast(L("Havola yuborildi", "Reset link sent"))).catch(x => SS.toast(cl.errText(x))); };
    const f = SS.$("#emForm"); if (f) f.onsubmit = e => { e.preventDefault(); cl.email(SS.$("#em").value.trim(), SS.$("#pw").value, signup ? SS.$("#nm").value.trim() : null); };
  }
  SS.refreshAcct = () => { const a = SS.$("#acct"); if (a){ a.innerHTML = acctHTML(); wireAcct(); } };
})();
