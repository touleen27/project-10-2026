const $ = id => document.getElementById(id);
const EXAMS = (window.EXAMS||[]).sort((a,b)=>a.id.localeCompare(b.id)), SC = window.SCORING;
let exam, flat, secIdx, cur, answers, flags, timeLeft, tick, writing = "", finishedSecs;

// ---------- בית ----------
function renderHome() {
  $("examList").innerHTML = "";
  EXAMS.forEach(e => {
    const mins = e.sections.reduce((a, s) => a + s.minutes, 0);
    const n = e.sections.reduce((a, s) => a + s.groups.reduce((b, g) => b + g.questions.length, 0), 0);
    const b = document.createElement("button");
    b.className = "start-btn";
    b.innerHTML = `${e.title}<small>${n} שאלות · ${mins} דק׳ + כתיבה</small>`;
    b.onclick = () => openPicker(e);
    $("examList").appendChild(b);
  });
}
const show = which => {
  $("home").hidden = which !== "home";
  $("exam").hidden = which !== "exam";
  $("result").hidden = which !== "result";
};

// ---------- בחירת חלקים ----------
function openPicker(e) {
  const items = e.sections.map((s, i) => ({ id: "s" + i, label: s.name + " · " + s.minutes + " דקות", grp: "mc" }));
  if (e.writing) items.push({ id: "w", label: "הבעה בכתב · " + e.writing.minutes + " דקות", grp: "w" });
  $("pickTitle").textContent = e.title;
  $("pickList").innerHTML = items.map(it => `<label class="pk"><input type="checkbox" data-id="${it.id}" data-grp="${it.grp}" checked> ${it.label}</label>`).join("");
  const setAll = fn => document.querySelectorAll("#pickList input").forEach(c => c.checked = fn(c.dataset.grp));
  $("pickFull").onclick = () => setAll(() => true);
  $("pickMc").onclick = () => setAll(g => g === "mc");
  $("pickW").onclick = () => setAll(g => g === "w");
  $("pickCancel").onclick = () => { $("pickBox").hidden = true; };
  $("pickGo").onclick = () => {
    const on = id => { const c = document.querySelector(`#pickList input[data-id="${id}"]`); return c && c.checked; };
    const secs = e.sections.map((s, i) => on("s" + i) ? i : -1).filter(i => i >= 0);
    const w = !!e.writing && on("w");
    if (!secs.length && !w) return;
    $("pickBox").hidden = true;
    startExam(e, secs, w);
  };
  $("pickBox").hidden = false;
}

// ---------- התחלה ----------
function startExam(full, secIdxs, withWriting) {
  const e = Object.assign({}, full, {
    sections: (secIdxs || full.sections.map((_, i) => i)).map(i => full.sections[i]),
    writing: (withWriting === undefined ? true : withWriting) ? full.writing : null,
    fullMc: !secIdxs || secIdxs.length === full.sections.length
  });
  exam = e; answers = {}; flags = {}; writing = ""; finishedSecs = [];
  // flat[secIdx] = [{g, qi, num, q}] ; מספור רציף בכל פרק
  flat = e.sections.map(sec => {
    let n = 0, arr = [];
    sec.groups.forEach((g, gi) => g.questions.forEach((q, qi) => arr.push({ gi, g, q, num: ++n })));
    return arr;
  });
  show("exam");
  enterSection(0);
}

function sectionCount() { return exam.sections.length + (exam.writing ? 1 : 0); }
function isWriting() { return secIdx >= exam.sections.length; }

function enterSection(i) {
  secIdx = i; cur = 0;
  clearInterval(tick);
  const w = isWriting();
  timeLeft = (w ? exam.writing.minutes : exam.sections[i].minutes) * 60;
  const endAt = Date.now() + timeLeft * 1000;
  tick = setInterval(() => {
    timeLeft = Math.ceil((endAt - Date.now()) / 1000);
    drawTimer();
    if (timeLeft <= 0) { clearInterval(tick); nextSection(true); }
  }, 250);
  $("navbar").hidden = w; $("stage").hidden = w; $("writing").hidden = !w;
  if (w) { $("writingPrompt").textContent = exam.writing.prompt; $("writingText").value = writing; }
  $("nextSectionLabel").textContent = secIdx === sectionCount() - 1 ? "סיום הבחינה" : "לפרק הבא";
  drawTabs(); drawTimer();
  if (!w) render();
}

