// One-off / on demand: writes public/studentNames.json (the weekly job does this too). Reads the students collection once.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
const db = getFirestore(initializeApp(firebaseConfig));
await signInAnonymously(getAuth(db.app));
const students = (await getDocs(collection(db, `artifacts/${appId}/public/data/students`))).docs.map(d => ({ id: d.id, ...d.data() }));
const list = students.filter(s => s.name && (s.isActive === true || s.isActive === 'pending')).map(s => ({ id: s.id, name: s.name, displayId: s.displayId || null, isActive: s.isActive }));
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'studentNames.json'), JSON.stringify({ generatedAt: new Date().toISOString(), students: list }));
console.log('students written:', list.length);
process.exit(0);
