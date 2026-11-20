// Finds the poems (Story steps with audio) in every Dhammaschool class and writes a list for the teacher to confirm.
// node scripts/dhammaschool-poems-scan.mjs  ->  poems-scan.json (path given by --out)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import { firebaseConfig } from '../src/firebaseConfig.js';
const out = (process.argv.find(a => a.startsWith('--out=')) || '--out=poems-scan.json').slice(6);
const app = initializeApp(firebaseConfig);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
const DS = 'artifacts/dhammaschool-app/public/data';
const lessons = (await getDocs(collection(db, `${DS}/lessons`))).docs.map(d => ({ id: d.id, ...d.data() }));
const res = [];
for (const l of lessons) {
  const c = await getDoc(doc(db, `${DS}/lessons/${l.id}/content/data`));
  const steps = (c.exists() ? c.data().steps : l.steps) || [];
  steps.forEach((s, i) => {
    if (s.type === 'narrative' && s.audioUrl) res.push({ classId: l.classId || 'GENERAL', lessonId: l.id, lesson: l.name, order: l.order ?? l.createdAt?.toMillis?.() ?? 0, isPublic: !!l.isPublic, stepIndex: i, title: s.title, audioUrl: s.audioUrl, text: String(s.content || ''), createdAt: String(l.createdAt || '') });
  });
}
writeFileSync(out, JSON.stringify({ lessons: lessons.length, poems: res }, null, 1));
console.log('lessons', lessons.length, 'poem steps', res.length);
process.exit(0);