function askConfirm(msg, onYes) {
  $("confirmText").textContent = msg;
  $("confirmBox").hidden = false;
  $("confirmYes").onclick = () => { $("confirmBox").hidden = true; onYes(); };
  $("confirmNo").onclick = () => { $("confirmBox").hidden = true; };
}

function nextSection(force) {
  if (!force) return askConfirm("לא תוכל לחזור לפרק הנוכחי. להמשיך?", () => nextSection(true));
  if (isWriting()) writing = $("writingText").value;
  if (secIdx >= sectionCount() - 1) return finishExam();
  enterSection(secIdx + 1);
}

// ---------- ציור ----------
function drawTabs() {
  const names = exam.sections.map(s => s.name).concat(exam.writing ? ["מטלת כתיבה"] : []);
  $("tabs").innerHTML = names.map((n, i) =>
    `<div class="tab ${i === secIdx ? "cur" : i < secIdx ? "done" : ""}">${n}</div>`).join("");
}
function drawTimer() {
  const t = Math.max(0, timeLeft);
  $("timeText").textContent = String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
  $("timer").classList.toggle("low", t <= 300);
}
const key = (s, i) => s + ":" + i;

function render() {
  const items = flat[secIdx], it = items[cur], g = it.g;
  // ניווט שאלות
  const groups = [];
  items.forEach((x, i) => { (groups[x.gi] = groups[x.gi] || []).push(i); });
  $("qnav").innerHTML = "";
  groups.forEach((idxs, gi) => {
    const box = document.createElement("div");
    box.className = "ngroup" + (gi === it.gi ? " cur" : "");
    box.innerHTML = `<div class="glabel">${gi === it.gi ? (g.label || "") : ""}</div><div class="circles"></div>`;
    idxs.forEach(i => {
      const b = document.createElement("button");
      const k = key(secIdx, i);
      b.className = "qn" + (answers[k] !== undefined ? " ans" : "") + (i === cur ? " cur" : "") + (flags[k] ? " flagged" : "");
      b.textContent = items[i].num;
      b.onclick = () => { cur = i; render(); };
      box.querySelector(".circles").appendChild(b);
    });
    $("qnav").appendChild(box);
  });
  // שאלה
  const split = !!g.passage;
  $("stage").classList.toggle("split", split);
  $("splitRight").hidden = !split;
  if (split) $("passage").innerHTML = g.passage.split(/\n\n+/).map(p => `<p>${esc(p).replace(/⟦(\d+)⟧/g, '<span class="ln">$1</span>')}</p>`).join("");
  $("qTitle").textContent = "שאלה " + it.num;
  $("qText").textContent = it.q.q;
  $("opts").innerHTML = "";
  const k = key(secIdx, cur);
  it.q.options.forEach((o, i) => {
    const b = document.createElement("button");
    b.className = "opt" + (answers[k] === i ? " sel" : "");
    b.innerHTML = `<span class="radio"><i></i></span><span class="otxt">${esc(o)}</span>`;
    b.onclick = () => { answers[k] = i; render(); };
    $("opts").appendChild(b);
  });
  $("flagBtn").classList.toggle("on", !!flags[k]);
  $("nextArrow").disabled = cur === items.length - 1;
  $("prevArrow").disabled = cur === 0;
}
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// ---------- תוצאות ----------
// ציון כולל מתוך 150: שליש הבעה בכתב (50) + שני שליש שאלות רב-ברירה (100)
function finishExam() {
  clearInterval(tick);
  let right = 0, total = 0;
  exam.sections.forEach((s, si) => flat[si].forEach((x, i) => { total++; if (answers[key(si, i)] === x.q.correct) right++; }));
  const hasMc = total > 0, hasW = !!exam.writing;
  const mc = hasMc ? Math.round(right / total * SC.mcMax * 10) / 10 : 0;
  const both = hasMc && hasW && exam.fullMc;
  const totalLabel = both ? `ציון כולל משוער (מתוך ${SC.total})`
    : hasW && !hasMc ? `הבעה בכתב (מתוך ${SC.writingMax})`
    : exam.fullMc ? `חלק הסגורות (מתוך ${SC.mcMax})` : `ציון משוער לפי הפרקים שנבחרו (מתוך ${SC.mcMax})`;
  $("summary").innerHTML =
    `<div class="stat est"><b id="totalScore"></b>${totalLabel}</div>` +
    (hasMc ? `<div class="stat"><b>${mc}/${SC.mcMax}</b>שאלות סגורות · ${right}/${total} נכונות</div>` : "") +
    (hasW ? `<div class="stat"><b><input id="wScore" type="number" min="0" max="${SC.writingMax}" step="1" placeholder="—"> /${SC.writingMax}</b>הבעה בכתב (הערכה עצמית)</div>` : "");
  const upd = () => {
    const w = hasW ? parseFloat($("wScore").value) : 0;
    const wc = Math.min(SC.writingMax, Math.max(0, w || 0));
    if (!both) { $("totalScore").textContent = hasMc ? "≈ " + Math.round(mc) : (isNaN(w) ? "—" : String(wc)); return; }
    $("totalScore").textContent = isNaN(w) ? "≈ " + Math.round(mc) + " + ?" : "≈ " + Math.round(mc + wc);
  };
  if (hasW) $("wScore").oninput = upd;
  upd();
  show("result"); drawReview("all");
  document.querySelectorAll(".filters button").forEach(b => b.classList.toggle("on", b.dataset.f === "all"));
}

