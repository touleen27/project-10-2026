// ===== למידה: התקדמות, תרגול, טעויות, אוצר מילים (נשמר בדפדפן בלבד) =====
window.Study = (() => {
  const KEY = "yaelnet.v1", PLAN = window.PLAN || { paywall: false, freeExams: 2 };
  const KIND = l => l === "השלמת משפטים" ? "sc" : l === "ניסוח מחדש" ? "rs" : "rd";
  const KNAME = { sc: "השלמת משפטים", rs: "ניסוח מחדש", rd: "הבנת הנקרא" };
  const DAY = 864e5, BOX = [0, 1, 3, 7, 14];
  let db;
  const load = () => { try { db = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { db = {}; } db.attempts = db.attempts || []; db.mistakes = db.mistakes || {}; db.words = db.words || {}; db.started = db.started || []; };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} if (window.Cloud) Cloud.push(); };
  load();

  // כל השאלות במאגר
  let pool;
  const allQ = () => {
    if (pool) return pool;
    pool = [];
    (window.EXAMS || []).forEach(e => e.sections.forEach(s => {
      const sn = (s.name.match(/\d+/) || [0])[0]; let n = 0;
      s.groups.forEach(g => g.questions.forEach(q => {
        n++;
        const id = e.id + ":" + sn + "." + n, nt = ((window.NOTES || {})[e.id] || {})[sn + "." + n];
        pool.push({ id, exam: e.title, sec: s.name, num: n, g, q, kind: KIND(g.label), note: nt });
      }));
    }));
    return pool;
  };
  const byId = id => allQ().find(x => x.id === id);

  // ---------- שמירת ניסיון ----------
  function onFinish(exam, flat, answers, key) {
    const types = { sc: [0, 0], rs: [0, 0], rd: [0, 0] }; let right = 0, total = 0;
    exam.sections.forEach((s, si) => {
      const sn = (s.name.match(/\d+/) || [0])[0];
      flat[si].forEach((x, i) => {
        const ok = answers[key(si, i)] === x.q.correct, k = KIND(x.g.label), id = exam.id + ":" + sn + "." + x.num;
        types[k][1]++; total++;
        if (ok) { types[k][0]++; right++; delete db.mistakes[id]; }
        else db.mistakes[id] = { t: Date.now() };
      });
    });
    if (total) { db.attempts.push({ id: exam.id, title: exam.title, t: Date.now(), right, total, types, full: !!exam.fullMc }); }
    db.last = db.attempts.length - 1;
    save();
  }
  function setWriting(score) {
    const a = db.attempts[db.last]; if (!a) return;
    a.writing = isNaN(score) ? null : score; save();
  }
  const unlocked = () => { try { const u = JSON.parse(localStorage.getItem(KEY + ".unlock")); return !!u && u.until >= new Date().toISOString().slice(0, 10) && (PLAN.codes || []).some(c => c.h === u.h && c.until === u.until); } catch (e) { return false; } };
  async function unlock(code) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code.trim().toUpperCase()));
      const h = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
      const c = (PLAN.codes || []).find(x => x.h === h);
      if (!c || c.until < new Date().toISOString().slice(0, 10)) return false;
      localStorage.setItem(KEY + ".unlock", JSON.stringify(c)); return true;
    } catch (e) { return false; }
  }
  function canStart(id) {
    if (!PLAN.paywall || PLAN.premium || unlocked() || (window.Cloud && Cloud.isPremium())) return true;
    if (db.started.includes(id)) return true;
    if (db.started.length < PLAN.freeExams) { db.started.push(id); save(); return true; }
    return false;
  }

  // ---------- תצוגות ----------
  const root = () => $("studyBody");
  const pct = (r, n) => n ? Math.round(r / n * 100) : 0;
  function open(tab) {
    $("home").hidden = true; $("study").hidden = false;
    document.querySelectorAll("#studyTabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    ({ progress, practice, words })[tab]();
  }
  function progress() {
    const A = db.attempts;
    if (!A.length) { root().innerHTML = `<p class="empty">עדיין אין נתונים. סיימו בחינה אחת וההתקדמות תופיע כאן.</p>`; return; }
    const sum = { sc: [0, 0], rs: [0, 0], rd: [0, 0] };
    A.forEach(a => Object.keys(sum).forEach(k => { sum[k][0] += a.types[k][0]; sum[k][1] += a.types[k][1]; }));
    const weakest = Object.keys(sum).filter(k => sum[k][1]).sort((x, y) => pct(...sum[x]) - pct(...sum[y]))[0];
    const bars = Object.keys(sum).map(k => { const p = pct(...sum[k]); return `<div class="brow"><span>${KNAME[k]}</span><div class="bar"><i style="width:${p}%"></i></div><b>${p}%</b></div>`; }).join("");
    // גרף קווי של אחוז הצלחה
    const W = 560, H = 160, P = 28, pts = A.map((a, i) => [P + (A.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (A.length - 1)), H - P - pct(a.right, a.total) / 100 * (H - 2 * P), pct(a.right, a.total)]);
    const line = pts.map(p => p[0] + "," + p[1]).join(" ");
    const svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="אחוז הצלחה לאורך בחינות">
      ${[0, 50, 100].map(v => { const y = H - P - v / 100 * (H - 2 * P); return `<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" class="grid"/><text x="${P - 6}" y="${y + 4}" text-anchor="end" class="tick">${v}</text>`; }).join("")}
      <polyline points="${line}" class="ln-chart"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" class="dot"/><text x="${p[0]}" y="${p[1] - 9}" text-anchor="middle" class="tick">${p[2]}</text>`).join("")}</svg>`;
    const list = A.slice().reverse().slice(0, 12).map(a => `<tr><td>${new Date(a.t).toLocaleDateString("he-IL")}</td><td>${esc(a.title)}</td><td>${a.right}/${a.total}</td><td>${pct(a.right, a.total)}%</td><td>${a.writing == null ? "—" : a.writing + "/50"}</td></tr>`).join("");
    root().innerHTML = `<div class="stat est"><b>${A.length}</b>בחינות שנעשו</div>
      <h3>אחוז הצלחה לפי סוג שאלה</h3><div class="bars">${bars}</div>
      ${weakest ? `<p class="tip">💡 הנקודה החלשה שלכם: <b>${KNAME[weakest]}</b>. אפשר לתרגל אותה בלשונית "תרגול".</p>` : ""}
      <h3>אחוז הצלחה לאורך הבחינות</h3>${svg}
      <h3>בחינות אחרונות</h3><div class="scroll"><table class="tbl"><tr><th>תאריך</th><th>בחינה</th><th>סגורות</th><th>%</th><th>כתיבה</th></tr>${list}</table></div>`;
  }

  // ----- תרגול -----
  function practice() {
    const mist = Object.keys(db.mistakes).filter(byId);
    root().innerHTML = `<p>תרגול ללא הגבלת זמן, עם משוב מיידי והסבר לכל שאלה.</p><div class="pgrid">
      <button class="pbtn" data-m="mistakes" ${mist.length ? "" : "disabled"}>מהטעויות שלי<small>${mist.length} שאלות</small></button>
      <button class="pbtn" data-m="sc">השלמת משפטים<small>10 שאלות</small></button>
      <button class="pbtn" data-m="rs">ניסוח מחדש<small>10 שאלות</small></button>
      <button class="pbtn" data-m="rd">הבנת הנקרא<small>5 שאלות</small></button></div>`;
    root().querySelectorAll(".pbtn").forEach(b => b.onclick = () => {
      const m = b.dataset.m;
      let qs = m === "mistakes" ? mist.map(byId) : allQ().filter(x => x.kind === m);
      qs = qs.sort(() => Math.random() - .5).slice(0, m === "rd" ? 5 : 10);
      session(qs, 0, 0);
    });
  }
  function session(qs, i, right) {
    if (i >= qs.length) {
      root().innerHTML = `<div class="stat est"><b>${right}/${qs.length}</b>תשובות נכונות</div><button class="primary" id="again">חזרה לתרגול</button>`;
      $("again").onclick = () => open("practice"); return;
    }
    const x = qs[i], passage = x.g.passage ? `<div class="passage sess-passage">${x.g.passage.split(/\n\n+/).map(p => `<p>${esc(p).replace(/⟦(\d+)⟧/g, '<span class="ln">$1</span>')}</p>`).join("")}</div>` : "";
    root().innerHTML = `<div class="sess"><small>${i + 1}/${qs.length} · ${x.exam} · ${x.sec} שאלה ${x.num}</small>${passage}<h3 class="q-text">${esc(x.q.q)}</h3><div id="sopts" class="opts"></div><div id="sfb"></div></div>`;
    let done = false;
    x.q.options.forEach((o, oi) => {
      const b = document.createElement("button"); b.className = "opt"; b.innerHTML = `<span class="radio"><i></i></span><span class="otxt">${esc(o)}</span>`;
      b.onclick = () => {
        if (done) return; done = true;
        const ok = oi === x.q.correct;
        [...$("sopts").children].forEach((c, ci) => c.classList.add(ci === x.q.correct ? "right" : ci === oi ? "wrong" : "dim"));
        if (ok) { right++; delete db.mistakes[x.id]; } else db.mistakes[x.id] = { t: Date.now() };
        save();
        const nt = x.note;
        $("sfb").innerHTML = `<p class="fb ${ok ? "ok" : "no"}">${ok ? "נכון! ✔" : "לא נכון ✘"}</p>` +
          (nt ? `<div class="why"><p>${esc(nt[0])}</p><div class="vws">${nt[1].map(p => `<span class="vw"><b>${esc(p[0])}</b> ${esc(p[1])}</span>`).join("")}</div></div>` : "") +
          `<button class="primary" id="snext">${i + 1 < qs.length ? "הבא" : "סיום"}</button>`;
        $("snext").onclick = () => session(qs, i + 1, right);
      };
      $("sopts").appendChild(b);
    });
  }

  // ----- אוצר מילים (חזרה מרווחת) -----
  const wordPool = () => {
    const m = new Map();
    Object.values(window.NOTES || {}).forEach(ex => Object.values(ex).forEach(n => n[1].forEach(p => { if (!m.has(p[0])) m.set(p[0], p[1]); })));
    return m;
  };
  function words() {
    const pool = wordPool(), now = Date.now();
    const due = [...pool.keys()].filter(w => db.words[w] && db.words[w].due <= now);
    const fresh = [...pool.keys()].filter(w => !db.words[w]);
    const known = Object.values(db.words).filter(w => w.box >= 3).length;
    root().innerHTML = `<div class="summary"><div class="stat"><b>${pool.size}</b>מילים במאגר</div><div class="stat"><b>${due.length}</b>לחזרה היום</div><div class="stat"><b>${known}</b>מילים שאתם שולטים בהן</div></div>
      <button class="primary" id="goCards" ${(due.length + fresh.length) ? "" : "disabled"}>להתחיל תרגול (${Math.min(15, due.length + fresh.length)} כרטיסים)</button>
      <p class="tip">כרטיס שענו עליו נכון חוזר בעוד יום, 3 ימים, שבוע, שבועיים. כרטיס שטעיתם בו חוזר מיד.</p>`;
    $("goCards").onclick = () => cards(due.concat(fresh.sort(() => Math.random() - .5)).slice(0, 15), pool);
  }
  function cards(list, pool, i = 0, ok = 0) {
    if (i >= list.length) { root().innerHTML = `<div class="stat est"><b>${ok}/${list.length}</b>ידעתי</div><button class="primary" id="back">חזרה</button>`; $("back").onclick = () => open("words"); return; }
    const w = list[i];
    root().innerHTML = `<small>${i + 1}/${list.length}</small><div class="card"><b>${esc(w)}</b><div id="ans" class="ans" hidden>${esc(pool.get(w))}</div></div>
      <div class="row"><button id="reveal" class="primary">הראה תרגום</button></div><div class="row" id="rate" hidden><button id="kn" class="primary">ידעתי</button><button id="dk">לא ידעתי</button></div>`;
    $("reveal").onclick = () => { $("ans").hidden = false; $("reveal").hidden = true; $("rate").hidden = false; };
    const rate = good => {
      const c = db.words[w] || { box: 0 };
      c.box = good ? Math.min(4, c.box + 1) : 0; c.due = Date.now() + BOX[c.box] * DAY; db.words[w] = c; save();
      cards(list, pool, i + 1, ok + (good ? 1 : 0));
    };
    $("kn").onclick = () => rate(true); $("dk").onclick = () => rate(false);
  }

  // איחוד נתונים מהענן עם המקומיים
  function merge(r) {
    if (!r) return;
    const seen = new Set(db.attempts.map(a => a.t));
    (r.attempts || []).forEach(a => { if (!seen.has(a.t)) db.attempts.push(a); });
    db.attempts.sort((a, b) => a.t - b.t); db.last = db.attempts.length - 1;
    Object.assign(db.mistakes, r.mistakes || {});
    Object.entries(r.words || {}).forEach(([w, c]) => { if (!db.words[w] || c.due > db.words[w].due) db.words[w] = c; });
    db.started = [...new Set(db.started.concat(r.started || []))];
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }
  return { merge, data: () => db, onFinish, setWriting, canStart, unlock, open, mistakesCount: () => Object.keys(db.mistakes).length };
})();
document.querySelectorAll("[data-study]").forEach(b => b.onclick = () => Study.open(b.dataset.study));
document.querySelectorAll("#studyTabs button").forEach(b => b.onclick = () => Study.open(b.dataset.tab));
$("studyHome").onclick = () => { $("study").hidden = true; $("home").hidden = false; };
