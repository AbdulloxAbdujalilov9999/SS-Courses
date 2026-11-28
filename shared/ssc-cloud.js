/* SS-Courses accounts and cloud sync (optional: the site works fully without signing in).
 *
 * Same Firebase project and the same /users accounts and roles as SpeakUp and SpeakUp-1
 * (shared/firebase-config.js is a copy). SS-Courses keeps its own data under /ssc:
 *   ssc/progress/{uid}/{course}   the student's progress in one course (the SS.state object from ssc-core.js) + name, email
 *   ssc/grades/{uid}/{course}     marks only staff give: {proj: {p: 0-100}, prac: {k: 0-40}, task: {n: 0-10}, note}
 * {course} is the course id from courses.js ("office", "adobe"), since lesson numbers restart in every course.
 * Access rules: firebase/ssc-rules.json (merge into SpeakUp's database.rules.json, "ssc" node).
 *
 * Exposes SS.cloud: {available, user, profile, isStaff, myGrades, google(), email(), reset(), signOut(),
 *   watchStudents(cb), watchAllGrades(cb), setGrade(uid, path, value)}
 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { firebaseConfig, OWNER_EMAIL } from "./firebase-config.js";

const SS = window.SS, L = SS.L;
const STAFF = ["owner", "manager", "teacher"];
const CID = SS.course.id;
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let pendingName = "", unsubs = [];
const cloud = SS.cloud = {
  available: true, user: null, profile: null, myGrades: null, err: "", syncMsg: "",
  get isStaff(){ const p = this.profile; return !!p && p.status === "approved" && STAFF.includes(p.role); },
  get isManager(){ const p = this.profile; return !!p && p.status === "approved" && (p.role === "owner" || p.role === "manager"); },
  errText(e){
    const c = e && e.code;
    return ({
      "auth/invalid-credential": L("Email yoki parol notoʻgʻri.", "Wrong email or password."),
      "auth/wrong-password": L("Email yoki parol notoʻgʻri.", "Wrong email or password."),
      "auth/user-not-found": L("Bunday hisob yoʻq. Roʻyxatdan oʻting.", "No account with that email. Sign up instead."),
      "auth/email-already-in-use": L("Bu email band. Kirish tugmasini bosing.", "That email already has an account. Sign in instead."),
      "auth/weak-password": L("Parol kamida 6 belgidan iborat boʻlsin.", "Password must be at least 6 characters."),
      "auth/invalid-email": L("Email notoʻgʻri.", "That email address is not valid."),
      "auth/popup-closed-by-user": L("Kirish bekor qilindi.", "Sign-in was cancelled."),
      "auth/unauthorized-domain": L("Google orqali kirish bu saytda hali yoqilmagan. Email va parol bilan kiring.", "Google sign-in isn't enabled for this site yet. Use email and password."),
      "PERMISSION_DENIED": L("Maʼlumotlar bazasi ruxsat bermadi (ssc qoidalari hali qoʻshilmagan boʻlishi mumkin).", "The database refused access (the ssc rules may not be added yet)."),
    })[c] || (e && e.message) || String(e);
  },
  async run(fn){ this.err = ""; try { await fn(); } catch (e) { this.err = this.errText(e); } SS.refreshAcct && SS.refreshAcct(); },
  google(){ return this.run(() => signInWithPopup(auth, new GoogleAuthProvider())); },
  email(email, pass, name){
    return this.run(async () => {
      if (name != null){ pendingName = name; const c = await createUserWithEmailAndPassword(auth, email, pass); await updateProfile(c.user, { displayName: name }).catch(() => {}); }
      else await signInWithEmailAndPassword(auth, email, pass);
    });
  },
  reset(email){ return sendPasswordResetEmail(auth, email); },
  signOut(){ return signOut(auth); },

  /* ---- staff: students and marks ---- */
  // owner/manager see every ssc/progress record; a teacher sees the students in teacherStudents/{uid}
  watchStudents(cb){
    const offs = [];
    if (this.isManager){
      offs.push(onValue(ref(db, "ssc/progress"), s => { const all = s.val() || {}, o = {}; Object.keys(all).forEach(u => { if (all[u] && all[u][CID]) o[u] = all[u][CID]; }); cb(norm(o)); }, e => cb({}, e)));
    } else {
      const data = {}; let inner = [];
      offs.push(onValue(ref(db, "teacherStudents/" + this.user.uid), s => {
        inner.forEach(f => f()); inner = [];
        Object.keys(s.val() || {}).forEach(uid => inner.push(onValue(ref(db, "ssc/progress/" + uid + "/" + CID), x => { if (x.exists()) data[uid] = x.val(); else delete data[uid]; cb(norm(data)); }, () => {})));
        if (!inner.length) cb({});
      }, e => cb({}, e)));
      offs.push(() => inner.forEach(f => f()));
    }
    return () => offs.forEach(f => f());
    function norm(all){ const o = {}; Object.keys(all).forEach(uid => { o[uid] = Object.assign(SS.normState(all[uid]), { name: all[uid].name || "", email: all[uid].email || "" }); }); return o; }
  },
  watchGrades(uid, cb){ return onValue(ref(db, "ssc/grades/" + uid + "/" + CID), s => cb(s.val() || {}), () => cb({})); },
  watchAllGrades(cb){
    if (this.isManager) return onValue(ref(db, "ssc/grades"), s => { const all = s.val() || {}, o = {}; Object.keys(all).forEach(u => { if (all[u] && all[u][CID]) o[u] = all[u][CID]; }); cb(o); }, () => cb({}));
    // teachers: one listener per student is set up by the dashboard through watchGrades
    cb({}); return () => {};
  },
  setGrade(uid, path, value){ return set(ref(db, `ssc/grades/${uid}/${CID}/${path}`), value === "" || value == null ? null : Number(value)); },
};