function drawReview(f) {
  $("review").innerHTML = "";
  exam.sections.forEach((s, si) => flat[si].forEach((x, i) => {
    const a = answers[key(si, i)], blank = a === undefined, ok = a === x.q.correct;
    if (f === "wrong" && (ok || blank)) return;
    if (f === "blank" && !blank) return;
    const d = document.createElement("div");
    d.className = "rev " + (blank ? "blank" : ok ? "ok" : "no");
    d.innerHTML = `<b>${s.name} · שאלה ${x.num}${x.g.label ? " (" + x.g.label + ")" : ""}</b><p>${esc(x.q.q)}</p>` +
      x.q.options.map((o, oi) => `<div class="ro ${oi === x.q.correct ? "right" : oi === a ? "mine" : ""}">${oi === x.q.correct ? "✔" : oi === a ? "✘" : "•"} ${esc(o)}</div>`).join("") +
      (blank ? "<small>לא נענתה</small>" : "") + (x.q.explain ? `<br><small>${esc(x.q.explain)}</small>` : "");
    $("review").appendChild(d);
  }));
  if (!$("review").children.length) $("review").innerHTML = "<p>אין שאלות להצגה.</p>";
}

// ---------- אירועים ----------
$("nextSectionBtn").onclick = () => nextSection(false);
$("nextArrow").onclick = () => { if (cur < flat[secIdx].length - 1) { cur++; render(); } };
$("prevArrow").onclick = () => { if (cur > 0) { cur--; render(); } };
$("flagBtn").onclick = () => { const k = key(secIdx, cur); flags[k] = !flags[k]; render(); };
document.addEventListener("click", e => {
  if (e.target.matches("[data-instr]")) {
    $("instrText").textContent = flat[secIdx][cur].g.instructions || "בחרו את התשובה המתאימה ביותר.";
    $("instrDlg").showModal();
  }
});
document.querySelectorAll(".filters button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".filters button").forEach(x => x.classList.toggle("on", x === b));
  drawReview(b.dataset.f);
});
$("homeBtn").onclick = () => show("home");
document.addEventListener("keydown", e => {
  if ($("exam").hidden || isWriting()) return;
  if (e.key === "ArrowLeft") $("nextArrow").click();
  if (e.key === "ArrowRight") $("prevArrow").click();
});

renderHome(); show("home");
