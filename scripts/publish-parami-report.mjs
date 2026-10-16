// "Confirm" for the Parami report. The teacher edits the report in the app (which classes to leave out) and presses
// Confirm there, which writes config/paramiReport = { hidden: [...], requestedAt: ms } in Firestore. Every 15 minutes
// close-open-sessions.yml runs this: when a request is newer than the last publication it rebuilds the report files
// (scripts/parami-report.mjs) -- the workflow then commits them to GitHub, where students read them as plain files --
// and marks the request published. When there is nothing new it reads that one small document and stops.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { appendFileSync } from 'node:fs';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
import { refreshParamiReport } from './parami-report.mjs';

const app = initializeApp(firebaseConfig);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
const ref = doc(db, `artifacts/${appId}/public/data/config/paramiReport`);
const snap = await getDoc(ref);
const d = snap.exists() ? snap.data() : {};
if (!d.requestedAt || d.requestedAt <= (d.publishedAt || 0)) { console.log('Parami report: nothing to publish'); process.exit(0); }
await refreshParamiReport(db, appId);
// the workflow marks it published only after the files are pushed (see the "published" step)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `requestedAt=${d.requestedAt}\n`);
console.log('Parami report: files rebuilt');
process.exit(0);
