// Refreshes only the class leaderboards (see class-snapshots.mjs).
//   npm run snapshot:classes            only what is new since the last run
//   npm run snapshot:classes -- --full  rebuild everything from Firestore
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
import { refreshClassSnapshots } from './class-snapshots.mjs';
import { refreshContentSnapshots, refreshAnnouncementsSnapshot } from './content-snapshots.mjs';

const app = initializeApp(firebaseConfig);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
await refreshClassSnapshots(db, appId, { full: process.argv.includes('--full') });
await refreshContentSnapshots(db);
await refreshAnnouncementsSnapshot(db, appId);
process.exit(0);