/* the shared /users profile, created the same way SpeakUp does (the rules require this exact shape) */
async function ensureProfile(user){
  const snap = await get(ref(db, "users/" + user.uid));
  if (snap.exists()) return snap.val();
  const email = user.email || "", isOwner = email === OWNER_EMAIL;
  const profile = {
    name: pendingName || user.displayName || email.split("@")[0], email, photoURL: user.photoURL || null,
    provider: (user.providerData[0] && user.providerData[0].providerId) || "password",
    status: isOwner ? "approved" : "pending", role: isOwner ? "owner" : "student",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastActive: serverTimestamp(),
  };
  await set(ref(db, "users/" + user.uid), profile);
  return (await get(ref(db, "users/" + user.uid))).val();
}

onAuthStateChanged(auth, async user => {
  unsubs.forEach(f => f()); unsubs = [];
  cloud.user = user; cloud.profile = null; cloud.myGrades = null; SS.onChange = null;
  if (!user){ cloud.syncMsg = ""; SS.route(); return; }
  try {
    cloud.profile = await ensureProfile(user);
    unsubs.push(onValue(ref(db, "users/" + user.uid), s => { const was = cloud.isStaff; cloud.profile = s.val(); if (cloud.isStaff !== was) SS.route(); else SS.updateTopbar(); }));
  } catch (e) { console.warn("profile", e); }
  const myRef = ref(db, "ssc/progress/" + user.uid + "/" + CID);
  try {
    const remote = (await get(myRef)).val();
    const merged = remote ? SS.mergeState(SS.state, remote) : SS.state;
    SS.replaceState(merged);
    await set(myRef, Object.assign({}, clean(SS.state), who()));
    cloud.syncMsg = "☁ " + L("Natijalar hisobingizga sinxronlandi.", "Progress synced to your account.");
    SS.onChange = paths => update(myRef, Object.assign(clean(paths), who())).then(() => { cloud.syncMsg = "☁ " + L("Saqlandi", "Saved") + " " + new Date().toLocaleTimeString(); }).catch(e => { cloud.syncMsg = "⚠ " + cloud.errText(e); });
  } catch (e) {
    cloud.syncMsg = "⚠ " + cloud.errText(e) + " " + L("Natijalar shu qurilmada saqlanmoqda.", "Progress is being saved on this device.");
    console.warn("sync", e);
  }
  unsubs.push(cloud.watchGrades(user.uid, g => { cloud.myGrades = g; }));
  SS.route();
});
const who = () => ({ name: (cloud.profile && cloud.profile.name) || (cloud.user && cloud.user.displayName) || "", email: (cloud.user && cloud.user.email) || "", lastSeen: Date.now() });
// Firebase rejects undefined values and empty keys
function clean(o){ return JSON.parse(JSON.stringify(o, (k, v) => (v === undefined ? null : v))); }

SS.route && SS.route();
