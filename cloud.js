// ===== Firebase: התחברות, סנכרון התקדמות בין מכשירים, מנוי (premiumUntil), Analytics =====
// פועל רק כשיש FIREBASE_CONFIG וכשהאתר מתארח מחוץ ל-Artifact (שם הרשת חסומה).
window.Cloud = (() => {
  const cfg = window.FIREBASE_CONFIG;
  const V = "10.12.2", base = `https://www.gstatic.com/firebasejs/${V}/`;
  let fb, auth, fs, user = null, premiumUntil = null, timer, ready = false;
  const today = () => new Date().toISOString().slice(0, 10);
  const loadJs = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

  async function init() {
    if (!cfg || !cfg.projectId) return;
    try {
      for (const f of ["app", "auth", "firestore", ...(cfg.measurementId ? ["analytics"] : [])]) await loadJs(`${base}firebase-${f}-compat.js`);
      fb = window.firebase; fb.initializeApp(cfg); auth = fb.auth(); fs = fb.firestore();
      if (cfg.measurementId) try { fb.analytics(); } catch (e) {}
      ready = true;
      document.getElementById("accBtn").hidden = false;
      auth.onAuthStateChanged(onUser);
    } catch (e) { console.warn("Firebase לא נטען", e); }
  }
  async function onUser(u) {
    user = u; premiumUntil = null; paint();
    if (!u) return;
    try {
      const [d, p] = await Promise.all([fs.doc("userData/" + u.uid).get(), fs.doc("users/" + u.uid).get()]);
      if (p.exists) premiumUntil = p.data().premiumUntil || null;
      if (d.exists && window.Study) Study.merge(d.data().study);
      push(true);
    } catch (e) { console.warn(e); }
    paint();
  }
  function push(now) {
    if (!ready || !user || !window.Study) return;
    clearTimeout(timer);
    const go = () => fs.doc("userData/" + user.uid).set({ study: JSON.parse(JSON.stringify(Study.data())), updated: Date.now() }).catch(e => console.warn(e));
    now ? go() : (timer = setTimeout(go, 1500));
  }
  const log = (name, params) => { try { if (ready && cfg.measurementId) fb.analytics().logEvent(name, params || {}); } catch (e) {} };
  const isPremium = () => !!premiumUntil && premiumUntil >= today();

  // ---------- ממשק ----------
  const $ = id => document.getElementById(id);
  function paint() {
    const b = $("accBtn"); if (!b) return;
    b.textContent = user ? "👤 " + (user.email || "החשבון שלי") : "👤 התחברות";
    $("accIn").hidden = !!user; $("accOut").hidden = !user;
    if (user) $("accInfo").textContent = `${user.email} · ` + (isPremium() ? `מנוי פעיל עד ${premiumUntil}` : "ללא מנוי פעיל");
  }
  function wire() {
    $("accBtn").onclick = () => { $("accBox").hidden = false; $("accMsg").textContent = ""; paint(); };
    $("accClose").onclick = () => { $("accBox").hidden = true; };
    const err = e => { $("accMsg").textContent = e.message || String(e); };
    $("accGoogle").onclick = () => auth.signInWithPopup(new fb.auth.GoogleAuthProvider()).then(() => { $("accBox").hidden = true; }).catch(err);
    $("accLogin").onclick = () => auth.signInWithEmailAndPassword($("accEmail").value, $("accPass").value).then(() => { $("accBox").hidden = true; }).catch(err);
    $("accSignup").onclick = () => auth.createUserWithEmailAndPassword($("accEmail").value, $("accPass").value).then(() => { $("accBox").hidden = true; }).catch(err);
    $("accLogout").onclick = () => auth.signOut().then(() => { $("accBox").hidden = true; });
  }
  document.addEventListener("DOMContentLoaded", () => { if ($("accBtn")) { wire(); init(); } });
  return { push, log, isPremium, enabled: () => ready, user: () => user };
})();
