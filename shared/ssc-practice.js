/* SS-Courses practice engine: draws one prepared exercise (course.json shape) and checks it.
 *
 *   const ex = SS.Exercise(container, exercise, {
 *     mode: "practice" | "homework" | "test",   // practice: check + retry; homework: answers saved, check once; test: no feedback until reveal()
 *     key: "L3-B",                               // where answers / scores are stored
 *     answers: {…},                              // saved answers to restore
 *     points: 2,                                 // test mode: points per item
 *     onChange(answers), onScore(right, total, details)
 *   });
 *   ex.check()  -> {right, total}     ex.answers()     ex.reveal()
 *
 * Types: choose, match, truefalse, order, gap, fix, label (see materials SCHEMA.md).
 */
(function(){
  "use strict";
  const SS = window.SS, esc = SS.esc, md = SS.md;
  const TYPE_UZ = { choose: "Tanlash", match: "Moslash", truefalse: "Toʻgʻri / notoʻgʻri", order: "Tartiblash", gap: "Boʻsh joy", fix: "Xatoni tuzating", label: "Rasmdagi qismlar" };
  SS.TYPE_UZ = TYPE_UZ;

  SS.Exercise = function(root, ex, opts){
    opts = opts || {};
    const mode = opts.mode || "practice";
    let ans = Object.assign({}, opts.answers || {});
    let checked = false, override = {};
    const hasBox = ex.box && ex.box.length && (ex.type === "gap" || ex.type === "label");

    root.classList.add("ex");
    root.innerHTML = `
      <div class="ex-head"><span class="ex-letter">${esc(ex.letter || "")}</span><div><h3>${md(ex.titleUz)}</h3><div class="small muted">${esc(TYPE_UZ[ex.type] || ex.type)}${opts.points ? " · " + ex.items.length * opts.points + " " + SS.L("ball", "points") : ""}</div></div></div>
      <div class="ex-instr">${md(ex.instrUz)}</div>
      ${hasBox ? `<div class="ex-box">${ex.box.map(w => `<span data-w="${esc(w)}">${esc(w)}</span>`).join("")}</div>` : ""}
      ${ex.type === "label" && ex.shot ? `<div class="shot" style="max-width:820px"><img src="${SS.img(ex.shot)}" alt="" loading="lazy"></div>` : ""}
      ${ex.type === "match" ? `<div class="ex-box" style="flex-direction:column;gap:4px">${ex.options.map(o => `<div><b>${esc(o.letter)})</b> ${md(o.text)}</div>`).join("")}</div>` : ""}
      <div class="${ex.type === "label" ? "label-grid" : "items"}">${ex.items.map(it => itemHTML(it)).join("")}</div>
      ${mode === "test" ? "" : `<div class="ex-actions">
        <button class="btn btn-accent" data-act="check">${SS.L("Tekshirish", "Check")}</button>
        <button class="btn btn-ghost hidden" data-act="retry">${SS.L("Qayta urinish", "Try again")}</button>
        <button class="btn btn-ghost btn-sm hidden" data-act="show">${SS.L("Javoblarni koʻrsatish", "Show answers")}</button>
        <span class="score"></span></div>`}`;

    const shotImg = SS.$(".shot img", root);
    if (shotImg) shotImg.onclick = () => SS.lightbox(shotImg.src);

    function itemHTML(it){
      const n = it.n, v = ans[n] == null ? "" : ans[n];
      switch (ex.type){
        case "choose":
          return `<div class="item" data-n="${n}"><div class="q"><span class="n">${n}.</span><span>${md(it.q)}</span></div>
            <div class="opts">${it.options.map(o => `<button class="opt ${v === o.letter ? "sel" : ""}" data-v="${esc(o.letter)}"><b>${esc(o.letter)})</b> ${md(o.text)}</button>`).join("")}</div><div class="fb"></div></div>`;
        case "match":
          return `<div class="item" data-n="${n}"><div class="q"><span class="n">${n}.</span><span>${md(it.q)}</span>
            <select class="inp" style="min-width:0;margin-left:auto"><option value="">—</option>${ex.options.map(o => `<option value="${esc(o.letter)}" ${v === o.letter ? "selected" : ""}>${esc(o.letter)}) ${esc(SS.plain(o.text))}</option>`).join("")}</select></div><div class="fb"></div></div>`;
        case "truefalse":
          return `<div class="item" data-n="${n}"><div class="q"><span class="n">${n}.</span><span>${md(it.q)}</span></div>
            <div class="opts tf"><button class="opt ${v === "T" ? "sel" : ""}" data-v="T">T · ${SS.L("Toʻgʻri", "True")}</button><button class="opt ${v === "F" ? "sel" : ""}" data-v="F">F · ${SS.L("Notoʻgʻri", "False")}</button></div><div class="fb"></div></div>`;
        case "order": {
          const cur = v ? v.split(",").map(s => s.trim()).filter(Boolean) : it.steps.map(s => s.letter);
          const byL = {}; it.steps.forEach(s => { byL[s.letter] = s; });
          return `<div class="item" data-n="${n}"><div class="q"><span class="n">${n}.</span><span><b>${md(it.q)}</b> <span class="small muted">— ${SS.L("sudrab yoki ↑↓ bilan tartiblang", "drag or use ↑↓")}</span></span></div>
            <ol class="order-list">${cur.map(L => byL[L] ? `<li data-l="${esc(L)}"><span class="h">⠿</span><b>${esc(L)}</b> ${md(byL[L].text)}<span class="mv"><button data-mv="-1" aria-label="up">↑</button><button data-mv="1" aria-label="down">↓</button></span></li>` : "").join("")}</ol><div class="fb"></div></div>`;
        }
        case "gap": {
          const q = md(it.q).replace(/<span class="gap">_____<\/span>/, `<input class="inp inline-inp" value="${esc(v)}" autocomplete="off" spellcheck="false">`);
          const hasInp = q.includes("<input");
          return `<div class="item" data-n="${n}"><div class="q"><span class="n">${n}.</span><span>${q}</span></div>
            ${hasInp ? "" : `<div style="padding-left:28px"><input class="inp" value="${esc(v)}" autocomplete="off"></div>`}
            ${it.hint ? `<div class="small muted" style="padding-left:28px">💡 ${md(it.hint)}</div>` : ""}<div class="fb"></div></div>`;
        }
        case "fix":
          return `<div class="item" data-n="${n}"><div class="q"><span class="n">${n}.</span><span>${md(it.q)}</span></div>
            <div style="padding-left:28px"><input class="inp" style="width:100%;max-width:520px" value="${esc(v)}" placeholder="${SS.L("Toʻgʻrisini yozing…", "Write the correct version…")}" autocomplete="off"></div>
            ${it.hint ? `<div class="small muted" style="padding-left:28px">💡 ${md(it.hint)}</div>` : ""}<div class="fb"></div></div>`;
        case "label":
          return `<div class="item" data-n="${n}" style="border:0;padding:4px 0"><label><span class="badge">${n}</span><input class="inp" style="flex:1;min-width:0" value="${esc(v)}" autocomplete="off"></label><div class="fb" style="padding-left:32px"></div></div>`;
      }
      return "";
    }

    /* ---- input wiring ---- */
    let lastInput = null;
    root.addEventListener("focusin", e => { if (e.target.matches("input.inp")) lastInput = e.target; });
    root.addEventListener("click", e => {
      const opt = e.target.closest(".opt");
      if (opt && !checked){
        const item = opt.closest(".item"), n = item.dataset.n;
        SS.$$(".opt", item).forEach(b => b.classList.toggle("sel", b === opt));
        ans[n] = opt.dataset.v; changed();
        return;
      }
      const mv = e.target.closest("[data-mv]");
      if (mv && !checked){
        const li = mv.closest("li"), d = +mv.dataset.mv;
        if (d < 0 && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
        if (d > 0 && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
        readOrder(li.closest(".item")); return;
      }
      const w = e.target.closest(".ex-box span[data-w]");
      if (w && !checked){
        let inp = lastInput && root.contains(lastInput) && !lastInput.value ? lastInput : SS.$$("input.inp", root).find(i => !i.value);
        if (!inp) inp = lastInput;
        if (inp){ inp.value = w.dataset.w; inp.dispatchEvent(new Event("input", { bubbles: true })); const next = SS.$$("input.inp", root).find(i => !i.value); if (next) next.focus(); }
        return;
      }
      const act = e.target.closest("[data-act]");
      if (act){
        if (act.dataset.act === "check") check();
        if (act.dataset.act === "retry") retry();
        if (act.dataset.act === "show") showAnswers();
        return;
      }
      const ov = e.target.closest("[data-override]");
      if (ov){ override[ov.dataset.override] = true; check(true); }
    });
    root.addEventListener("input", e => {
      const item = e.target.closest(".item"); if (!item) return;
      ans[item.dataset.n] = e.target.value; changed(); markUsed();
    });
    root.addEventListener("change", e => {
      if (e.target.tagName === "SELECT"){ const item = e.target.closest(".item"); ans[item.dataset.n] = e.target.value; changed(); }
    });
    root.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("input.inp")){ const all = SS.$$("input.inp", root), i = all.indexOf(e.target); if (all[i + 1]) all[i + 1].focus(); else if (mode !== "test") check(); } });
    SS.$$(".order-list", root).forEach(dragList);
    function readOrder(item){ ans[item.dataset.n] = SS.$$("li", item).map(li => li.dataset.l).join(", "); changed(); }
    function markUsed(){
      if (!hasBox) return;
      const vals = SS.$$("input.inp", root).map(i => SS.norm(i.value));
      SS.$$(".ex-box span[data-w]", root).forEach(s => s.classList.toggle("used", vals.includes(SS.norm(s.dataset.w))));
    }
    markUsed();
    function changed(){ if (opts.onChange) opts.onChange(Object.assign({}, ans)); }

    // pointer drag for order lists (works with mouse and touch)
    function dragList(ol){
      let drag = null;
      ol.addEventListener("pointerdown", e => {
        if (checked || e.target.closest("button")) return;
        const li = e.target.closest("li"); if (!li) return;
        drag = li; li.classList.add("drag"); li.setPointerCapture(e.pointerId);
      });
      ol.addEventListener("pointermove", e => {
        if (!drag) return;
        const over = document.elementFromPoint(e.clientX, e.clientY);
        const li = over && over.closest && over.closest("li");
        if (li && li !== drag && li.parentNode === ol){
          const r = li.getBoundingClientRect();
          ol.insertBefore(drag, e.clientY < r.top + r.height / 2 ? li : li.nextSibling);
        }
      });
      const end = () => { if (drag){ drag.classList.remove("drag"); readOrder(drag.closest(".item")); drag = null; } };
      ol.addEventListener("pointerup", end); ol.addEventListener("pointercancel", end);
    }

    /* ---- checking ---- */
    function itemRight(it){
      const n = it.n, v = ans[n];
      if (override[n]) return true;
      switch (ex.type){
        case "choose": case "match": case "truefalse": return v === it.answer;
        case "order": return SS.orderRight(v || SS.$$("li", SS.$(`.item[data-n="${n}"]`, root)).map(li => li.dataset.l).join(","), it.answer);
        case "gap": case "label": return SS.isRight(v, it.answer) || SS.isRoughlyRight(v, it.answer);
        case "fix": return SS.isRoughlyRight(v, it.answer);
      }
      return false;
    }
    function check(silent){
      checked = true;
      let right = 0; const details = [];
      ex.items.forEach(it => {
        const ok = itemRight(it); if (ok) right++;
        details.push({ n: it.n, ok, given: ans[it.n] || "", answer: it.answerText || it.answer, q: it.q || (ex.type === "label" ? SS.plain(ex.titleUz) + " — " + SS.L("rasmdagi", "picture, number") + " " + it.n : "") });
        paint(it, ok);
      });
      const total = ex.items.length;
      if (mode !== "test"){
        const sc = SS.$(".score", root);
        sc.textContent = `${right} / ${total}` + (right === total ? " ✓ " + SS.L("Ajoyib!", "Perfect!") : "");
        sc.classList.toggle("full", right === total);
        SS.$('[data-act="check"]', root).classList.add("hidden");
        if (mode === "practice") SS.$('[data-act="retry"]', root).classList.remove("hidden");
        if (right < total && (mode === "practice" || SS.isTeacher())) SS.$('[data-act="show"]', root).classList.remove("hidden");
      }
      SS.$$("input, select", root).forEach(i => { i.readOnly = true; if (i.tagName === "SELECT") i.disabled = true; });
      if (opts.onScore) opts.onScore(right, total, details, !!silent);
      return { right, total, details };
    }
    function paint(it, ok){
      const item = SS.$(`.item[data-n="${it.n}"]`, root); if (!item) return;
      const fb = SS.$(".fb", item);
      SS.$$(".opt", item).forEach(b => {
        b.classList.remove("right", "wrong");
        if (b.classList.contains("sel")) b.classList.add(ok ? "right" : "wrong");
      });
      SS.$$("input.inp, select", item).forEach(i => { i.classList.toggle("right", ok); i.classList.toggle("wrong", !ok); });
      const ol = SS.$(".order-list", item); if (ol){ ol.classList.toggle("right", ok); ol.classList.toggle("wrong", !ok); }
      if (mode === "test"){ fb.innerHTML = ""; return; }
      if (ok){
        fb.className = "fb ok";
        fb.innerHTML = "✓" + (ex.type === "truefalse" && it.answer === "F" && it.fix ? " " + md(it.fix) : "");
      } else {
        fb.className = "fb no";
        const typed = ["gap", "fix", "label"].includes(ex.type) && ans[it.n];
        fb.innerHTML = "✗" + (typed ? ` <button class="btn btn-ghost btn-sm" data-override="${it.n}" style="margin-left:6px">${SS.L("Men toʻgʻri yozdim", "I was right")}</button>` : "");
      }
    }
    function showAnswers(){
      ex.items.forEach(it => {
        const item = SS.$(`.item[data-n="${it.n}"]`, root); if (!item) return;
        const fb = SS.$(".fb", item);
        fb.innerHTML += ` <span class="muted">→ ${md(it.answerText || it.answer)}</span>`;
        SS.$$(".opt", item).forEach(b => { if (b.dataset.v === it.answer) b.classList.add("right"); });
      });
      SS.$('[data-act="show"]', root).classList.add("hidden");
    }
    function retry(){
      checked = false; override = {};
      // keep right answers, clear wrong ones
      ex.items.forEach(it => { if (!itemRight(it) && ex.type !== "order") delete ans[it.n]; });
      const items = SS.$(ex.type === "label" ? ".label-grid" : ".items", root);
      items.innerHTML = ex.items.map(it => itemHTML(it)).join("");
      SS.$$(".order-list", root).forEach(dragList);
      SS.$('[data-act="check"]', root).classList.remove("hidden");
      SS.$('[data-act="retry"]', root).classList.add("hidden");
      SS.$('[data-act="show"]', root).classList.add("hidden");
      SS.$(".score", root).textContent = "";
      markUsed();
    }
    // test mode: after the paper is handed in, show what was right/wrong and the key
    function reveal(){
      ex.items.forEach(it => {
        const ok = itemRight(it), item = SS.$(`.item[data-n="${it.n}"]`, root); if (!item) return;
        const fb = SS.$(".fb", item);
        fb.className = "fb " + (ok ? "ok" : "no");
        fb.innerHTML = ok ? "✓" : `✗ <span class="muted">→ ${md(it.answerText || it.answer)}</span>`;
      });
    }
    return { check, reveal, answers: () => Object.assign({}, ans), lock(){ checked = true; SS.$$("input, select", root).forEach(i => { i.readOnly = true; }); } };
  };

  /* ---- record a practice result: best score, XP for improvement, wrong answers into review ---- */
  SS.recordPractice = (key, right, total, details, label) => {
    const st = SS.state, prev = st.px[key];
    const best = prev ? Math.max(prev[0], right) : right;
    st.px[key] = [best, total, Date.now()];
    const gain = Math.max(0, best - (prev ? prev[0] : 0));
    SS.commit("px");
    (details || []).forEach(d => {
      if (!d.ok && d.answer) SS.srsAdd("w:" + key + "-" + d.n, { q: SS.plain(d.q || ""), a: SS.plain(d.answer), from: label || key });
    });
    if (gain) SS.addXP(gain * 10, label || SS.L("Mashq", "Practice"));
    if (right === total && (!prev || prev[0] < total)) SS.confetti();
  };
})();
