// Run every hour (close-open-sessions.yml). Decides, from ONE tiny Firestore document (config/classMeta), whether a
// SmartStudy / Abhidhamma class needs its static file (re)built:
//   - a class that exists but has no file yet (a class the teacher just created), or
//   - a class whose lessons were edited after its file was built (config/classMeta versions > the file's builtAt).
// When so, it writes needed=true to $GITHUB_OUTPUT and the next steps rebuild the class files and push them.
// Otherwise it reads nothing more (one document) and changes nothing.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'public', 'classSnapshots');
const app = initializeApp(firebaseConfig);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
const snap = await getDoc(doc(db, `artifacts/${appId}/public/data/config/classMeta`));
const meta = snap.exists() ? snap.data() : {};
const versions = meta.versions || {};

const builtAtOf = (sub, id) => {
  const f = join(DIR, sub, `${encodeURIComponent(id)}.json`);
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, 'utf8')).builtAt || 0; } catch (e) { return 0; }
};

const reasons = [];
// SmartStudy classes: every class the teacher's screens registered, plus every class whose lessons were edited
const ssIds = new Set([...Object.keys(meta.autoApprove || {}), ...Object.keys(versions).filter(k => k.startsWith('ss:')).map(k => k.slice(3))]);
for (const id of ssIds) {
  const built = builtAtOf('smartstudy-class', id);
  if (built === null) reasons.push(`SmartStudy ${id}: no file yet`);
  else if ((versions[`ss:${id}`] || 0) > built) reasons.push(`SmartStudy ${id}: lessons edited after the file was built`);
}
// Abhidhamma classes only get a file once built; a later edit makes the old one stale
for (const [k, v] of Object.entries(versions)) {
  if (!k.startsWith('abhi:')) continue;
  const id = k.slice(5);
  const built = builtAtOf('abhidhamma-class', id);
  if (built === null || v > built) reasons.push(`Abhidhamma ${id}: ${built === null ? 'no file yet' : 'lessons edited after the file was built'}`);
}

console.log(reasons.length ? `Class files to rebuild:\n  ${reasons.join('\n  ')}` : 'All class files are up to date.');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `needed=${reasons.length > 0}\n`);
process.exit(0);
