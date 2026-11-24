/* SS-Courses teacher dashboard (#/dashboard).
 * Needs a staff account (owner / manager / teacher) signed in: reads ssc/progress and writes marks to ssc/grades.
 * Views: overview (students × lessons), checks, projects & marks, common mistakes; CSV export.
 */
(function(){
  "use strict";
  const C = window.SSC, SS = window.SS, esc = SS.esc, md = SS.md, L = SS.L;
  const app = () => document.getElementById("app");
  let off = null, offG = [], students = {}, grades = {}, view = "overview", weekF = 0, err = null;
  addEventListener("hashchange", () => { if (!/^#\/dashboard/.test(location.hash)) stop(); });
  function stop(){ if (off){ off(); off = null; } offG.forEach(f => f()); offG = []; }

  SS.pages.dashboard = function(v){
    SS._title = L("Oʻqituvchi paneli", "Dashboard");
    if (v) view = v;
    const cl = SS.cloud;
    if (!cl || !cl.user || !cl.isStaff){
      app().innerHTML = `<h1>🧑‍🏫 ${L("Oʻqituvchi paneli", "Teacher dashboard")}</h1>
        <div class="card empty"><h2>${L("Oʻqituvchi hisobi bilan kiring", "Sign in with a teacher account")}</h2>
        <p>${L("Panel oʻquvchilarning natijalarini bulutdan oʻqiydi. Buning uchun owner, manager yoki teacher roli kerak (SpeakUp admin panelida beriladi).", "The dashboard reads students' progress from the cloud, so it needs an owner, manager or teacher role (given in the SpeakUp admin panel).")}</p>
        <a class="btn btn-accent" href="#/settings">${L("Kirish", "Sign in")}</a></div>
        <h2 class="section">${L("Bu qurilmadagi natijalar", "Progress on this device")}</h2>${table({ local: Object.assign({ name: L("Shu qurilma", "This device"), email: "" }, SS.state) }, {})}`;
      wire();
      return;
    }
    if (!off){
      off = cl.watchStudents((d, e) => { students = d; err = e || null; if (!cl.isManager) watchTeacherGrades(); render(); });
      if (cl.isManager) offG.push(cl.watchAllGrades(g => { grades = g; render(); }));
    }
    render();
  };
  function watchTeacherGrades(){
    offG.forEach(f => f()); offG = [];
    Object.keys(students).forEach(uid => offG.push(SS.cloud.watchGrades(uid, g => { grades[uid] = g; render(); })));
  }
  function render(){
    if (!/^#\/dashboard/.test(location.hash)) return;
    Object.keys(students).forEach(u => { students[u]._uid = u; });
    const n = Object.keys(students).length;
    const act7 = Object.values(students).filter(s => s.lastSeen && Date.now() - s.lastSeen < 7 * 864e5).length;
    const avgL = n ? Math.round(Object.values(students).reduce((a, s) => a + C.lessons.filter(l => lp(s, l.n) >= 80).length, 0) / n) : 0;
    app().innerHTML = `<h1>🧑‍🏫 ${L("Oʻqituvchi paneli", "Teacher dashboard")}</h1>
      ${err ? `<div class="auth-error">${esc(SS.cloud.errText(err))}</div>` : ""}
      <div class="grid grid-4"><div class="stat"><b>${n}</b><span>${L("oʻquvchi", "students")}</span></div><div class="stat"><b>${act7}</b><span>${L("7 kunda faol", "active in 7 days")}</span></div>
        <div class="stat"><b>${avgL} / 36</b><span>${L("oʻrtacha tugatilgan dars", "avg lessons done")}</span></div><div class="stat"><b>${Object.values(students).filter(s => certOf(s) ).length}</b><span>${L("sertifikatga yetgan", "certificate level")}</span></div></div>
      <div class="row section"><div class="seg" id="dv">${[["overview", L("Darslar", "Lessons")], ["checks", L("Nazorat", "Checks")], ["marks", L("Baholar", "Marks")], ["mistakes", L("Koʻp xatolar", "Common mistakes")]].map(([k, t]) => `<button data-v="${k}" class="${view === k ? "on" : ""}">${t}</button>`).join("")}</div>
        <span class="spacer"></span>${view === "overview" ? `<select class="inp" id="wf" style="min-width:0"><option value="0">${L("Hamma haftalar", "All weeks")}</option>${C.weeks.map(w => `<option value="${w.week}" ${weekF === w.week ? "selected" : ""}>${w.week}-${L("hafta", "week")}: ${esc(w.titleUz)}</option>`).join("")}</select>` : ""}
        <button class="btn btn-ghost btn-sm" id="csv">⬇ CSV</button></div>
      <div id="dvBody">${!n ? `<div class="card empty">${L("Hali oʻquvchi yoʻq. Oʻquvchilar SS-Courses’ga kirib, biror mashq bajarganda shu yerda paydo boʻladi.", "No students yet. Students appear here after they sign in to SS-Courses and do some work.")}</div>` : ({ overview: () => table(students, grades), checks: checksTable, marks: marksTable, mistakes })[view]()}</div>`;
    wire();
  }
  function wire(){
    SS.$$("#dv button").forEach(b => b.onclick = () => { view = b.dataset.v; render(); });
    const wf = SS.$("#wf"); if (wf) wf.onchange = () => { weekF = +wf.value; render(); };
    const csv = SS.$("#csv"); if (csv) csv.onclick = exportCSV;
    SS.$$("[data-grade]").forEach(inp => inp.onchange = () => {
      const [uid, path] = inp.dataset.grade.split("|"), max = +inp.max;
      let v = inp.value === "" ? "" : Math.max(0, Math.min(max, +inp.value));
      SS.cloud.setGrade(uid, path, v).then(() => SS.toast(L("Saqlandi", "Saved"))).catch(e => SS.toast(SS.cloud.errText(e)));
    });
    SS.$$("[data-stu]").forEach(a => a.onclick = () => studentModal(a.dataset.stu));
  }
  const lp = (s, n) => {
    const l = SS.lesson(n), parts = [];
    l.exercises.forEach(e => { const r = s.px["L" + n + "-" + e.letter]; parts.push(r ? r[0] / r[1] : 0); });
    const ex = s.exit[n]; parts.push(ex ? ex[0] / ex[1] : 0);
    parts.push(s.prac[n] && s.prac[n].done ? 1 : 0);
    parts.push(s.hw[n] && s.hw[n].done ? 1 : 0);
    return Math.round(100 * parts.reduce((a, b) => a + b, 0) / parts.length);
  };
  const cls = p => p == null ? "c0" : p >= 80 ? "c3" : p >= 50 ? "c2" : p > 0 ? "c1" : "c0";
  const certOf = s => { const g = SS.gradeOf(s, grades[s._uid]); return g.known >= 100 && g.total >= C.grading.certificate; };
  const ago = t => { if (!t) return "—"; const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? L("bugun", "today") : d + L(" kun oldin", "d ago"); };
  const sortedIds = (obj) => Object.keys(obj).sort((a, b) => (obj[a].name || "").localeCompare(obj[b].name || ""));

  function table(list, gr){
    const lessons = weekF ? SS.week(weekF).lessons : C.lessons.map(l => l.n);
    return `<div class="tbl-wrap card flat" style="padding:0"><table class="tbl heat"><thead><tr><th class="name">${L("Oʻquvchi", "Student")}</th><th>XP</th><th>🔥</th><th>${L("Oxirgi", "Last")}</th>${lessons.map(n => `<th title="${esc(SS.lesson(n).titleUz)}">${n}</th>`).join("")}<th>${L("Baho", "Grade")}</th></tr></thead><tbody>
      ${sortedIds(list).map(uid => { const s = list[uid]; s._uid = uid; const g = SS.gradeOf(s, gr[uid]);
        return `<tr><td class="name"><a href="javascript:void 0" data-stu="${esc(uid)}"><b>${esc(s.name || s.email || uid)}</b></a><div class="small muted">${esc(s.email || "")}</div></td>
          <td>${s.xp || 0}</td><td>${streakOf(s)}</td><td class="small">${ago(s.lastSeen || s.updatedAt)}</td>
          ${lessons.map(n => { const p = lp(s, n); const hw = s.hw[n]; return `<td><span class="cell ${cls(p || null)}" title="${p}% · ${L("uy vazifasi", "homework")}: ${hw && hw.done ? "✓" : "—"}">${p ? p : "·"}${hw && hw.done ? "✓" : ""}</span></td>`; }).join("")}
          <td><b>${g.total == null ? "—" : Math.round(g.total) + "%"}</b></td></tr>`; }).join("")}
    </tbody></table></div><p class="small muted">${L("Katakda: dars bajarilishi % (mashqlar, chiqish chiptasi, amaliy ish, uy vazifasi). ✓ – uy vazifasi topshirilgan. Ismni bosing – batafsil.", "Each cell: lesson completion % (practice, exit ticket, hands-on task, homework). ✓ = homework handed in. Click a name for details.")}</p>`;
  }
  function streakOf(s){ let n = 0, d = new Date(); const iso = x => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); if (!s.days[iso(d)]) d = new Date(d - 864e5); while (s.days[iso(d)]){ n++; d = new Date(d - 864e5); } return n; }

  function checksTable(){
    return `<div class="tbl-wrap card flat" style="padding:0"><table class="tbl heat"><thead><tr><th class="name">${L("Oʻquvchi", "Student")}</th>${C.checks.map(c => `<th title="${esc(c.subUz)}">${c.final ? "🎓" : c.k}<div class="small muted">${L("test", "test")}+${L("amal", "prac")}</div></th>`).join("")}</tr></thead><tbody>
      ${sortedIds(students).map(uid => { const s = students[uid], g = grades[uid] || {};
        return `<tr><td class="name"><b>${esc(s.name || s.email || uid)}</b></td>${C.checks.map(c => { const r = s.chk[c.k], pr = g.prac && g.prac[c.k];
          return `<td style="white-space:nowrap"><span class="cell ${r ? cls(100 * r.first.score / r.first.max) : "c0"}" title="${r ? L("birinchi urinish", "first attempt") + " " + new Date(r.first.at).toLocaleString() : ""}">${r ? Math.round(c.totals.test * r.first.score / r.first.max) : "—"}</span>
            <input class="inp" type="number" min="0" max="${c.totals.practical}" value="${pr == null ? "" : pr}" data-grade="${esc(uid)}|prac/${c.k}" style="width:56px;min-width:0;padding:3px 5px" title="${L("Amaliy qism bahosi", "Practical mark")} / ${c.totals.practical}"></td>`; }).join("")}</tr>`; }).join("")}
    </tbody></table></div><p class="small muted">${L("Test qismi 60 ballga keltirilgan (birinchi urinish). Amaliy qism bahosini (0–40) katakka yozing – darhol saqlanadi.", "The test part is scaled to 60 points (first attempt). Type the practical mark (0–40) in the box – it saves at once.")}</p>`;
  }
  function marksTable(){
    return `<div class="tbl-wrap card flat" style="padding:0"><table class="tbl heat"><thead><tr><th class="name">${L("Oʻquvchi", "Student")}</th>${C.projects.map(p => `<th title="${esc(p.titleUz)}">🧩 ${p.p}<div class="small muted">/100</div></th>`).join("")}
      <th>${L("Uy", "HW")}</th><th>${L("Loyiha", "Proj")}</th><th>${L("Nazorat", "Checks")}</th><th>${L("Imtihon", "Exam")}</th><th>${L("Yakuniy", "Final")}</th><th>🎓</th></tr></thead><tbody>
      ${sortedIds(students).map(uid => { const s = students[uid], g = grades[uid] || {}, gr = SS.gradeOf(s, g), f = v => v == null ? "—" : Math.round(v) + "%";
        const cert = gr.known >= 100 && gr.total >= C.grading.certificate;
        return `<tr><td class="name"><a href="javascript:void 0" data-stu="${esc(uid)}"><b>${esc(s.name || s.email || uid)}</b></a></td>
          ${C.projects.map(p => `<td><input class="inp" type="number" min="0" max="100" value="${g.proj && g.proj[p.p] != null ? g.proj[p.p] : ""}" data-grade="${esc(uid)}|proj/${p.p}" style="width:62px;min-width:0;padding:3px 5px"></td>`).join("")}
          <td>${f(gr.homework)}</td><td>${f(gr.projects)}</td><td>${f(gr.quizzes)}</td><td>${f(gr.finalExam)}</td><td><b>${gr.total == null ? "—" : Math.round(gr.total) + "%"}</b>${gr.known < 100 ? `<div class="small muted">${gr.known}% ${L("vazn", "weight")}</div>` : ""}</td><td>${cert ? "🎓" : ""}</td></tr>`; }).join("")}
    </tbody></table></div><p class="small muted">${L(`Loyiha bahosini (0–100) yozing. Yakuniy baho: uy vazifalari ${C.grading.weights.homework}%, loyihalar ${C.grading.weights.projects}%, nazorat ishlari ${C.grading.weights.quizzes}%, imtihon ${C.grading.weights.finalExam}%. Sertifikat – ${C.grading.certificate}% dan. Uy vazifasi topshirigʻi bahosi (0–10) – oʻquvchi kartasida.`, `Type project marks (0–100). Final grade: homework ${C.grading.weights.homework}%, projects ${C.grading.weights.projects}%, checks ${C.grading.weights.quizzes}%, exam ${C.grading.weights.finalExam}%. Certificate from ${C.grading.certificate}%. Homework task marks (0–10) are on each student's card.`)}</p>`;
  }
  function mistakes(){
    const cnt = {};
    Object.values(students).forEach(s => Object.keys(s.wrong || {}).forEach(k => { const w = s.wrong[k]; const id = w.q + "||" + w.a; cnt[id] = cnt[id] || { q: w.q, a: w.a, from: w.from, n: 0 }; cnt[id].n++; }));
    const top = Object.values(cnt).sort((a, b) => b.n - a.n).slice(0, 40);
    if (!top.length) return `<div class="card empty">${L("Hali xato javoblar yoʻq.", "No wrong answers yet.")}</div>`;
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${L("Savol", "Question")}</th><th>${L("Toʻgʻri javob", "Right answer")}</th><th>${L("Qayerdan", "From")}</th><th>${L("Oʻquvchi", "Students")}</th></tr></thead><tbody>
      ${top.map(t => `<tr><td>${md(t.q)}</td><td><b>${md(t.a)}</b></td><td class="small muted">${esc(t.from || "")}</td><td><b>${t.n}</b></td></tr>`).join("")}</tbody></table></div>
      <p class="small muted">${L("Oʻquvchilarning «Takrorlash» navbatidagi hali oʻzlashtirilmagan xatolari. Darsda shularni qayta tushuntiring.", "Wrong answers still in students' review queues. Go over these in class.")}</p>`;
  }
  function studentModal(uid){
    const s = students[uid] || (uid === "local" ? Object.assign({ name: L("Shu qurilma", "This device") }, SS.state) : null); if (!s) return;
    const g = grades[uid] || {}, can = SS.cloud && SS.cloud.isStaff && uid !== "local";
    SS.modal(`<h2>${esc(s.name || s.email || uid)}</h2><p class="small muted">${esc(s.email || "")} · XP ${s.xp || 0} · ${L("oxirgi", "last seen")}: ${ago(s.lastSeen || s.updatedAt)}</p>
      <div class="tbl-wrap" style="max-height:60vh;overflow:auto"><table class="tbl"><thead><tr><th>${L("Dars", "Lesson")}</th><th>%</th><th>${L("Uy mashqlari", "HW exercises")}</th><th>${L("Topshiriq", "Task")} /10</th></tr></thead><tbody>
      ${C.lessons.map(l => { const hw = s.hw[l.n], sc = hw && hw.scores ? Object.values(hw.scores) : [], r = sc.reduce((a, x) => a + x[0], 0), t = sc.reduce((a, x) => a + x[1], 0);
        return `<tr><td>${l.n}. ${esc(l.titleUz)}</td><td><span class="cell ${cls(lp(s, l.n) || null)}">${lp(s, l.n)}</span></td><td>${t ? r + "/" + t : "—"}${hw && hw.done ? " ✓" : ""}</td>
          <td>${can ? `<input class="inp" type="number" min="0" max="10" value="${g.task && g.task[l.n] != null ? g.task[l.n] : ""}" data-grade="${esc(uid)}|task/${l.n}" style="width:56px;min-width:0;padding:3px 5px">` : (g.task && g.task[l.n] != null ? g.task[l.n] : "—")}</td></tr>`; }).join("")}
      </tbody></table></div><div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn" onclick="SS.closeModal()">${L("Yopish", "Close")}</button></div>`, m => {
      SS.$$("[data-grade]", m).forEach(inp => inp.onchange = () => { const [u, p] = inp.dataset.grade.split("|"); SS.cloud.setGrade(u, p, inp.value === "" ? "" : Math.max(0, Math.min(10, +inp.value))).then(() => SS.toast(L("Saqlandi", "Saved"))).catch(e => SS.toast(SS.cloud.errText(e))); });
    });
  }
  function exportCSV(){
    const list = Object.keys(students).length ? students : { local: Object.assign({ name: "this device", email: "" }, SS.state) };
    const head = ["name", "email", "xp", "lessons_done"].concat(C.lessons.map(l => "L" + l.n + "%"), C.checks.map(c => "check" + c.k + "_test"), C.checks.map(c => "check" + c.k + "_practical"), C.projects.map(p => "project" + p.p), ["homework%", "projects%", "checks%", "exam%", "final%"]);
    const rows = sortedIds(list).map(uid => { const s = list[uid], g = grades[uid] || {}, gr = SS.gradeOf(s, g), r = v => v == null ? "" : Math.round(v);
      return [s.name || "", s.email || "", s.xp || 0, C.lessons.filter(l => lp(s, l.n) >= 80).length]
        .concat(C.lessons.map(l => lp(s, l.n)), C.checks.map(c => s.chk[c.k] ? Math.round(c.totals.test * s.chk[c.k].first.score / s.chk[c.k].first.max) : ""), C.checks.map(c => g.prac && g.prac[c.k] != null ? g.prac[c.k] : ""), C.projects.map(p => g.proj && g.proj[p.p] != null ? g.proj[p.p] : ""), [r(gr.homework), r(gr.projects), r(gr.quizzes), r(gr.finalExam), r(gr.total)]); });
    const csv = "﻿" + [head].concat(rows).map(r => r.map(x => /[",\n;]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : x).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "ss-courses-" + SS.today() + ".csv"; a.click();
  }
})();
