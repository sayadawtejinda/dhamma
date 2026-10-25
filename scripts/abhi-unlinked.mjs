// Lists the Abhidhamma roster students that are NOT yet on a Tutoring ID, with the Tutoring student they most likely are.
//   node scripts/abhi-unlinked.mjs            (list only)
//   node scripts/abhi-unlinked.mjs --link     (links the SURE ones: the old id is one of the Tutoring student's authorizedUids, or the name is exactly the same)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
const LINK = process.argv.includes('--link');
const A = 'lesson-translator-app-v6';
const db = getFirestore(initializeApp(firebaseConfig));
await signInAnonymously(getAuth(db.app));
const P = (p) => `artifacts/${A}/public/data/${p}`;
const students = (await getDocs(collection(db, `artifacts/${appId}/public/data/students`))).docs.map(d => ({ id: d.id, ...d.data() }));
const byId = new Map(students.map(s => [s.id, s]));
const byAuth = new Map(); students.forEach(s => (s.authorizedUids || []).forEach(u => byAuth.set(u, s)));
const byName = new Map(); students.forEach(s => { const k = (s.name || '').trim().toLowerCase(); if (k) (byName.get(k) || byName.set(k, []).get(k)).push(s); });
const roster = (await getDocs(collection(db, P('classRoster')))).docs.map(d => ({ ref: d.ref, id: d.id, ...d.data() })).filter(r => !r.migratedTo);
const scores = (await getDocs(collection(db, P('global_scores')))).docs.map(d => d.data());
const doneBy = {}; scores.forEach(s => { if (s.userId && s.lessonId) (doneBy[s.userId] = doneBy[s.userId] || new Set()).add(s.classId + '|' + s.lessonId); });
const seen = new Set(), rows = [];
for (const r of roster) {
  const uid = r.userId || r.id.split('_').slice(1).join('_');
  if (byId.has(uid)) continue;                                             // already on a Tutoring ID
  if (seen.has(uid)) continue; seen.add(uid);
  let name = (r.studentName || r.name || '').trim();
  if (!name) { try { name = decodeURIComponent(uid); } catch (e) { name = uid; } }       // an old name-keyed row: the id IS the name
  const low = name.toLowerCase();
  let match = null, how = '';
  // SURE = the name is the same as the Tutoring student's. The old id on the Tutoring record alone is NOT enough (the teacher's test account has many
  // old ids from other children's devices), so with a different name it is only 'maybe'.
  const sameName = (byName.get(low) || []);
  if (sameName.length === 1) { match = sameName[0]; how = byAuth.get(uid) === match ? 'SURE: same name + old id' : 'SURE: same name'; }
  else if (byAuth.has(uid)) { match = byAuth.get(uid); how = 'maybe: old id is on that Tutoring record, but the name is different'; }
  else { const c = students.filter(s => s.name && low && (s.name.toLowerCase().includes(low) || low.includes(s.name.toLowerCase()))); if (c.length === 1) { match = c[0]; how = 'maybe: similar name'; } }
  rows.push({ docs: roster.filter(x => (x.userId || x.id.split('_').slice(1).join('_')) === uid), uid, name, classes: roster.filter(x => (x.userId || x.id.split('_').slice(1).join('_')) === uid).map(x => x.classId).join(','), done: (doneBy[uid] || new Set()).size, match, how });
}
rows.sort((a, b) => (b.match ? 1 : 0) - (a.match ? 1 : 0) || b.done - a.done);
rows.forEach(r => console.log(`${(r.match ? '→ ' + r.match.name : '(no match)').padEnd(28)} | ${r.name.padEnd(24)} | lessons ${String(r.done).padStart(3)} | ${r.how || ''} | ${r.classes} | ${r.uid}`));
console.log(`${rows.length} roster student(s) not on a Tutoring ID; ${rows.filter(r => r.how.startsWith('SURE')).length} sure, ${rows.filter(r => r.how.startsWith('maybe')).length} maybe, ${rows.filter(r => !r.match).length} no match`);
if (LINK) {
  for (const r of rows.filter(x => x.how.startsWith('SURE'))) {
    const ts = r.match; const oldUid = r.uid;
    const sc = await getDocs(query(collection(db, `artifacts/${A}/public/data/global_scores`), where('userId', '==', oldUid)));
    const mine = await getDocs(query(collection(db, `artifacts/${A}/public/data/global_scores`), where('userId', '==', ts.id)));
    const have = new Set(mine.docs.map(d => `${d.data().classId}|${d.data().lessonId}`));
    let batch = writeBatch(db), n = 0;
    for (const d of sc.docs) { const k = `${d.data().classId}|${d.data().lessonId}`; if (have.has(k)) continue; have.add(k); batch.update(d.ref, { userId: ts.id, studentName: ts.name, name: ts.name }); if (++n >= 400) { await batch.commit(); batch = writeBatch(db); n = 0; } }
    if (n) await batch.commit();
    // every roster row of this student (found by the id inside the row's key too: the old name-keyed rows have no userId field)
    for (const rd of r.docs) {
      const dt = rd; const nr = doc(db, P(`classRoster/${dt.classId}_${ts.id}`));
      const ex = await getDoc(nr);
      if (!ex.exists()) await setDoc(nr, { ...Object.fromEntries(Object.entries(dt).filter(([k]) => k !== 'ref' && k !== 'id' && k !== 'docs')), userId: ts.id, studentName: ts.name, name: ts.name, tutoringStudentUid: ts.id, linkedToTutoring: true });
      else await updateDoc(nr, { tutoringStudentUid: ts.id, linkedToTutoring: true });
      if (rd.ref.path !== nr.path) await deleteDoc(rd.ref);
    }
    console.log(`linked ${r.name} -> ${ts.name}`);
  }
}
process.exit(0);
