// The Parami report, rebuilt ON REQUEST (GitHub -> Actions -> "Parami report" -> Run workflow; about once a year).
// This is the only time Firebase is read for it: the new SmartStudy scores since the last run (class files), the Parami
// group and student list, and the teacher's choice of classes to leave out (config/paramiReport.hidden, saved from the
// app's report editor). Then the report files are rewritten; the workflow commits them to GitHub, where the students'
// page reads them as plain files.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
import { refreshClassSnapshots } from './class-snapshots.mjs';
import { refreshParamiReport } from './parami-report.mjs';

const app = initializeApp(firebaseConfig);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
await refreshClassSnapshots(db, appId, { full: false });
await refreshParamiReport(db, appId);
process.exit(0);
