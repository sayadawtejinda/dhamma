// Gives the badges students have earned, automatically, when the teacher has switched "Auto-give" ON in the Teacher Dashboard
// (Badges to give). Run by the weekly job right after scripts/compute-badges.mjs.
//
//   node scripts/auto-give-badges.mjs          (gives)
//   node scripts/auto-give-badges.mjs --dry    (only says what it would give)
//
// Cost: 1 read for the switch; when it is OFF nothing else is read. When ON: one read of the students + one write per student who
// has something new. A student's ladder (e.g. Trophy Rookie -> Trophy Hunter) is given together, lowest first, and the student's Home
// page plays the celebration one by one when they next open it. The top-three honours are NOT given automatically (the teacher
// gives those during class).
process.env.TZ = process.env.TZ || 'America/Los_Angeles';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
import { ladderOf, ladderRank } from '../src/badgeDefs.js';

const DRY = process.argv.includes('--dry');
const P = `artifacts/${appId}/public/data`;
const db = getFirestore(initializeApp(firebaseConfig));

async function main() {
  await signInAnonymously(getAuth(db.app));
  const sw = await getDoc(doc(db, `${P}/config/badgeAuto`));
  if (!(sw.exists() && sw.data().on === true)) { console.log('Auto-give is OFF: nothing to do.'); return; }
  const earned = (JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'badges.json'), 'utf8')).students) || {};
  const snap = await getDocs(collection(db, `${P}/students`));
  let students = 0, badges = 0;
  for (const d of snap.docs) {
    const s = d.data();
    if (s.isActive !== true || !s.name) continue;
    const given = s.badgesGiven || {};
    const pending = (earned[s.name] || []).filter(id => !given[id]);
    if (!pending.length) continue;
    pending.sort((a, b) => (ladderOf(a) < ladderOf(b) ? -1 : ladderOf(a) > ladderOf(b) ? 1 : ladderRank(a) - ladderRank(b)));
    students += 1; badges += pending.length;
    console.log(`${s.name}: ${pending.join(', ')}`);
    if (DRY) continue;
    const upd = { badgesNew: arrayUnion(...pending.map(id => `b:${id}`)) };
    const now = Date.now();
    pending.forEach(id => { upd[`badgesGiven.${id}`] = now; });
    await updateDoc(d.ref, upd);
  }
  console.log(`${DRY ? '(dry run) would give' : 'Gave'} ${badges} badge(s) to ${students} student(s).`);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
