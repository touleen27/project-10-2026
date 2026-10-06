const { title, minutes, questions } = window.EXAM;
const $ = id => document.getElementById(id);
let cur = 0, answers = [], timeLeft = 0, tick;

const show = id => ["start", "exam", "result"].forEach(s => $(s).hidden = s !== id);
const fmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

$("examTitle").textContent = title;
$("examInfo").textContent = `${questions.length} שאלות • ${minutes} דקות`;

function start() {
  cur = 0; answers = new Array(questions.length).fill(null);
  timeLeft = minutes * 60;
  $("timer").hidden = false; $("timer").textContent = fmt(timeLeft);
  clearInterval(tick);
  tick = setInterval(() => {
    $("timer").textContent = fmt(--timeLeft);
    if (timeLeft <= 0) finish();
  }, 1000);
  show("exam"); render();
}

function render() {
  const q = questions[cur];
  $("counter").textContent = `שאלה ${cur + 1} מתוך ${questions.length}`;
  $("bar").style.width = ((cur + 1) / questions.length * 100) + "%";
  $("question").textContent = q.q;
  $("options").innerHTML = "";
  q.options.forEach((o, i) => {
    const b = document.createElement("button");
    b.className = "opt" + (answers[cur] === i ? " sel" : "");
    b.textContent = o;
    b.onclick = () => { answers[cur] = i; render(); };
    $("options").appendChild(b);
  });
  $("prevBtn").disabled = cur === 0;
  $("nextBtn").disabled = cur === questions.length - 1;
}

function finish() {
  clearInterval(tick);
  $("timer").hidden = true;
  const right = questions.filter((q, i) => answers[i] === q.correct).length;
  $("score").textContent = `ציון: ${Math.round(right / questions.length * 100)} (${right}/${questions.length})`;
  $("review").innerHTML = "";
  questions.forEach((q, i) => {
    const ok = answers[i] === q.correct;
    const d = document.createElement("div");
    d.className = "rev " + (ok ? "ok" : "no");
    const mine = answers[i] === null ? "לא נענתה" : q.options[answers[i]];
    d.innerHTML = `<b>${i + 1}. ${q.q}</b><br>התשובה שלך: ${mine}<br>התשובה הנכונה: ${q.options[q.correct]}<br><small>${q.explain || ""}</small>`;
    $("review").appendChild(d);
  });
  show("result");
}

$("startBtn").onclick = start;
$("prevBtn").onclick = () => { cur--; render(); };
$("nextBtn").onclick = () => { cur++; render(); };
$("finishBtn").onclick = () => { if (confirm("לסיים את המבחן?")) finish(); };
$("restartBtn").onclick = () => show("start");
