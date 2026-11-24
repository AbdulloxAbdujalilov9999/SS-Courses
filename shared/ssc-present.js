/* SS-Courses presenter: shows one section (lesson / check / project / intro) of a week's deck
 * full screen. Slides are drawn from the deck's PDF export with pdf.js, so they look exactly
 * like PowerPoint. Keys: ← → Space PgUp PgDn, Home/End, F fullscreen, O outline,
 * A show/hide answer slides, B black screen, Esc close. Click/tap the left or right side, or swipe.
 */
(function(){
  "use strict";
  const SS = window.SS, esc = SS.esc;
  const docs = {};   // pdf url -> Promise<PDFDocumentProxy>
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

  function getDoc(url){
    if (!docs[url]) docs[url] = pdfjsLib.getDocument({ url }).promise.catch(e => { delete docs[url]; throw e; });
    return docs[url];
  }

  SS.present = function(weekN, secIdx, startAt){
    const w = SS.week(weekN); if (!w) return;
    const sec = w.deck.sections[secIdx]; if (!sec) return;
    const url = SS.file(w.deck.pdf);
    const posKey = "ssc_pos_" + weekN + "_" + secIdx;
    const teacher = SS.isTeacher();
    let showAns = teacher && !SS.settings.skipAns;
    const all = sec.slides.length ? sec.slides : SS.range(sec.start, sec.end).map(n => ({ n, label: "", title: "" }));
    const list = () => all.filter(s => showAns || !s.ans);
    let slides = list();
    let i = 0;
    try { const saved = +localStorage.getItem(posKey); const j = slides.findIndex(s => s.n === (startAt || saved)); if (j > 0) i = j; } catch (e) {}
    let outline = false, black = false, rendering = null, startT = Date.now();

    const root = document.getElementById("presenterRoot");
    root.innerHTML = `<div class="pres" tabindex="-1">
      <div class="pres-top">
        <button data-a="close" title="Esc">✕</button>
        <span class="t">${esc(sec.name)}</span>
        <span class="timer-s" style="font-family:var(--font-mono);opacity:.7"></span>
        ${teacher ? `<button data-a="ans" title="A">${showAns ? "🔑 " + SS.L("Javoblar bor", "Answers shown") : "🔒 " + SS.L("Javoblarsiz", "No answers")}</button>` : ""}
        <button data-a="outline" title="O">☰</button>
        <button data-a="fs" title="F">⛶</button>
      </div>
      <div class="pres-stage"><div class="pres-loading">${SS.L("Slaydlar yuklanmoqda…", "Loading slides…")}</div><canvas hidden></canvas>
        <div class="pres-nav l" data-a="prev"></div><div class="pres-nav r" data-a="next"></div></div>
      <div class="pres-bottom"><button data-a="prev" class="btn btn-sm" style="background:rgba(255,255,255,.1);color:#fff">←</button>
        <div class="bar"><i style="background:#5562F0"></i></div>
        <span class="cnt small" style="min-width:70px;text-align:center"></span>
        <button data-a="next" class="btn btn-sm" style="background:rgba(255,255,255,.1);color:#fff">→</button></div>
    </div>`;
    const el = root.firstChild, canvas = SS.$("canvas", el), stage = SS.$(".pres-stage", el);
    el.focus();
    document.body.style.overflow = "hidden";

    async function draw(){
      const s = slides[i]; if (!s) return;
      SS.$(".cnt", el).textContent = (i + 1) + " / " + slides.length;
      SS.$(".bar i", el).style.width = (100 * (i + 1) / slides.length) + "%";
      try { localStorage.setItem(posKey, s.n); } catch (e) {}
      const my = rendering = {};
      try {
        const doc = await getDoc(url);
        const page = await doc.getPage(s.n);
        if (my !== rendering) return;
        const vp1 = page.getViewport({ scale: 1 });
        const box = stage.getBoundingClientRect();
        const scale = Math.min(box.width / vp1.width, box.height / vp1.height) * (window.devicePixelRatio || 1);
        const vp = page.getViewport({ scale });
        const off = document.createElement("canvas"); off.width = vp.width; off.height = vp.height;
        await page.render({ canvasContext: off.getContext("2d"), viewport: vp }).promise;
        if (my !== rendering) return;
        canvas.width = off.width; canvas.height = off.height;
        canvas.getContext("2d").drawImage(off, 0, 0);
        canvas.style.width = (vp.width / (window.devicePixelRatio || 1)) + "px";
        canvas.style.height = (vp.height / (window.devicePixelRatio || 1)) + "px";
        canvas.hidden = black; SS.$(".pres-loading", el).hidden = true;
        // warm the next page
        if (slides[i + 1]) doc.getPage(slides[i + 1].n).catch(() => {});
      } catch (e) {
        SS.$(".pres-loading", el).hidden = false;
        SS.$(".pres-loading", el).innerHTML = SS.L("Slaydni ochib boʻlmadi. Fayl: ", "Could not open the slides. File: ") + `<a style="color:#AEB5FF" href="${url}" target="_blank">${esc(SS.fname(w.deck.pdf))}</a>`;
        console.warn(e);
      }
      if (outline) drawOutline();
    }
    function drawOutline(){
      let o = SS.$(".pres-outline", el);
      if (!outline){ if (o) o.remove(); return; }
      if (!o){ o = document.createElement("div"); o.className = "pres-outline"; stage.appendChild(o); }
      o.innerHTML = slides.map((s, j) => `<button data-go="${j}" class="${j === i ? "on" : ""} ${s.ans ? "ans" : ""}">${s.n}. ${esc(s.label ? s.label + " — " : "")}${esc(s.title || "")}${s.ans ? " 🔑" : ""}</button>`).join("");
      const on = SS.$(".on", o); if (on) on.scrollIntoView({ block: "center" });
    }
    const go = d => { const j = Math.max(0, Math.min(slides.length - 1, i + d)); if (j !== i){ i = j; draw(); } };
    function close(){
      clearInterval(tm); removeEventListener("resize", onResize); document.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      root.innerHTML = ""; document.body.style.overflow = "";
      if (sec.type === "lesson" && sec.num){ const st = SS.state; st.seen["T" + sec.num] = Date.now(); SS.commit("seen"); }
    }
    function toggleAns(){
      if (!teacher) return;
      const cur = slides[i]; showAns = !showAns; SS.settings.skipAns = !showAns; SS.saveSettings();
      slides = list(); i = Math.max(0, slides.findIndex(s => s.n >= cur.n)); if (i < 0) i = slides.length - 1;
      const b = SS.$('[data-a="ans"]', el); if (b) b.textContent = showAns ? "🔑 " + SS.L("Javoblar bor", "Answers shown") : "🔒 " + SS.L("Javoblarsiz", "No answers");
      draw();
    }
    el.addEventListener("click", e => {
      const g = e.target.closest("[data-go]"); if (g){ i = +g.dataset.go; draw(); return; }
      const a = e.target.closest("[data-a]"); if (!a) return;
      ({ close, prev: () => go(-1), next: () => go(1), ans: toggleAns,
         outline: () => { outline = !outline; drawOutline(); },
         fs: () => { document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen().catch(() => {}); } })[a.dataset.a]();
    });
    function onKey(e){
      if (e.target.tagName === "INPUT") return;
      const k = e.key;
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(k)){ e.preventDefault(); go(1); }
      else if (["ArrowLeft", "PageUp", "Backspace"].includes(k)){ e.preventDefault(); go(-1); }
      else if (k === "Home"){ i = 0; draw(); }
      else if (k === "End"){ i = slides.length - 1; draw(); }
      else if (k === "Escape"){ if (outline){ outline = false; drawOutline(); } else close(); }
      else if (k === "f" || k === "F"){ document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen().catch(() => {}); }
      else if (k === "o" || k === "O"){ outline = !outline; drawOutline(); }
      else if (k === "a" || k === "A") toggleAns();
      else if (k === "b" || k === "B" || k === "."){ black = !black; canvas.hidden = black; }
    }
    document.addEventListener("keydown", onKey);
    let tx = null;
    stage.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); tx = null; });
    let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(draw, 150); };
    addEventListener("resize", onResize);
    const tm = setInterval(() => { const s = Math.floor((Date.now() - startT) / 1000); SS.$(".timer-s", el).textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }, 1000);
    draw();
  };

  /* slide thumbnails for lesson pages (rendered lazily, small) */
  SS.thumbs = function(container, weekN, secIdx){
    const w = SS.week(weekN), sec = w.deck.sections[secIdx];
    const teacher = SS.isTeacher();
    const slides = sec.slides.filter(s => teacher || !s.ans);
    container.innerHTML = slides.map(s => `<button class="thumb" data-n="${s.n}" title="${esc(s.title || "")}" style="border:1px solid var(--line);border-radius:8px;padding:0;background:var(--surface);cursor:pointer;overflow:hidden;line-height:0;position:relative"><canvas style="width:100%;aspect-ratio:16/9;background:var(--surface-2)"></canvas>${s.ans ? '<span style="position:absolute;top:4px;right:4px;line-height:1">🔑</span>' : ""}</button>`).join("");
    const io = new IntersectionObserver(ents => ents.forEach(async en => {
      if (!en.isIntersecting) return; io.unobserve(en.target);
      const n = +en.target.dataset.n, cv = SS.$("canvas", en.target);
      try {
        const doc = await getDoc(SS.file(w.deck.pdf)), page = await doc.getPage(n);
        const vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 360 / vp1.width });
        cv.width = vp.width; cv.height = vp.height;
        await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      } catch (e) {}
    }), { rootMargin: "200px" });
    SS.$$(".thumb", container).forEach(b => { io.observe(b); b.onclick = () => SS.present(weekN, secIdx, +b.dataset.n); });
  };
})();
